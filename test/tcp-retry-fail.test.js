'use strict'

const test = require('node:test')
const TcpConnection = require('../lib/TcpConnection')

test('tcp retry fail', function testTcpRetryFail (t, done) {
  t.plan(2)

  let socketErrorCount = 0
  const tcpConnection = TcpConnection({
    address: '127.0.0.1',
    port: 0,
    reconnect: true,
    reconnectTries: 2
  }
  )
  tcpConnection.on('socketError', () => {
    socketErrorCount++
  })
  tcpConnection.on('reconnectFailure', (lastError) => {
    t.assert.equal(socketErrorCount, 3)
    t.assert.equal(lastError instanceof Error, true)
    tcpConnection.end(() => {
      done()
      setImmediate(() => process.exit(0))
    })
  })
})
