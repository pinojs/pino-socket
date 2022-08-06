'use strict'
/* eslint-env node, mocha */

const net = require('net')
const TcpConnection = require('../lib/TcpConnection')
const expect = require('chai').expect

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

test('tcp beforeDataWrite', function testTcpBeforeDataWrite (done) {
  let tcpConnection
  function connect (address, port) {
    tcpConnection = TcpConnection({
      address,
      port,
      onBeforeDataWrite: (data) => {
        expect(data.toString()).to.eq('log1\n')
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
            expect(msg.data.toString()).to.eq('log2\n')
            expect(msgCount).to.eq(1)
            server.close(() => {
              done()
            })
          })
        })
    }
  }
})
