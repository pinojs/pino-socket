'use strict'
/* eslint-env node, mocha */

const net = require('net')
const path = require('path')
const fs = require('fs')
const spawn = require('child_process').spawn
const expect = require('chai').expect
const unixSocketPath = '/tmp/unix.sock'

function createUnixSockListener (msgHandler) {
  return new Promise((resolve, reject) => {
    const socket = net.createServer((connection) => {
      connection.on('data', (data) => {
        msgHandler(data.toString())
      })
    })
    if (fs.existsSync(unixSocketPath)) fs.unlinkSync(unixSocketPath)
    socket.listen(unixSocketPath, (err) => {
      if (err) {
        return reject(err)
      }
      return resolve(socket)
    })
  })
}

function unixSocketTest (done, socketOptions, cb) {
  let socket
  createUnixSockListener((msg) => cb(msg, socket))
    .then((sock) => {
      socket = sock
      const logit = spawn('node', [path.join(__dirname, '/fixtures/logit.js')])
      logit.unref()
      const psock = spawn(
        'node',
        [path.join(__dirname, '/../psock.js'), '-u', unixSocketPath, '-m', 'tcp']
      )
      psock.unref()
      logit.stdout.on('data', (data) => psock.stdin.write(data))
      logit.stderr.on('data', (data) => console.log(`logit err: ${data}`))
      psock.stderr.on('data', (data) => console.log(`psock err: ${data}`))
    })
    .catch(done)
}

test('unix socket test', (done) => {
  unixSocketTest(done, [], (msg, socket) => {
    try {
      expect(msg).to.contain('"foo":"bar"')
      expect(msg.substr(-1)).to.equal('\n')
      done()
    } catch (e) {
      done(e)
    } finally {
      socket.close()
      socket.unref()
    }
  })
})
