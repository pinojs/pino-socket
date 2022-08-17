'use strict'
/* eslint-env node, mocha */

const TcpConnection = require('../lib/TcpConnection')
const { ExponentialStrategy } = require('backoff')
const { expect } = require('chai')
const { performance } = require('perf_hooks')

test('tcp backoff', function testTcpBackoff (done) {
  let closeCount = 0
  const exponentialStrategy = new ExponentialStrategy({
    initialDelay: 10,
    factor: 10 // 10, 100, 1000, 2000...
  })
  const tcpConnection = TcpConnection({
    address: '127.0.0.1',
    port: 0,
    reconnect: true,
    backoffStrategy: exponentialStrategy
  })
  tcpConnection.on('socketClose', () => {
    closeCount++
    if (closeCount === 3) {
      const nextBackoffDelay = exponentialStrategy.next()
      // initial, 10, 100... next delay should be 1000
      expect(nextBackoffDelay).to.eq(1000)
      tcpConnection.end(() => {
        process.stdin.removeAllListeners()
        done()
      })
    }
  })
})

test('tcp backoff (primitive data)', function testTcpBackoffUsingPrimitiveData (done) {
  let closeCount = 0
  const tcpConnection = TcpConnection({
    address: '127.0.0.1',
    port: 0,
    reconnect: true,
    backoffStrategy: {
      name: 'exponential',
      initialDelay: 10,
      factor: 10 // 10, 100, 1000, 2000...
    }
  })
  const start = performance.now()
  tcpConnection.on('socketClose', () => {
    closeCount++
    if (closeCount === 3) {
      // initial, 10, 100... next delay should be 1000
      const elapsed = performance.now() - start
      expect(elapsed).to.be.below(1000)
      tcpConnection.end(() => {
        process.stdin.removeAllListeners()
        done()
      })
    }
  })
})
