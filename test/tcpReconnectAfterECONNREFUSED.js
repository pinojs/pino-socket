'use strict'
/* eslint-env node, mocha */

const net = require('net')
const spawn = require('child_process').spawn
const expect = require('chai').expect

function startServer ({ address, port, next }) {
  const socket = net.createServer((connection) => {
    connection.on('data', (data) => {
      next({ action: 'data', data })
      connection.end()
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

test('tcp reconnect after ECONNREFUSED', function testTcpReconnect (done) {
  let msgCount = 0
  let address
  let port
  let psock

  sendMessage({
    address: '127.0.0.1',
    port: 2030
  })
  setTimeout(() => {
    let server = startServer({ next, port: 2030 })

    function next (msg) {
      switch (msg.action) {
        case 'data':
          msgCount += 1
          server.close(() => {
            expect(msgCount).to.equal(1)
            server.close()
            psock.kill()
            done()
          })
      }
    }
  }, 1000)

  function sendMessage (details) {
    address = details.address
    port = details.port
    psock = spawn(
      'node',
      [ `${__dirname}/../psock.js`, '-a', address, '-p', port, '-m', 'tcp', '-r' ]
    )
    // for debugging
    // psock.stdout.pipe(process.stdout)
    // psock.stderr.pipe(process.stderr)

    setTimeout(() => {
      psock.stdin.write('log 1\n')
    }, 50)
  }
})
