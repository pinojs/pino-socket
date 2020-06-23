'use strict'
/* eslint-env node, mocha */

const net = require('net')
const spawn = require('child_process').spawn
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

test('tcp reconnect', function testTcpReconnect (done) {
  let msgCount = 0
  let address
  let port
  let psock

  let server = startServer({ next })
  function next (msg) {
    switch (msg.action) {
      case 'started':
        firstConnection(msg)
        break
      case 'data':
        msgCount += 1
        server.close(() => {
          psock.stdin.write('log 2\n') // dropped due to paused stdin
          setImmediate(secondServer)
        })
    }
  }

  function secondServer () {
    server = startServer({ address, port, next })
    function next (msg) {
      switch (msg.action) {
        case 'started':
          secondConnection()
          break
        case 'data':
          msgCount += 1
          expect(msgCount).to.equal(2)
          server.close()
          psock.kill()
          done()
      }
    }
  }

  function firstConnection (details) {
    address = details.address
    port = details.port
    psock = spawn(
      'node',
      [`${__dirname}/../psock.js`, '-a', address, '-p', port, '-m', 'tcp', '-r', '-t', 2]
    )
    // for debugging
    // psock.stdout.pipe(process.stdout)

    setTimeout(() => {
      psock.stdin.write('log 1\n')
    }, 50)
  }

  function secondConnection () {
    setTimeout(() =>
      psock.stdin.write('log 3\n'),
    100
    )
  }
})
