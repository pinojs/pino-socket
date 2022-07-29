'use strict'
/* eslint-env node, mocha */

const TcpConnection = require('../lib/TcpConnection')
const { expect } = require('chai')
const net = require('net')

function startServer ({ address, port, next }) {
  const socket = net.createServer((connection) => {
    connection.on('data', (data) => {
      next({ action: 'data', data })
      connection.destroy()
    })
  })

  socket.listen(port || 0, address || '127.0.0.1', () => {
    next({
      action: 'started',
      address: socket.address().address,
      port: socket.address().port
    })
  })

  return socket
}

test('recovery', function (done) {
  let address
  let port
  let tcpConnection
  let counter = 0
  let firstServerClosing = false
  let secondServerClosing = false
  const received = []

  function sendData () {
    setInterval(() => {
      counter++
      tcpConnection.write(`log${counter}\n`, 'utf8', () => { /* ignore */ })
    }, 100)
  }

  function startSecondServer () {
    const secondServer = startServer({
      address,
      port,
      next: (msg) => {
        switch (msg.action) {
          case 'data':
            received.push(msg)
            if (received.length > 5 && !secondServerClosing) {
              secondServerClosing = true
              secondServer.close(() => {
                try {
                  const logs = received
                    .map(it => it.data.toString('utf8'))
                    .reduce((previousValue, currentValue) => previousValue + currentValue)
                    .split('\n')
                    .filter(it => it !== '')
                  const logNumbers = logs.map(it => parseInt(it.replace('log', '')))
                  expect(logs.length).to.eq(logNumbers[logNumbers.length - 1])
                  // make sure that no number is missing
                  expect(logNumbers).to.deep.eq(Array.from({ length: logNumbers.length }, (_, i) => i + 1))
                } finally {
                  tcpConnection.end(() => {
                    done()
                  })
                }
              })
            }
            break
        }
      }
    })
  }

  const firstServer = startServer({
    next: (msg) => {
      switch (msg.action) {
        case 'started':
          address = msg.address
          port = msg.port
          tcpConnection = TcpConnection({
            address,
            port,
            reconnect: true,
            recovery: true
          })
          sendData()
          break
        case 'data':
          received.push(msg)
          // receive one message and close the server
          if (!firstServerClosing) {
            firstServerClosing = true
            firstServer.close(() => {
              // start the second server with a delay to purposely miss writes (which are executed every 100ms)
              setTimeout(startSecondServer, 150)
            })
            break
          }
      }
    }
  })
})
