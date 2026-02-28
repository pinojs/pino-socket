'use strict'

const test = require('node:test')
const net = require('node:net')
const path = require('node:path')
const spawn = require('node:child_process').spawn
const getPort = require('get-port')
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

test.after(() => setImmediate(() => process.exit(0)))

test('tcp reconnect', function testTcpReconnect (t, done) {
  t.plan(1)

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
          t.assert.equal(msgCount, 2)
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
      [path.join(__dirname, '/../psock.js'), '-a', address, '-p', port, '-m', 'tcp', '-r', '-t', 2]
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

test('tcp reconnect after initial failure', async function testTcpReconnectAfterInitialFailure (t) {
  t.plan(5)

  let failureCount = 0
  let openCount = 0
  let closeCount = 0
  let counter = 0
  function sendData () {
    setInterval(() => {
      counter++
      tcpConnection.write(`log${counter}\n`, 'utf8', () => { /* ignore */ })
    }, 100)
  }
  const port = await getPort()
  const address = '127.0.0.1'
  const tcpConnection = TcpConnection({
    address,
    port,
    reconnect: true
  })
  tcpConnection.on('open', () => { openCount++ })
  tcpConnection.on('socketError', () => { failureCount++ })
  tcpConnection.on('socketClose', () => { closeCount++ })
  sendData()
  const received = await new Promise((resolve, reject) => {
    let closing = false
    const received = []
    const server = startServer({
      address,
      port,
      next: (msg) => {
        switch (msg.action) {
          case 'data':
            received.push(msg)
            if (!closing) {
              closing = true
              server.close(() => {
                resolve(received)
              })
            }
        }
      }
    })
  })
  t.assert.equal(closeCount, 1)
  t.assert.equal(openCount, 1)
  t.assert.equal(failureCount >= counter, true)
  t.assert.equal(received.length, 1)
  t.assert.equal(received[0].data.toString('utf8'), `log${counter}\n`)
  tcpConnection.end()
  process.stdin.removeAllListeners()
})

test('tcp no reconnect when socket is gracefully closed', function testTcpNoReconnectSocketGracefullyClosed (t, done) {
  t.plan(1)

  let msgCount = 0
  let tcpConnection
  const server = startServer({ next })
  function next (msg) {
    switch (msg.action) {
      case 'started':
        connect(msg.address, msg.port)
        break
      case 'data':
        msgCount += 1
        // gracefully close the socket, it should not reconnect
        tcpConnection._socket.destroy()
    }
  }
  function connect (address, port) {
    tcpConnection = TcpConnection({
      address,
      port,
      reconnect: true
    })
    tcpConnection.write('data', 'utf8', () => { /* ignore */ })
    tcpConnection.on('close', () => {
      t.assert.equal(msgCount, 1)
      // tcp connection should be closed!
      server.close(() => {
        process.stdin.removeAllListeners()
        done()
      })
    })
  }
})
