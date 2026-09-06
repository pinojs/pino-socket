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
  recoveryQueueMaxSize: 1024,
  onBeforeDataWrite: null,
  maxUdpPacketSize: null
}

async function socketTransport (opts) {
  const options = Object.assign({
    sourceStream: false
  }, defaultOptions, opts)

  // Node.js' dgram module (UDP) cannot connect to unix sockets, therefore the
  // `unixsocket` option only works with TCP. To honor the user's intent,
  // setting `unixsocket` switches the mode to TCP unless TCP is already
  // selected (see issue #98).
  if (options.unixsocket && options.mode !== 'tcp') {
    options.mode = 'tcp'
  }

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
