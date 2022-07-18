'use strict'

const tcpConnectionFactory = require('./TcpConnection')
const udpConnectionFactory = require('./UdpConnection')
const { once } = require('events')

const defaultOptions = {
  unixsocket: '',
  address: '127.0.0.1',
  mode: 'udp',
  port: '514',
  echo: true,
  secure: false,
  noverify: false,
  reconnect: false,
  reconnectTries: Infinity,
  settings: null,
  recovery: false,
  recoveryQueueMaxSize: 1024
}

async function socketTransport (opts) {
  const options = Object.assign({
    sourceStream: false
  }, defaultOptions, opts)

  let connection
  if (options.mode === 'tcp') {
    connection = tcpConnectionFactory(options)
  } else {
    connection = udpConnectionFactory(options)
  }

  await once(connection, 'open')

  return connection
}

module.exports = socketTransport
module.exports.defaultOptions = defaultOptions
