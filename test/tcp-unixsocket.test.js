'use strict'

const test = require('node:test')
const net = require('node:net')
const path = require('node:path')
const fs = require('node:fs')
const spawn = require('node:child_process').spawn

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

test.after(() => {
  setImmediate(() => process.exit(0))
})

test('unix socket test', (t, done) => {
  t.plan(2)
  unixSocketTest(done, [], (msg, socket) => {
    try {
      t.assert.equal(msg.includes('"foo":"bar"'), true)
      t.assert.equal(msg.at(-1), '\n')
      done()
    } catch (e) {
      done(e)
    } finally {
      socket.close()
      socket.unref()
    }
  })
})
