'use strict'

const test = require('node:test')
const { join } = require('node:path')
const net = require('node:net')
const ThreadStream = require('thread-stream')

function startServer ({ address, port, next }) {
  const socket = net.createServer((connection) => {
    connection.on('data', (data) => {
      next({ action: 'data', data })
      connection.destroy()
    })
  })

  socket.listen(port || 0, address || '127.0.0.1', () => {
    next({
      action: 'started',
      address: socket.address().address,
      port: socket.address().port
    })
  })

  return socket
}

test('#propagateEvents', function (t, done) {
  t.plan(1)

  const server = startServer({ next })
  let stream
  function connect (address, port) {
    stream = new ThreadStream({
      filename: join(__dirname, '..', 'lib', 'pino-transport.js'),
      workerData: {
        address,
        port,
        mode: 'tcp',
        reconnect: true
      },
      sync: true
    })
    stream.on('error', (err) => { console.log({ err }) })
    stream.on('open', () => {
      // should receive the event 'open' from the worker thread
      stream.write('log1')
    })
  }

  function next (msg) {
    switch (msg.action) {
      case 'started': {
        connect(msg.address, msg.port)
        break
      }

      case 'data': {
        t.assert.equal(msg.data, 'log1')
        stream.end()
        server.close(() => {
          done()
        })
        break
      }
    }
  }
})
