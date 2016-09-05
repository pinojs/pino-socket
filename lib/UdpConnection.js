'use strict'

const dgram = require('dgram')
const stream = require('stream')

module.exports = function factory (userOptions) {
  const options = Object.assign(
    {
      address: '127.0.0.1',
      port: 514
    },
    userOptions
  )
  const socket = dgram.createSocket('udp4')

  return new stream.Writable({
    close () { socket.close() },
    write (data, encoding, callback) {
      socket.send(data, 0, data.length, options.port, options.address)
      callback()
    }
  })
}
