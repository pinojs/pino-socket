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

  const writableStream = new stream.Writable({
    write (data, encoding, callback) {
      socket.send(data, 0, data.length, options.port, options.address)
      callback()
    }
  })

  writableStream.close = function () {
    socket.unref()
    process.stdin.unpipe(writableStream, { end: true })
  }

  process.stdin.pipe(writableStream, { end: false })
  return writableStream
}
