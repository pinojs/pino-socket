'use strict'

const test = require('node:test')
const net = require('node:net')
const path = require('node:path')
const spawn = require('node:child_process').spawn

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

test('tcp reconnect after ECONNREFUSED', function testTcpReconnect (t, done) {
  t.plan(1)

  let msgCount = 0
  let address
  let port
  let psock

  sendMessage({
    address: '127.0.0.1',
    port: 2030
  })
  setTimeout(() => {
    const server = startServer({ next, port: 2030 })

    function next (msg) {
      switch (msg.action) {
        case 'data':
          msgCount += 1
          server.close(() => {
            t.assert.equal(msgCount, 1)
            server.close()
            psock.kill()
            done()
            setImmediate(() => process.exit(0))
          })
      }
    }
  }, 1000)

  function sendMessage (details) {
    address = details.address
    port = details.port
    psock = spawn(
      'node',
      [path.join(__dirname, '/../psock.js'), '-a', address, '-p', port, '-m', 'tcp', '-r']
    )
    // for debugging
    // psock.stdout.pipe(process.stdout)
    // psock.stderr.pipe(process.stderr)

    setTimeout(() => {
      psock.stdin.write('log 1\n')
    }, 50)
  }
})
