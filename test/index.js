'use strict'
/* eslint-env node, mocha */

const dgram = require('dgram')
const net = require('net')
const spawn = require('child_process').spawn
const expect = require('chai').expect

function createTcpListener (msgHandler) {
  return new Promise((resolve, reject) => {
    const socket = net.createServer((connection) => {
      connection.on('data', (data) => msgHandler(data.toString()))
    })
    socket.listen((err) => {
      if (err) {
        return reject(err)
      }
      return resolve(socket)
    })
  })
}

function createUdpListener (msgHandler) {
  return new Promise((resolve) => {
    const socket = dgram.createSocket('udp4')
    socket.on('message', (msg) => msgHandler(msg.toString()))
    socket.on('error', (err) => console.log(`socket error: ${err.message}`))
    socket.bind({address: '127.0.0.1'}, () => resolve(socket))
  })
}

function killPsock () {
  setImmediate(() => this.kill())
}

test('tcp send', function tcp (done) {
  let socket
  createTcpListener(
    (msg) => {
      try {
        expect(msg).to.contain('"foo":"bar"')
        expect(msg.substr(-1)).to.equal('\n')
        done()
      } catch (e) {
        done(e)
      } finally {
        socket.close()
      }
    }
  )
    .then((sock) => {
      socket = sock
      const address = socket.address().address
      const port = socket.address().port
      const logit = spawn('node', [`${__dirname}/fixtures/logit.js`])
      const psock = spawn('node', [`${__dirname}/../psock.js`, '-a', address, '-p', port, '-m', 'tcp'])

      logit.stdout.on('data', (data) => psock.stdin.write(data))
      logit.stderr.on('data', (data) => console.log(`logit err: ${data}`))
      psock.stderr.on('data', (data) => console.log(`psock err: ${data}`))

      logit.on('close', () => psock.stdin.end(killPsock.bind(psock)))
    })
    .catch(done)
})

test('udp send', function udp (done) {
  let socket
  createUdpListener(
    (msg) => {
      try {
        expect(msg).to.contain('"foo":"bar"')
        expect(msg.substr(-1)).to.equal('\n')
        done()
      } catch (e) {
        done(e)
      } finally {
        socket.close()
      }
    }
  )
    .then((sock) => {
      socket = sock
      const address = socket.address().address
      const port = socket.address().port
      const logit = spawn('node', [`${__dirname}/fixtures/logit.js`])
      const psock = spawn('node', [`${__dirname}/../psock.js`, '-a', address, '-p', port])

      logit.stdout.on('data', (data) => psock.stdin.write(data))
      logit.stderr.on('data', (data) => console.log(`logit err: ${data}`))
      psock.stderr.on('data', (data) => console.log(`psock err: ${data}`))

      logit.on('close', () => psock.stdin.end(killPsock.bind(psock)))
    })
})
