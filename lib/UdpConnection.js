'use strict'

const dgram = require('dgram')
const stream = require('stream')

module.exports = function factory (userOptions) {
  if (userOptions.secure !== false) {
    throw new Error('Secure connection for udp protocol is not supported')
  }

  const options = Object.assign(
    {
      address: '127.0.0.1',
      port: 514
    },
    userOptions
  )
  const socket = dgram.createSocket('udp4')

  const writableStream = new stream.Writable({
    autoDestroy: true,
    destroy (err, callback) {
      socket.close(callback.bind(null, err))
    },
    write (data, encoding, callback) {
      if (userOptions.maxUdpPacketSize !== null && data.length > userOptions.maxUdpPacketSize) {
        callback(null)
      } else {
        socket.send(data, callback)
      }
    }
  })

  const sourceStream = Object.prototype.hasOwnProperty.call(options, 'sourceStream')
    ? options.sourceStream
    : process.stdin

  if (sourceStream) {
    sourceStream.pipe(writableStream, { end: false })
  }

  socket.on('close', () => {
    writableStream.emit('close', false)
  })

  socket.on('error', (err) => {
    writableStream.emit('socketError', err)
  })

  socket.connect(options.port, options.address, () => {
    writableStream.emit('open', socket.address())
  })

  return writableStream
}
