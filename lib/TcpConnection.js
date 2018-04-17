'use strict'

const net = require('net')
const stream = require('stream')
const backoff = require('backoff')

/**
 * @prop {string} [address] The host address to connect to. Default: `127.0.0.1`.
 * @prop {number} [port] The host port to connect to. Default: `514`.
 * @prop {boolean} [reconnect] Whether or not to attempt reconnecting when
 * the connection is dropped. Default: `false`
 * @prop {number} [reconnectTries] Number of times to attempt reconnection
 * before giving up. Default: `Infinity`
 * @typedef {object} TcpConnectionOptions
 */

/**
 * Returns a writable stream that forwards messages to a remote server via a TCP connection.
 *
 * @param {TcpConnectionOptions} userOptions
 * @returns {*}
 */
module.exports = function factory (userOptions) {
  const options = Object.assign(
    {
      address: '127.0.0.1',
      port: 514,
      reconnect: false,
      reconnectTries: Infinity
    },
    userOptions
  )

  // We use this passthrough to buffer incoming messages.
  const inputStream = new stream.PassThrough()
  process.stdin.pipe(inputStream)
  inputStream.pause()

  let socket = null
  let connected = false
  let connecting = false
  let socketError = null

  // This stream is the one returned to psock.js.
  const outputStream = stream.Writable({
    write (data, encoding, callback) {
      socket.write(data)
      callback()
    }
  })

  outputStream.close = function () {
    socket.unref()
    process.stdin.unpipe(inputStream, { end: true })
    inputStream.unpipe(outputStream, { end: true })
  }

  // begin: connection handlers
  function connect (cb) {
    if (connecting) return
    connecting = true
    socket = net.createConnection(
      { host: options.address, port: options.port },
      () => {
        connecting = false
        connected = true
        if (cb) cb(null, connected)
        inputStream.pipe(outputStream, { end: false })
        inputStream.resume()
      }
    )
    addListeners()
  }

  function disconnect () {
    connected = false
    inputStream.pause()
    inputStream.unpipe(outputStream)
  }

  function reconnect () {
    const retry = backoff.fibonacci()
    retry.failAfter(options.reconnectTries)
    retry.on('ready', () => {
      connect((err) => {
        if (connected === false) return retry.backoff(err)
      })
    })
    retry.on('fail', (err) => process.stderr.write(`could not reconnect: ${err.message}`))
    retry.backoff()
  }
  // end: connection handlers

  // begin: connection listeners
  function closeListener (hadError) {
    disconnect()
    if (hadError) {
      process.stderr.write(socketError.message)
    }
    if (options.reconnect) reconnect()
  }

  function connectListener () {}

  function endListener () {
    disconnect()
    removeListeners()
    if (options.reconnect) reconnect()
  }

  function errorListener (err) {
    socketError = err
  }
  // end: connection listerners

  function addListeners () {
    socket.on('close', closeListener)
    socket.on('connect', connectListener)
    socket.on('end', endListener)
    socket.on('error', errorListener)
  }

  function removeListeners () {
    socket.removeAllListeners('close')
    socket.removeAllListeners('connect')
    socket.removeAllListeners('end')
    socket.removeAllListeners('error')
  }

  connect()
  return outputStream
}
