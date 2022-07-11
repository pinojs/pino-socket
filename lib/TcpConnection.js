'use strict'

const net = require('net')
const tls = require('tls')
const stream = require('stream')
const { Backoff, FibonacciStrategy } = require('backoff')

/**
 * @typedef {object} TcpConnectionOptions
 * @prop {boolean} [secure] Enable secure (TLS) connection. Default: false.
 * @prop {boolean} [noverify] Allow connection to server with self-signed certificates. Default: false.
 * @prop {string} [address] The host address to connect to. Default: `127.0.0.1`.
 * @prop {number} [port] The host port to connect to. Default: `514`.
 * @prop {boolean} [reconnect] Enable reconnecting to dropped TCP destinations. Default: false.
 * @prop {number} [reconnectTries] Number of times to attempt reconnection before giving up. Default: `Infinity`
 * @prop {string?} [unixsocket] The unix socket path for the destination. Default: ``.
 * @prop {(error: Error|null) => void?} [onSocketClose] The callback when the socket is closed. Default: ``.
 * @prop {BackoffStrategy?} [backoffStrategy] The backoff strategy to use. The backoff strategy must implement the `BackoffStrategy` interface. Default: `new FibonacciStrategy()`.
 * @prop {stream.Readable?} [sourceStream]
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
      onSocketClose: (socketError) => socketError && process.stderr.write(socketError.message)
    },
    userOptions
  )

  const sourceStream = Object.prototype.hasOwnProperty.call(options, 'sourceStream')
    ? options.sourceStream
    : buildCliSourceStream()

  /** @type {net.Socket} */
  let socket = null
  let connected = false
  let connecting = false
  let socketError = null

  const retryBackoff = createRetryBackoff()

  // This stream is the one returned to psock.js.
  const outputStream = stream.Writable({
    autoDestroy: true,
    close () { socket.end() },
    write (data, encoding, callback) {
      socket.write(data)
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

  function reconnect () {
    retryBackoff.backoff()
  }
  // end: connection handlers

  // begin: connection listeners
  function closeListener (hadError) {
    disconnect()
    if (hadError) {
      if (options.onSocketClose) {
        options.onSocketClose(socketError)
      }
    }
    if (options.reconnect) reconnect()
  }

  function connectListener () {}

  function endListener () {
    disconnect()
    if (options.reconnect) reconnect()
  }

  function errorListener (err) {
    socketError = err
  }
  // end: connection listerners

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

  connect(() => {
    // TODO we must propagate the events from the socket to the outputStream
    outputStream.emit('open')
  })

  function createRetryBackoff () {
    const retry = new Backoff(options.backoffStrategy ? options.backoffStrategy : new FibonacciStrategy())
    retry.failAfter(options.reconnectTries)
    retry.on('ready', () => {
      connect((err) => {
        if (connected === false) {
          return retry.backoff(err)
        }
      })
    })
    retry.on('fail', (err) => process.stderr.write(`could not reconnect: ${err.message}`))
    return retry
  }

  return outputStream
}

function buildCliSourceStream () {
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
