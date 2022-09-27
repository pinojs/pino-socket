'use strict'

const net = require('net')
const tls = require('tls')
const stream = require('stream')
const parentPort = require('worker_threads').parentPort
const { Backoff, FibonacciStrategy, ExponentialStrategy } = require('backoff')
const Queue = require('./Queue')

/**
 * @typedef {object} TcpConnectionOptions
 * @prop {boolean} [secure] Enable secure (TLS) connection. Default: false.
 * @prop {boolean} [noverify] Allow connection to server with self-signed certificates. Default: false.
 * @prop {string} [address] The host address to connect to. Default: `127.0.0.1`.
 * @prop {number} [port] The host port to connect to. Default: `514`.
 * @prop {boolean} [reconnect] Enable reconnecting to dropped TCP destinations. Default: false.
 * @prop {number} [reconnectTries] Number of times to attempt reconnection before giving up. Default: `Infinity`
 * @prop {string?} [unixsocket] The unix socket path for the destination. Default: ``.
 * @prop {BackoffStrategy?} [backoffStrategy] The backoff strategy to use. The backoff strategy must implement the `BackoffStrategy` interface. Alternatively, you can configure the backoff strategy using primitive data. Default: `new FibonacciStrategy()`.
 * @prop {string} [backoffStrategy.name] The backoff strategy name, either `exponential` or `fibonacci`. Default: `fibonacci`.
 * @prop {number} [backoffStrategy.randomisationFactor] The backoff randomisation factor, must be between 0 and 1. Default: `0`.
 * @prop {number} [backoffStrategy.initialDelay] The backoff initial delay in milliseconds. Default: `100`.
 * @prop {number} [backoffStrategy.maxDelay] The backoff maximum delay in milliseconds. Default: `10000`.
 * @prop {number} [backoffStrategy.factor] The exponential backoff factor, must be greater than 1. Default: `2`.
 * @prop {stream.Readable?} [sourceStream]
 * @prop {boolean} [recovery] Enable a recovery mode when the TCP connection is lost which store data in a memory queue (FIFO) until the queue max size is reached or the TCP connection is restored. Default: `false`.
 * @prop {({data: Buffer, encoding: string}) => number?} [recoveryQueueSizeCalculation] Function used to calculate the size of stored items. Default: `item => item.data.length + item.encoding.length`.
 * @prop {number?} [recoveryQueueMaxSize] The maximum size of items added to the queue. When reached, oldest items "First In" will be evicted to stay below this size. Default: `1024`.
 * @prop {(data: Buffer) => Buffer?} [onBeforeDataWrite] Function to manipulate the data before it written. Operations preformed here must be synchronous.
 */

/**
 * Returns a writable stream that forwards messages to a remote server via a TCP connection.
 *
 * @param {TcpConnectionOptions} userOptions
 * @returns {stream.Writable}
 */
module.exports = function factory (userOptions) {
  /** @type {TcpConnectionOptions} */
  const options = Object.assign(
    {
      secure: false,
      noverify: false,
      address: '127.0.0.1',
      port: 514,
      reconnect: false,
      reconnectTries: Infinity,
      recovery: false,
      recoveryQueueMaxSize: 1024,
      recoveryQueueSizeCalculation: (item) => item.data.length + item.encoding.length,
      onBeforeDataWrite: null
    },
    userOptions
  )

  let canPropagateEvents = false
  if (parentPort && '$context' in options && 'threadStreamVersion' in options.$context) {
    const [major, minor] = options.$context.threadStreamVersion.split('.')
    if (parseInt(major) > 2) {
      canPropagateEvents = true
    } else if (parseInt(major, 10) === 2 && parseInt(minor, 10) >= 2) {
      canPropagateEvents = true
    }
  }

  const sourceStream = Object.prototype.hasOwnProperty.call(options, 'sourceStream')
    ? options.sourceStream
    : buildStdinSourceStream()

  /** @type {net.Socket} */
  let socket = null
  let connected = false
  let connecting = false
  let socketError = null
  const recoveryQueue = new Queue({
    maxSize: options.recoveryQueueMaxSize,
    sizeCalculation: options.recoveryQueueSizeCalculation
  })

  const retryBackoff = createRetryBackoff()

  function handleSocketWriteError (err, data, encoding) {
    emitEvent('socketError', new Error(`unable to write data to the TCP socket: ${err.message}`))
    if (options.recovery) {
      // unable to write data, will try later when the server becomes available again
      recoveryQueue.enqueue({ data, encoding })
    }
  }

  // this stream is the one returned to psock.js.
  const outputStream = stream.Writable({
    autoDestroy: true,
    destroy (err, callback) {
      callback(err)
      socket.destroy(err)
    },
    write (data, encoding, callback) {
      // node 14 throws an Error if the socket has ended (instead of calling the callback with an Error)
      // remind: can be removed once we drop node 14!
      if (socket.writableEnded) {
        handleSocketWriteError(new Error('This socket has been ended by the other party'), data, encoding)
      } else {
        if (typeof options.onBeforeDataWrite === 'function') {
          data = options.onBeforeDataWrite(data)
        }

        socket.write(data, encoding, (err) => {
          if (err) {
            handleSocketWriteError(err, data, encoding)
          }
        })
      }
      callback()
    }
  })

  const createConnection = options.secure !== false ? tls.connect : net.createConnection

  // begin: connection handlers
  function connect (cb) {
    if (connecting) return
    connecting = true

    socket = createConnection(
      getConnectionOptions(options),
      () => {
        connecting = false
        connected = true
        if (options.reconnect) retryBackoff.reset()
        if (cb) cb(null, connected)

        if (sourceStream) {
          sourceStream.pipe(outputStream, { end: false })
          sourceStream.resume()
        }
      }
    )

    addListeners()
  }

  function disconnect () {
    connected = false
    connecting = false

    removeListeners()
    if (sourceStream) {
      sourceStream.pause()
      sourceStream.unpipe(outputStream)
    }
  }

  function reconnect (err) {
    retryBackoff.backoff(err)
  }

  // end: connection handlers

  // begin: connection listeners
  function closeListener (hadError) {
    disconnect()
    emitEvent('socketClose', hadError ? socketError : null)
    if (options.reconnect && hadError) {
      reconnect(socketError)
    } else {
      emitEvent('close', hadError)
    }
  }

  function connectListener () {}

  function endListener () {
    disconnect()
    if (options.reconnect) {
      reconnect()
    } else {
      emitEvent('end')
    }
  }

  function errorListener (err) {
    socketError = err
    // error might be recoverable (i.e., reconnect or intermittent failure)
    // we should not emit an 'error' otherwise the stream will be closed, and we won't be able to write to it
    emitEvent('socketError', socketError)
  }

  // end: connection listeners

  function addListeners () {
    socket
      .on('close', closeListener)
      .on('connect', connectListener)
      .on('end', endListener)
      .on('error', errorListener)
  }

  function removeListeners () {
    socket
      .removeAllListeners('close')
      .removeAllListeners('connect')
      .removeAllListeners('end')
      .removeAllListeners('error')
  }

  function recoverEnqueuedData () {
    if (recoveryQueue.isEmpty()) {
      return
    }
    const item = recoveryQueue.peek()
    socket.write(item.data, item.encoding, (err) => {
      if (err) {
        emitEvent('socketError', new Error(`unable to write data to the TCP socket while recovering data: ${err.message}`))
        return
      }
      recoveryQueue.dequeue()
      recoverEnqueuedData()
    })
  }

  connect(() => {
    emitEvent('open', socket.address())
  })

  function createRetryBackoff () {
    const retry = new Backoff(getBackoffStrategy(options))
    retry.failAfter(options.reconnectTries)
    retry.on('ready', () => {
      connect((err) => {
        if (connected === false) {
          return retry.backoff(err)
        }
        emitEvent('open', socket.address())
        if (options.recovery) {
          recoverEnqueuedData()
        }
      })
    })
    retry.on('fail', (err) => emitEvent('reconnectFailure', err))
    return retry
  }

  function emitEvent (name, ...args) {
    outputStream.emit(name, ...args)
    if (canPropagateEvents) {
      parentPort.postMessage({ code: 'EVENT', name, args })
    }
  }

  outputStream._socket = socket
  return outputStream
}

function getBackoffStrategy (options) {
  if (options.backoffStrategy) {
    if (options.backoffStrategy.constructor && options.backoffStrategy.constructor.name === 'Object') {
      // primitive data
      if (options.backoffStrategy.name === 'exponential') {
        return new ExponentialStrategy(options.backoffStrategy)
      }
      return new FibonacciStrategy(options.backoffStrategy)
    }
    // backoff strategy instance
    return options.backoffStrategy
  }
  return new FibonacciStrategy()
}

function buildStdinSourceStream () {
  // We use this passthrough to buffer incoming messages.
  const inputStream = new stream.PassThrough()
  process.stdin.pipe(inputStream)
  inputStream.pause()
  return inputStream
}

/**
 * @param {TcpConnectionOptions} settings
 * @returns {tls.ConnectionOptions}
 */
function getConnectionOptions (settings) {
  /** @type {tls.ConnectionOptions} */
  const options = settings.unixsocket ? { path: settings.unixsocket } : { host: settings.address, port: settings.port }

  if (settings.secure !== false && settings.noverify === true) {
    options.rejectUnauthorized = false
  }

  return options
}
