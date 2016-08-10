'use strict'

const path = require('path')
const tcpConnectionFactory = require(path.join(__dirname, 'lib', 'TcpConnection'))
const udpConnectionFactory = require(path.join(__dirname, 'lib', 'UdpConnection'))
const split2 = require('split2')
const pump = require('pump')
const through2 = require('through2')
const nopt = require('nopt')
const fs = require('fs')

let options = {
  address: '127.0.0.1',
  mode: 'udp',
  port: '514',
  echo: true,
  cee: false,
  reconnect: false,
  reconnectTries: Infinity
}
const longOpts = {
  address: String,
  mode: ['tcp', 'udp'],
  port: Number,
  reconnect: Boolean,
  reconnectTries: Number,
  echo: Boolean,
  cee: Boolean,
  help: Boolean,
  version: Boolean
}
const shortOpts = {
  a: '--address',
  m: '--mode',
  p: '--port',
  r: '--reconnect',
  t: '--reconnectTries',
  e: '--echo',
  ne: '--no-echo',
  c: '--cee',
  nc: '--no-cee',
  h: '--help',
  v: '--version'
}
const argv = nopt(longOpts, shortOpts, process.argv)
options = Object.assign(options, argv)

if (options.help) {
  console.log(fs.readFileSync(path.join(__dirname, 'help.txt'), 'utf8'))
  process.exit(0)
}

if (options.version) {
  console.log('pino-socket', require('./package.json').version)
  process.exit(0)
}

const log = (options.echo) ? console.log : function () {}

let connection
if (options.mode === 'tcp') {
  connection = tcpConnectionFactory(options)
} else {
  connection = udpConnectionFactory(options)
}

let lastInput = 0
function shutdown () {
  // We block termination until the piped process has had a chance to shutdown.
  let _lastInput = lastInput
  lastInput = 0
  while (_lastInput !== lastInput) {
    _lastInput = lastInput
    lastInput = 0
  }
  try {
    connection.close()
  } catch (e) {
    // I assume that due to the closing of the pipe, the dgram/tcp socket has
    // some issues shutting down gracefully. Don't really care, though. So
    // this try/catch is here to suppress the resulting error.
    process.exit()
  }
}
process.on('SIGINT', function sigint () {
  shutdown()
})
process.on('SIGTERM', function sigterm () {
  shutdown()
})

const myTransport = through2.obj(function transport (chunk, enc, cb) {
  lastInput = Date.now()
  setImmediate(log.bind(null, chunk))
  setImmediate(() => connection.write(chunk))
  cb()
})

pump(process.stdin, split2(), myTransport)

process.stdin.on('close', () => { shutdown() })
