'use strict'

const dgram = require('dgram')
const stream = require('stream')
const util = require('util')

/**
 * @prop {string} [address] The host address to connect to. Default: `127.0.0.1`.
 * @prop {number} [port] The host port to connect to. Default: `514`.
 * @prop {boolean} [cee] Whether or not to prefix messages with `@cee:`. Default: `false`.
 * @typedef {object} UdpConnectionOptions
 */

/**
 * An interface for writing messages to a UDP socket.
 *
 * @param {UdpConnectionOptions} [options]
 * @constructor
 */
function UdpConnection (options) {
  this.options = Object.assign(
    {
      address: '127.0.0.1',
      port: 514
    },
    options
  )
  stream.Writable.call(this, this.options)
  this.socket = dgram.createSocket('udp4')
}
util.inherits(UdpConnection, stream.Writable)

UdpConnection.prototype.close = function close () {
  this.socket.close()
}

UdpConnection.prototype._write = function _write (data, encoding, callback) {
  this.socket.send(data, 0, data.length, this.options.port, this.options.address)
  callback()
}

module.exports = function factory (options) {
  return new UdpConnection(options)
}

module.exports.UdpConnection = UdpConnection
