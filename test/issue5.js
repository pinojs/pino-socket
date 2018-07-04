'use strict'
/* eslint-env node, mocha */

const net = require('net')
const path = require('path')
const spawn = require('child_process').spawn
const expect = require('chai').expect

test('issue #5', function (done) {
  const server = net.createServer()
  server.unref()
  server.listen(() => {
    const scriptPath = path.join(__dirname, 'fixtures', 'issue5.js')
    const script = spawn('node', [ scriptPath ])
    const psockPath = path.join(__dirname, '..', 'psock.js')
    const psock = spawn('node', [ psockPath, '-a', server.address().address, '-p', server.address().port, '-m', 'tcp', '-ne' ])

    let output = ''
    script.stdout.pipe(psock.stdin)
    psock.stdin.on('data', (data) => { output += data.toString() })
    psock.stdout.on('close', () => {
      expect(output.length > 0)
      done()
    })
  })
})
