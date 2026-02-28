'use strict'

const test = require('node:test')
const net = require('node:net')
const path = require('node:path')
const { spawn } = require('node:child_process')
const { withResolvers } = require('./utils')

test('issue #5', async function (t) {
  t.plan(2)
  const {
    promise: scriptPromise,
    resolve: scriptResolve
  } = withResolvers()
  const {
    promise: psockPromise,
    resolve: psockResolve
  } = withResolvers()

  const server = net.createServer()
  server.unref()
  server.listen(() => {
    const { address, port } = server.address()
    const scriptPath = path.join(__dirname, 'fixtures', 'issue5.js')
    const script = spawn('node', [scriptPath], { stdio: ['pipe', 'pipe', 'pipe', 'ipc'] })
    script.send('start')
    const psockPath = path.join(__dirname, '..', 'psock.js')
    const psock = spawn('node', [psockPath, '-a', address, '-p', port, '-m', 'tcp', '-e'])

    script.on('close', (code) => {
      t.assert.equal(code, 1)
      scriptResolve()
    })

    let output = ''
    script.stdout.pipe(psock.stdin)
    psock.stdout.on('data', chunk => {
      output += chunk.toString()
    })
    psock.on('close', () => {
      t.assert.strictEqual(output.length > 0, true)
      psockResolve()
    })
  })

  await Promise.all([scriptPromise, psockPromise])
})
