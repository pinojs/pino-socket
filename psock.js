#!/usr/bin/env node
'use strict'

const path = require('path')
const tcpConnectionFactory = require('./lib/TcpConnection')
const udpConnectionFactory = require('./lib/UdpConnection')
const transport = require('./lib/pino-transport')
const split2 = require('split2')
const pump = require('pump')
const through2 = require('through2')
const nopt = require('nopt')
const fs = require('fs')

module.exports = transport

if (require.main === module) {
  // used as cli
  cli()
}

function cli () {
  const longOpts = {
    unixsocket: String,
    address: String,
    port: Number,
    mode: ['tcp', 'udp'],
    secure: Boolean,
    noverify: Boolean,
    reconnect: Boolean,
    reconnectTries: Number,
    echo: Boolean,
    help: Boolean,
    version: Boolean,
    settings: String,
    recovery: Boolean,
    'recovery-queue-max-size': Number,
    'max-udp-packet-size': Number
  }
  const shortOpts = {
    u: '--unixsocket',
    a: '--address',
    p: '--port',
    m: '--mode',
    tls: '--secure',
    nv: '--noverify',
    r: '--reconnect',
    t: '--reconnectTries',
    e: '--echo',
    ne: '--no-echo',
    h: '--help',
    v: '--version',
    s: '--settings'
  }
  const argv = nopt(longOpts, shortOpts, process.argv)
  let options = Object.assign({}, transport.defaultOptions, argv)

  if (options.help) {
    console.log(fs.readFileSync(path.join(__dirname, 'help.txt'), 'utf8'))
    process.exit(0)
  }

  if (options.version) {
    console.log('pino-socket', require('./package.json').version)
    process.exit(0)
  }

  if (options.settings) {
    try {
      const loadedSettings = require(path.resolve(options.settings))
      const settings = Object.assign(loadedSettings, argv)
      options = Object.assign(options, settings)
    } catch (e) {
      console.error('`settings` parameter specified but could not load file: %s', e.message)
      process.exit(1)
    }
  }

  let connection
  if (options.mode === 'tcp') {
    connection = tcpConnectionFactory(options)
  } else {
    connection = udpConnectionFactory(options)
  }

  connection.on('socketError', (err) => console.error(err.message))

  function shutdown () {
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
    setImmediate(() => console.log(chunk))
    cb()
  })

  process.stdin.on('close', () => { shutdown() })
  if (options.echo) pump(process.stdin, split2(), myTransport)
}
