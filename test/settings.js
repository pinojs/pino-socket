'use strict'
/* eslint-env node, mocha */

const net = require('net')
const path = require('path')
const spawn = require('child_process').spawn
const expect = require('chai').expect

test('loads settings from a file (switches take precedence)', function (done) {
  const server = net.createServer((connection) => {
    connection.once('data', (data) => {
      expect(data + '').to.equal('log 1\n')
      finished()
    })
  })

  function finished () {
    server.close()
    server.unref()
    done()
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
