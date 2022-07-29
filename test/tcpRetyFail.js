'use strict'
/* eslint-env node, mocha */

const { expect } = require('chai')
const TcpConnection = require('../lib/TcpConnection')

test('tcp retry fail', function testTcpRetryFail (done) {
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
    expect(socketErrorCount).to.eq(3)
    expect(lastError).to.be.an('error')
    tcpConnection.end(() => {
      done()
    })
  })
})
