'use strict'
/* eslint-env node, mocha */

const pino = require('pino')
const net = require('net')
const { expect } = require('chai')

function createTcpListener (msgHandler) {
  return new Promise((resolve, reject) => {
    const socket = net.createServer((connection) => {
      connection.on('data', (data) => {
        msgHandler(data.toString())
      })
    })
    socket.listen(0, '127.0.0.1', (err) => {
      if (err) {
        return reject(err)
      }
      return resolve(socket)
    })
  })
}

test('tcp send', function tcp (done) {
  this.timeout(50000)

  let socket
  let transport

  createTcpListener((msg) => {
    expect(msg).to.contain('"msg":"hello TCP world"')
    expect(msg.substr(-1)).to.equal('\n')
    done()

    transport.end()
    socket.close()
    socket.unref()
  })
    .then((serverSocket) => {
      socket = serverSocket
      const address = socket.address().address
      const port = socket.address().port

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
