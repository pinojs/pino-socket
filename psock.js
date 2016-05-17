'use strict';

const net = require('net');
const dgram = require('dgram');
const split2 = require('split2');
const pump = require('pump');
const through2 = require('through2');
const nopt = require('nopt');

let options = {
  address: '127.0.0.1',
  mode: 'udp',
  port: '514',
  echo: true
};
const argv = nopt(
  {address: String, mode: ['tcp', 'udp'], port: Number, echo: Boolean},
  {a: '--address', m: '--mode', p: '--port', e: '--echo', ne: '--no-echo'},
  process.argv
);
options = Object.assign(options, argv);

/* eslint func-names: "off" */
/* eslint space-before-function-paren: "off" */
/* eslint no-empty-function: "off" */
/* eslint space-before-blocks: "off" */
const log = (options.echo) ? console.log : function(){};

let socket;
let send;
let close;
if (options.mode === 'tcp') {
  socket = net.createConnection({
    host: options.address,
    port: options.port
  });
  send = (message) => {
    socket.write(message + '\n');
  };
  close = socket.end;
} else {
  socket = dgram.createSocket('udp4');
  send = (message) => {
    const buf = new Buffer(message + '\n');
    socket.send(
      buf,
      0,
      buf.length,
      options.port,
      options.address
    );
  };
  close = socket.close;
}

let lastInput = 0;
function shutdown() {
  // We block termination until the piped process has had a chance to shutdown.
  let _lastInput = lastInput;
  lastInput = 0;
  while (_lastInput !== lastInput) {
    _lastInput = lastInput;
    lastInput = 0;
  }
  try {
    close();
  } catch (e) {
    // I assume that due to the closing of the pipe, the dgram/tcp socket has
    // some issues shutting down gracefully. Don't really care, though. So
    // this try/catch is here to suppress the resulting error.
    process.exit();
  }
}
process.on('SIGINT', function sigint() {
  shutdown();
});
process.on('SIGTERM', function sigterm() {
  shutdown();
});

const myTransport = through2.obj(function transport(chunk, enc, cb) {
  lastInput = Date.now();
  log(chunk);
  send(chunk);
  cb();
});

pump(process.stdin, split2(), myTransport);
