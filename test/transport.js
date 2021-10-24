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
