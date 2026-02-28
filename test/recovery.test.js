'use strict'

const test = require('node:test')
const net = require('node:net')
const TcpConnection = require('../lib/TcpConnection')

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

test('recovery', function (t, done) {
  t.plan(2)

  let address
  let port
  let tcpConnection
  let counter = 0
  let firstServerClosing = false
  let secondServerClosing = false
  let dataSendInt
  const received = []

  function sendData () {
    dataSendInt = setInterval(() => {
      counter++
      tcpConnection.write(`log${counter}\n`, 'utf8', () => {})
    }, 100)
  }

  function startSecondServer () {
    const secondServer = startServer({
      address,
      port,
      next: (msg) => {
        switch (msg.action) {
          case 'data': {
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
                  t.assert.equal(logs.length, logNumbers[logNumbers.length - 1])
                  // make sure that no number is missing
                  t.assert.deepEqual(logNumbers, Array.from({ length: logNumbers.length }, (_, i) => i + 1))
                } finally {
                  clearInterval(dataSendInt)
                  tcpConnection.destroy(null, () => {
                    done()
                    // There's no reason we should have to do this, but all of
                    // our efforts to terminate the resources created during
                    // this test fail. 🤷‍♂️
                    setImmediate(() => { process.exit(0) })
                  })
                }
              })
            }
            break
          }
        }
      }
    })

    secondServer.unref()
  }

  const firstServer = startServer({
    next: (msg) => {
      switch (msg.action) {
        case 'started': {
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
        }

        case 'data': {
          received.push(msg)
          // receive one message and close the server
          if (!firstServerClosing) {
            firstServerClosing = true
            firstServer.close(() => {
              // start the second server with a delay to purposely miss
              // writes (which are executed every 100ms)
              setTimeout(startSecondServer, 150)
            })
            break
          }
        }
      }
    }
  })

  firstServer.unref()
})
