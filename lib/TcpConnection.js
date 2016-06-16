'use strict'

const net = require('net')
const backoff = require('backoff')

/**
 * @prop {string} [address] The host address to connect to. Default: `127.0.0.1`.
 * @prop {number} [port] The host port to connect to. Default: `514`.
 * @prop {boolean} [cee] Whether or not to prefix messages with `@cee:`. Default: `false`.
 * @prop {boolean} [reconnect] Whether or not to attempt reconnecting when
 * the connection is dropped. Default: `false`
 * @prop {number} [reconnectTries] Number of times to attempt reconnection
 * before giving up. Default: `Infinity`
 * @typedef {object} TcpConnectionOptions
 */

/**
 * An interface for writing messages to a TCP socket.
 *
 * @param {TcpConnectionOptions} [options]
 * @constructor
 */
function TcpConnection (options) {
  this.options = Object.assign(
    {
      address: '127.0.0.1',
      port: 514,
      cee: false,
      reconnect: false,
      reconnectTries: Infinity
    },
    options
  )

  if (this.options.cee) {
    Object.defineProperty(this, 'write', {
      value: this.ceeWrite.bind(this)
    })
  } else {
    Object.defineProperty(this, 'write', {
      value: this.passThroughWrite.bind(this)
    })
  }

  this.connecting = false
  this.connected = false
  this.socketError = null

  function closeListener (hadError) {
    this.connected = false
    if (hadError) {
      console.error(this.socketError.message)
    }
    if (!this.options.reconnect) return
    reconnect.call(this)
  }

  function connect (cb) {
    if (this.connecting) return
    this.connecting = true
    this.socket = net.createConnection(
      {host: this.options.address, port: this.options.port},
      () => {
        this.connecting = false
        this.connected = true
        if (cb) cb(null, this.connected)
      }
    )
    addListeners.call(this)
  }

  function connectListener () {}

  function endListener () {
    this.connected = false
    removeListeners.call(this)
    if (!this.options.reconnect) return
    reconnect.call(this)
  }

  function errorListener (err) {
    this.socketError = err
  }

  function reconnect () {
    const retry = backoff.fibonacci()
    retry.failAfter(this.options.reconnectTries)
    retry.on('ready', connect.bind(this, (err) => {
      if (this.connected === false) retry.backoff(err)
    }))
    retry.on('fail', (err) => console.error('could not reconnect: %s', err.message))
    retry.backoff()
  }

  function addListeners () {
    this.socket.on('close', closeListener.bind(this))
    this.socket.on('connect', connectListener.bind(this))
    this.socket.on('end', endListener.bind(this))
    this.socket.on('error', errorListener.bind(this))
  }

  function removeListeners () {
    this.socket.removeAllListeners('close')
    this.socket.removeAllListeners('connect')
    this.socket.removeAllListeners('end')
    this.socket.removeAllListeners('error')
  }

  connect.call(this)
}

TcpConnection.prototype.close = function close () {
  this.socket.end()
}

TcpConnection.prototype.ceeWrite = function ceeWrite (message) {
  this.socket.write(`@cee: ${message}\n`)
}

TcpConnection.prototype.passThroughWrite = function ptw (message) {
  this.socket.write(`${message}\n`)
}

module.exports = function factory (options) {
  return new TcpConnection(options)
}

module.exports.TcpConnection = TcpConnection
