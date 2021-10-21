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

test('tcp secure send', function tcp (done) {
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
          unauth: true,
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

test('udp send', function tcp (done) {
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
