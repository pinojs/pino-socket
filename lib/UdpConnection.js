'use strict'

const dgram = require('dgram')
const Buffer = require('safe-buffer').Buffer

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
      port: 514,
      cee: false
    },
    options
  )
  this.socket = dgram.createSocket('udp4')

  if (this.options.cee) {
    Object.defineProperty(this, 'write', {
      value: function write (message) {
        const buf = Buffer.from(`@cee: ${message}\n`, 'utf8')
        this.socket.send(buf, 0, buf.length, this.options.port, this.options.address)
      }
    })
  } else {
    Object.defineProperty(this, 'write', {
      value: function write (message) {
        const buf = Buffer.from(`${message}\n`, 'utf8')
        this.socket.send(buf, 0, buf.length, this.options.port, this.options.address)
      }
    })
  }
}

UdpConnection.prototype.close = function close () {
  this.socket.close()
}

module.exports = function factory (options) {
  return new UdpConnection(options)
}

module.exports.UdpConnection = UdpConnection
