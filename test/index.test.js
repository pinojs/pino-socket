'use strict'

const { after, test } = require('node:test')
const path = require('node:path')
const { spawn } = require('node:child_process')
const { createTcpListener, createUdpListener, withResolvers } = require('./utils')

// We need this `after` nonsense because no amount of removing listeners
// or sending termination signals will stop the child processes.
// The issue must be https://github.com/nodejs/node/issues/32291.
after(() => setImmediate(process.exit))

test('tcp send', async (t) => {
  t.plan(2)

  const { promise, resolve } = withResolvers()
  const socket = await createTcpListener(handler)
  const { address, port } = socket.address()
  const logit = spawn(process.argv0, [path.join(__dirname, '/fixtures/logit.js')])
  const psock = spawn(
    process.argv0,
    [path.join(__dirname, '/../psock.js'), '-a', address, '-p', port, '-m', 'tcp']
  )
  logit.stdout.on('data', (data) => psock.stdin.write(data))
  logit.stderr.on('data', (data) => console.log(`logit err: ${data}`))
  psock.stderr.on('data', (data) => console.log(`psock err: ${data}`))

  await promise

  function handler (msg) {
    t.assert.equal(msg.includes('"foo":"bar"'), true)
    t.assert.equal(msg.slice(-1), '\n')
    resolve()
  }
})

test('udp send', async (t) => {
  t.plan(2)

  const { promise, resolve } = withResolvers()
  const socket = await createUdpListener(handler)
  const { address, port } = socket.address()
  const logit = spawn(process.argv0, [path.join(__dirname, '/fixtures/logit.js')])
  const psock = spawn(
    process.argv0,
    [path.join(__dirname, '/../psock.js'), '-a', address, '-p', port]
  )
  logit.stdout.on('data', (data) => psock.stdin.write(data))
  logit.stderr.on('data', (data) => console.log(`logit err: ${data}`))
  psock.stderr.on('data', (data) => console.log(`psock err: ${data}`))

  await promise

  function handler (msg) {
    t.assert.equal(msg.includes('"foo":"bar"'), true)
    t.assert.equal(msg.slice(-1), '\n')
    resolve()
  }
})
