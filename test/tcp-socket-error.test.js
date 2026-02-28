'use strict'

const test = require('node:test')
const { setTimeout: sleep } = require('node:timers/promises')
const TcpConnection = require('../lib/TcpConnection')

let ready = 0
test.after(async () => {
  // eslint-disable-next-line no-unmodified-loop-condition
  while (ready !== 2) {
    await sleep(100)
  }
  setImmediate(process.exit(0))
})

test('close connection', function (t, done) {
  t.plan(2)

  const tcpConnection = TcpConnection({
    address: '127.0.0.1',
    port: 65535,
    reconnect: false
  })
  tcpConnection.on('socketError', () => {
    tcpConnection.end()
  })
  tcpConnection.on('finish', () => {
    process.nextTick(() => {
      t.assert.equal(tcpConnection.destroyed, true)
      tcpConnection.write('test', 'utf8', (err) => {
        // cannot write
        t.assert.equal(err.message, 'write after end')
        tcpConnection.end(() => {
          done()
          setImmediate(() => { ready++ })
        })
      })
    })
  })
})

test('retry connection', function (t, done) {
  t.plan(3)

  const tcpConnection = TcpConnection({
    address: '127.0.0.1',
    port: 65534,
    reconnect: false
  })
  let counter = 0
  setInterval(() => {
    counter++
    tcpConnection.write(`log${counter}\n`, 'utf8', () => { /* ignore */ })
  }, 100)
  tcpConnection.on('socketError', () => {
    // TCP connection is still writable
    t.assert.equal(tcpConnection.writableEnded, false)
    if (counter === 2) {
      tcpConnection.end(() => {
        done()
        setImmediate(() => { ready++ })
      })
    }
  })
})
