'use strict'

const test = require('node:test')
const net = require('node:net')
const path = require('node:path')
const { fork, spawn } = require('node:child_process')
const { Transform } = require('node:stream')

const { default: why } = require('why-is-node-running')

// https://github.com/pinojs/pino-socket/issues/5
test('issue #5', (t, done) => {
  t.plan(2)

  const server = net.createServer()
  server.unref()
  server.listen(() => {
    const { address, port } = server.address()
    const scriptPath = path.join(__dirname, 'fixtures', 'issue5.js')
    const psockPath = path.join(__dirname, '..', 'psock.js')
    const script = fork(scriptPath, {
      stdio: ['pipe', 'pipe', 'pipe', 'ipc']
    })
    const psock = spawn(
      process.argv0,
      [psockPath, '-a', address, '-p', port, '-m', 'tcp', '-ne']
    )

    script.on('close', (code, signal) => {
      process._rawDebug('!!! script close', code, signal)
      t.assert.equal(code, 1)
    })
    // script.stdout.pipe(process.stdout)
    script.stdout.pipe(psock.stdin)
    // psock.stdin.pipe(process.stdout)
    psock.stdin.pipe(
      new Transform({
        transform (chunk, enc, cb) {
          process._rawDebug('!!! psock.stdin', chunk.toString())
          cb(null, chunk)
        }
      })
    )

    let output = ''
    psock.stdin.on('data', (data) => {
      process._rawDebug('!!! psock data', data.toString())
      output += data.toString()
    })
    psock.on('close', (code, signal) => {
      process._rawDebug('!!! psock close', code, signal)
      t.assert.equal(output.length > 0, true)
      done()
    })

    script.send('doit', (error) => {
      process._rawDebug('!!! send result', error)
    })
  })
})
