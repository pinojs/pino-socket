'use strict'
/* eslint-env node, mocha */

const path = require('path')
const spawn = require('child_process').spawn
const expect = require('chai').expect
const { createTcpListener, createUdpListener } = require('./utils')

function tcpTest (done, socketOptions, cb) {
  let socket
  createTcpListener((msg) => cb(msg, socket))
    .then((sock) => {
      socket = sock
      const address = socket.address().address
      const port = socket.address().port
      const logit = spawn('node', [path.join(__dirname, '/fixtures/logit.js')])
      logit.unref()
      const psock = spawn(
        'node',
        [path.join(__dirname, '/../psock.js'), '-a', address, '-p', port, '-m', 'tcp'].concat(socketOptions)
      )
      psock.unref()
      logit.stdout.on('data', (data) => psock.stdin.write(data))
      logit.stderr.on('data', (data) => console.log(`logit err: ${data}`))
      psock.stderr.on('data', (data) => console.log(`psock err: ${data}`))
    })
    .catch(done)
}

function udpTest (done, socketOptions, cb) {
  let socket
  createUdpListener((msg) => cb(msg, socket))
    .then((sock) => {
      socket = sock
      const address = socket.address().address
      const port = socket.address().port
      const logit = spawn('node', [path.join(__dirname, '/fixtures/logit.js')])
      const psock = spawn(
        'node',
        [path.join(__dirname, '/../psock.js'), '-a', address, '-p', port].concat(socketOptions)
      )

      logit.stdout.on('data', (data) => psock.stdin.write(data))
      logit.stderr.on('data', (data) => console.log(`logit err: ${data}`))
      psock.stderr.on('data', (data) => console.log(`psock err: ${data}`))

      logit.on('close', () => psock.stdin.end(
        setImmediate.bind(null, psock.kill)
      ))
    })
    .catch(done)
}

test('tcp send', function tcp (done) {
  tcpTest(done, [], (msg, socket) => {
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

test('udp send', function udp (done) {
  udpTest(done, [], (msg, socket) => {
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

// This ridiculousness is because when the tests are run via
// gulp.mocha there's something that causes it to run idefinitely.
// It doesn't matter that we have close all of the sockets and killed all
// of the children.
after(function () { setImmediate(process.exit) })
