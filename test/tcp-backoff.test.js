'use strict'

const test = require('node:test')
const { performance } = require('node:perf_hooks')
const { ExponentialStrategy } = require('backoff')
const TcpConnection = require('../lib/TcpConnection')

test.after(() => setImmediate(() => process.exit(0)))

test('tcp backoff', function testTcpBackoff (t, done) {
  t.plan(1)

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
      t.assert.equal(nextBackoffDelay, 1000)
      tcpConnection.end(() => {
        process.stdin.removeAllListeners()
        done()
      })
    }
  })
})

test('tcp backoff (primitive data)', function testTcpBackoffUsingPrimitiveData (t, done) {
  t.plan(1)

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
      t.assert.equal(elapsed < 1000, true)
      tcpConnection.end(() => {
        process.stdin.removeAllListeners()
        done()
      })
    }
  })
})
