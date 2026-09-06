'use strict'

const test = require('node:test')
const net = require('node:net')
const path = require('node:path')
const os = require('node:os')
const fs = require('node:fs')
const spawn = require('node:child_process').spawn
const pino = require('pino')

const udpConnectionFactory = require('../lib/UdpConnection')

const socketPath = path.join(os.tmpdir(), 'pino-socket-unixsocket-mode-' + process.pid + '.sock')
const isWindows = process.platform === 'win32'

test.after(() => {
  setImmediate(() => process.exit(0))
})

function cleanSocket () {
  try {
    fs.unlinkSync(socketPath)
  } catch (e) {}
}

function createListener (onMessage) {
  return new Promise((resolve, reject) => {
    cleanSocket()
    const server = net.createServer((connection) => {
      connection.on('data', (data) => onMessage(data.toString()))
    })
    server.once('error', reject)
    server.listen(socketPath, () => resolve(server))
  })
}

test('udp connection factory rejects the unixsocket option', (t) => {
  t.plan(1)
  t.assert.throws(() => {
    udpConnectionFactory({ unixsocket: socketPath, secure: false })
  }, /only supported in TCP mode/)
})

test('pino transport switches to TCP mode when unixsocket is set', { skip: isWindows }, async (t) => {
  t.plan(2)
  const received = new Promise((resolve) => {
    createListener((msg) => resolve(msg)).then((server) => {
      t.after(() => {
        server.close()
        cleanSocket()
      })
      const transport = pino.transport({
        target: '../psock.js',
        level: 'info',
        options: { unixsocket: socketPath }
      })
      const log = pino(transport)
      log.info('hello unix socket')
    })
  })
  const msg = await received
  t.assert.equal(msg.includes('"msg":"hello unix socket"'), true)
  t.assert.equal(msg.at(-1), '\n')
})

test('cli switches to TCP mode when only -u is passed', { skip: isWindows }, (t, done) => {
  t.plan(2)
  createListener((msg) => {
    try {
      t.assert.equal(msg.includes('"foo":"bar"'), true)
      t.assert.equal(msg.at(-1), '\n')
      done()
    } catch (e) {
      done(e)
    }
  })
    .then((server) => {
      t.after(() => {
        server.close()
        cleanSocket()
      })
      const logit = spawn('node', [path.join(__dirname, 'fixtures', 'logit.js')])
      logit.unref()
      const psock = spawn('node', [path.join(__dirname, '..', 'psock.js'), '-u', socketPath])
      psock.unref()
      logit.stdout.on('data', (data) => psock.stdin.write(data))
      logit.stderr.on('data', (data) => console.log(`logit err: ${data}`))
      psock.stderr.on('data', (data) => console.log(`psock err: ${data}`))
    })
    .catch(done)
})
