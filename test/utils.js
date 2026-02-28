'use strict'

const dgram = require('node:dgram')
const path = require('node:path')
const net = require('node:net')
const tls = require('node:tls')
const fs = require('node:fs')

function createUdpListener (msgHandler) {
  return new Promise((resolve) => {
    const socket = dgram.createSocket('udp4')
    socket.on('message', (msg) => msgHandler(msg.toString()))
    socket.on('error', (err) => console.log(`socket error: ${err.message}`))
    socket.bind({ address: '127.0.0.1' }, () => resolve(socket))
  })
}

function createTcpListener (msgHandler) {
  return new Promise((resolve, reject) => {
    const socket = net.createServer((connection) => {
      connection.on('data', (data) => {
        msgHandler(data.toString())
      })
    })

    socket.listen(0, '127.0.0.1', (err) => {
      err ? reject(err) : resolve(socket)
    })
  })
}

function createSecureTcpListener (msgHandler) {
  return new Promise((resolve, reject) => {
    const socket = tls.createServer({
      key: fs.readFileSync(path.resolve(__dirname, 'certs/server.key')),
      cert: fs.readFileSync(path.resolve(__dirname, 'certs/server.crt'))
    }, (connection) => {
      connection.on('data', (data) => {
        msgHandler(data.toString())
      })
    })

    socket.listen(0, '127.0.0.1', (err) => {
      err ? reject(err) : resolve(socket)
    })
  })
}

function withResolvers () {
  let _resolve
  let _reject
  const promise = new Promise((resolve, reject) => {
    _resolve = resolve
    _reject = reject
  })
  return { promise, resolve: _resolve, reject: _reject }
}

module.exports = {
  createSecureTcpListener,
  createTcpListener,
  createUdpListener,
  withResolvers
}
