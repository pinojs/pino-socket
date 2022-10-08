'use strict'
/* eslint-env node, mocha */

const pino = require('pino')
const { expect } = require('chai')
const { createSecureTcpListener, createTcpListener, createUdpListener } = require('./utils')

test('tcp send', function tcp (done) {
  let socket
  let transport

  createTcpListener((msg) => {
    expect(msg).to.contain('"msg":"hello TCP world"')
    expect(msg.substr(-1)).to.equal('\n')
    done()

    socket.close()
    socket.unref()
  })
    .then((serverSocket) => {
      socket = serverSocket
      const { address, port } = socket.address()

      transport = pino.transport({
        target: '../psock.js',
        level: 'info',
        options: {
          mode: 'tcp',
          address,
          port
        }
      })
      const log = pino(transport)

      log.info('hello TCP world')
    })
    .catch(done)
})

test('tcp secure send', function tcpSecure (done) {
  let socket
  let transport

  createSecureTcpListener((msg) => {
    expect(msg).to.contain('"msg":"hello secure TCP world"')
    expect(msg.substr(-1)).to.equal('\n')
    done()

    socket.close()
    socket.unref()
  })
    .then((serverSocket) => {
      socket = serverSocket
      const { address, port } = socket.address()

      transport = pino.transport({
        target: '../psock.js',
        level: 'info',
        options: {
          secure: true,
          noverify: true,
          mode: 'tcp',
          address,
          port
        }
      })

      const log = pino(transport)

      log.info('hello secure TCP world')
    })
    .catch(done)
})

test('udp send', function udp (done) {
  let server
  let transport

  createUdpListener((msg) => {
    expect(msg).to.contain('"msg":"hello UDP world"')
    expect(msg.substr(-1)).to.equal('\n')
    done()

    server.close()
    server.unref()
  })
    .then((serverSocket) => {
      server = serverSocket
      const { address, port } = server.address()

      transport = pino.transport({
        target: '../psock.js',
        level: 'info',
        options: {
          mode: 'udp',
          address,
          port
        }
      })
      const log = pino(transport)

      log.info('hello UDP world')
    })
    .catch(done)
})

test('udp secure fail', function updSecure (done) {
  let server

  process.removeAllListeners('uncaughtException')

  process.once('uncaughtException', (err) => {
    expect(err.message).equal('Secure connection for udp protocol is not supported')
    done()
  })

  createUdpListener((msg) => {
    server.close()
    server.unref()

    throw new Error('Secure udp is not supported')
  })
    .then((serverSocket) => {
      server = serverSocket
      const { address, port } = server.address()

      const transport = pino.transport({
        target: '../psock.js',
        level: 'info',
        options: {
          secure: true,
          mode: 'udp',
          address,
          port
        }
      })

      const log = pino(transport)

      log.info('hello secure UDP world')
    })
    .catch(done)
})

test('udp packet overflow - throw exception on no max packet size option)', function udp (done) {
  let server
  let transport

  process.removeAllListeners('uncaughtException')

  process.once('uncaughtException', (err) => {
    expect(err.message).equal('send EMSGSIZE')
    done()
  })

  createUdpListener((msg) => {
    done()

    server.close()
    server.unref()
  })
    .then((serverSocket) => {
      server = serverSocket
      const { address, port } = server.address()

      transport = pino.transport({
        target: '../psock.js',
        level: 'info',
        options: {
          mode: 'udp',
          address,
          port
        }
      })
      const log = pino(transport)

      const overflowBuffer = Buffer.alloc(66666, 'a')
      log.info(overflowBuffer.toString())
    })
    .catch(done)
})

test('udp packet overflow - skip packet when using max packet size option', function udp (done) {
  let server
  let transport

  createUdpListener((msg) => {
    expect(msg).to.contain('"msg":"hello UDP world"')
    done()

    server.close()
    server.unref()
  })
    .then((serverSocket) => {
      server = serverSocket
      const { address, port } = server.address()

      transport = pino.transport({
        target: '../psock.js',
        level: 'info',
        options: {
          mode: 'udp',
          address,
          port,
          maxUdpPacketSize: 65507
        }
      })
      const log = pino(transport)

      // will be skipped
      const overflowBuffer = Buffer.alloc(66667, 'a')
      log.info(overflowBuffer.toString())

      // we can use timeout here, but it's not reliable
      // in a test environment
      transport.flushSync()

      // will be sent
      const trueMessage = 'hello UDP world'
      log.info(trueMessage)
    })
    .catch(done)
})
