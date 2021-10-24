'use strict'

const dgram = require('dgram')
const path = require('path')
const net = require('net')
const tls = require('tls')
const fs = require('fs')

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

module.exports = {
  createSecureTcpListener,
  createTcpListener,
  createUdpListener
}
