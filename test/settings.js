'use strict'
/* eslint-env node, mocha */

const net = require('net')
const spawn = require('child_process').spawn
const expect = require('chai').expect

test('loads settings from a file (switches take precedence)', function (done) {
  let messages = []
  const server = net.createServer((connection) => {
    connection.on('data', (data) => {
      const lines = data.toString().split('\n').filter((l) => l !== '\n' && l !== '')
      messages = messages.concat(lines)
    })
  })

  server.listen(0, '127.0.0.1', () => {
    const address = server.address().address
    const port = server.address().port
    const psock = spawn(
      'node',
      [`${__dirname}/../psock.js`, '-a', address, '-p', port, '-s', `${__dirname}/fixtures/config.json`]
    )

    setTimeout(() => {
      psock.stdin.write('log 1\n')
    }, 50)
    setTimeout(() => {
      psock.stdin.write('log 2\n')
    }, 100)
    setTimeout(finished, 150)

    function finished (err) {
      if (err) return done(err)
      expect(messages.length).to.equal(2)
      psock.kill()
      server.close()
      server.unref()
      done()
    }
  })
})
