'use strict'

const dgram = require('dgram')
const net = require('net')

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
      if (err) {
        return reject(err)
      }
      return resolve(socket)
    })
  })
}

module.exports = {
  createTcpListener,
  createUdpListener
}
