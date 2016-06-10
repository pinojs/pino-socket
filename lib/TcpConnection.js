'use strict'

const net = require('net')

/**
 * @prop {string} [address] The host address to connect to. Default: `127.0.0.1`.
 * @prop {number} [port] The host port to connect to. Default: `514`.
 * @prop {boolean} [cee] Whether or not to prefix messages with `@cee:`. Default: `false`.
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
      cee: false
    },
    options
  )
  this.socket = net.createConnection({
    host: this.options.address,
    port: this.options.port
  })

  if (this.options.cee) {
    Object.defineProperty(this, 'write', {
      value: this.ceeWrite.bind(this)
    })
  } else {
    Object.defineProperty(this, 'write', {
      value: this.passThroughWrite.bind(this)
    })
  }
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
