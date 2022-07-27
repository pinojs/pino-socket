'use strict'
/* eslint-env node, mocha */

const TcpConnection = require('../lib/TcpConnection')
const { expect } = require('chai')

test('close connection', function (done) {
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
      expect(tcpConnection.destroyed).to.eq(true)
      tcpConnection.write('test', 'utf8', (err) => {
        // cannot write
        expect(err.message).to.eq('write after end')
        done()
      })
    })
  })
})

test('retry connection', function (done) {
  const tcpConnection = TcpConnection({
    address: '127.0.0.1',
    port: 65535,
    reconnect: false
  })
  let counter = 0
  setInterval(() => {
    counter++
    tcpConnection.write(`log${counter}\n`, 'utf8', () => { /* ignore */ })
  }, 100)
  tcpConnection.on('socketError', () => {
    // TCP connection is still writable
    expect(tcpConnection.writableEnded).to.eq(false)
    if (counter === 2) {
      tcpConnection.end(() => {
        done()
      })
    }
  })
})
