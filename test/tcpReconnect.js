'use strict'
/* eslint-env node, mocha */

const path = require('path')
const fork = require('child_process').fork
const spawn = require('child_process').spawn
const expect = require('chai').expect

test('tcp reconnect', function testTcpReconnect (done) {
  const serverScript = path.join(__dirname, 'fixtures', 'server.js')
  let msgCount = 0
  let address
  let port
  let psock

  let server = fork(serverScript)
  server.on('message', (msg) => {
    switch (msg.action) {
      case 'started':
        firstConnection(msg)
        break
      case 'data':
        server.removeAllListeners('message')
        msgCount += 1
        server.kill()
        setImmediate(secondServer)
    }
  })
  server.send({action: 'startServer'})

  function secondServer () {
    server = fork(serverScript)
    server.on('message', (msg) => {
      switch (msg.action) {
        case 'started':
          secondConnection()
          break
        case 'data':
          msgCount += 1
          expect(msgCount).to.equal(2)
          server.kill()
          psock.kill()
          done()
      }
    })
    server.send({action: 'startServer', address, port})
  }

  function firstConnection (details) {
    address = details.address
    port = details.port
    psock = spawn(
      'node',
      [ `${__dirname}/../psock.js`, '-a', address, '-p', port, '-m', 'tcp', '-r', '-t', 2 ]
    )
    // for debugging
    // psock.stdout.pipe(process.stdout)

    setTimeout(() =>
      psock.stdin.write('log 1\n'),
      500
    )
  }

  function secondConnection () {
    setTimeout(() =>
      psock.stdin.write('log 2\n'),
      1000
    )
  }
})
