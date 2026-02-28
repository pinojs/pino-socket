'use strict'

const test = require('node:test')
const net = require('node:net')
const path = require('node:path')
const spawn = require('node:child_process').spawn

test('loads settings from a file (switches take precedence)', function (t, done) {
  t.plan(1)

  const server = net.createServer((connection) => {
    connection.once('data', (data) => {
      t.assert.equal(data + '', 'log 1\n')
      finished()
    })
  })

  function finished () {
    server.close()
    server.unref()
    done()
    // There's no reason we should have to do this, but all of
    // our efforts to terminate the resources created during
    // this test fail. 🤷‍♂️
    setImmediate(() => { process.exit(0) })
  }
  server.listen(0, '127.0.0.1', () => {
    const address = server.address().address
    const port = server.address().port
    const psock = spawn(
      'node',
      [path.join(__dirname, '/../psock.js'), '-a', address, '-p', port, '-s', path.join(__dirname, '/fixtures/config.json')]
    )
    psock.unref()
    setTimeout(() => {
      psock.stdin.write('log 1\n')
    }, 50)
  })
})
