'use strict'

const test = require('node:test')
const net = require('node:net')
const TcpConnection = require('../lib/TcpConnection')

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

test('tcp beforeDataWrite', function testTcpBeforeDataWrite (t, done) {
  t.plan(3)

  let tcpConnection
  function connect (address, port) {
    tcpConnection = TcpConnection({
      address,
      port,
      onBeforeDataWrite: (data) => {
        t.assert.equal(data.toString(), 'log1\n')
        return Buffer.from('log2\n', 'utf8')
      }
    })
    tcpConnection.on('error', (err) => { console.log({ err })/* ignore */ })
    tcpConnection.write('log1\n', 'utf8', () => {
    })
  }

  let msgCount = 0
  const server = startServer({ next })
  function next (msg) {
    switch (msg.action) {
      case 'started':
        connect(msg.address, msg.port)
        break
      case 'data':
        msgCount += 1
        tcpConnection.end(() => {
          process.nextTick(() => {
            t.assert.equal(msg.data.toString(), 'log2\n')
            t.assert.equal(msgCount, 1)
            server.close(() => {
              done()
              setImmediate(() => process.exit(0))
            })
          })
        })
    }
  }
})
