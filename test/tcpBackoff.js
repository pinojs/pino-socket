'use strict'
/* eslint-env node, mocha */

const TcpConnection = require('../lib/TcpConnection')
const { ExponentialStrategy } = require('backoff')
const { expect } = require('chai')

test('tcp backoff', function testTcpBackoff (done) {
  const exponentialStrategy = new ExponentialStrategy({
    initialDelay: 10,
    factor: 10 // 10, 100, 1000, 2000...
  })
  const tcpConnection = TcpConnection({
    address: '127.0.0.1',
    port: 0,
    reconnect: true,
    backoffStrategy: exponentialStrategy,
    onSocketClose: () => {
      // noop
    }
  })
  setTimeout(() => {
    tcpConnection.end('', 'utf8', () => done())
    // initial, 10, 100
    const nextBackoffDelay = exponentialStrategy.next()
    expect(nextBackoffDelay).to.be.gt(100)
  }, 500)
})
