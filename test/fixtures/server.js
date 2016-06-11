'use strict'

const net = require('net')

process.on('message', (msg) => {
  if (msg.action === 'startServer') startServer(msg.address, msg.port)
})

function startServer (address, port) {
  const socket = net.createServer((connection) => {
    connection.on('data', (data) => {
      process.send({action: 'data', data})
    })
  })

  socket.listen(port || 0, address || null, () => {
    process.send({
      action: 'started',
      address: socket.address().address,
      port: socket.address().port
    })
  })
}
