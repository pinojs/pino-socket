# pino-socket
[![npm version](https://img.shields.io/npm/v/pino-socket)](https://www.npmjs.com/package/pino-socket)
[![Build Status](https://img.shields.io/github/workflow/status/pinojs/pino-socket/CI)](https://github.com/pinojs/pino-socket/actions)
[![js-standard-style](https://img.shields.io/badge/code%20style-standard-brightgreen.svg?style=flat)](https://standardjs.com/)

**Lead maintainer:** [jsumners](https://github.com/jsumners)

This module provides a "transport" for [pino][pino] that simply forwards
messages to an arbitrary socket. The socket can be UDPv4 or TCPv4. The module
can echo the received logs or work silently.

You should install `pino-socket` globally for ease of use:

```bash
$ npm install --production -g pino-socket
```

[pino]: https://www.npmjs.com/package/pino

## Usage as Pino Transport

You can use this module as a [pino transport](https://getpino.io/#/docs/transports?id=v7-transports) like so:

```js
const pino = require('pino')
const transport = pino.transport({
  target: 'pino-socket',
  options: {
    address: '10.10.10.5',
    port: 5000,
    mode: 'tcp'
  }
})
pino(transport)
```

### Options

| Name                           | Description                                                                                                                                                                                                                   |
|--------------------------------|-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `address`                      | The host address to connect to. Default: `127.0.0.1`.                                                                                                                                                                         |
| `port`                         | The host port to connect to. Default: `514`.                                                                                                                                                                                  |
| `unixsocket`                   | The unix socket path for the destination. Default: `&#8203;`.                                                                                                                                                                 |
| `mode`                         | Either `tcp` or `udp`. Default: `udp`.                                                                                                                                                                                        |
| `secure`                       | Enable secure (TLS) connection. Default: false.                                                                                                                                                                               |
| `noverify`                     | Allow connection to server with self-signed certificates. Default: false.                                                                                                                                                     |
| `reconnect`                    | Enable reconnecting to dropped TCP destinations. Default: false.                                                                                                                                                              |
| `reconnectTries`               | Number of times to attempt reconnection before giving up. Default: `Infinity`.                                                                                                                                                |
| `backoffStrategy`              | The backoff strategy to use on TCP destinations. The backoff strategy must implement the `BackoffStrategy` interface. Default: `new FibonacciStrategy()`.                                                                     |
| `recovery`                     | Enable a recovery mode when the TCP connection is lost which store data in a memory queue (FIFO) until the queue max size is reached or the TCP connection is restored. Default: `false`.                                     |
| `recoveryQueueMaxSize`         | The maximum size of items added to the queue. When reached, oldest items "First In" will be evicted to stay below this size. Default: `1024`.                                                                                 |
| `recoveryQueueSizeCalculation` | Function used to calculate the size of stored items. The item is passed as the first argument and contains a `data` (Buffer) and `encoding` (String) attribute. Default: `(item) => item.data.length + item.encoding.length`. |
| `onBeforeDataWrite`            | Function used to manipulate TCP data before being written to the socket. Operations preformed here must be synchronous. Format: `(data) => Buffer`. Default: `null`                                                           |

### Events

| Name               | Callback Signature                      | Description                                                                                                                                                              |
|--------------------|-----------------------------------------|--------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `open`             | `(address: AddressInfo) => void`        | Emitted when the TCP or UDP connection is established.                                                                                                                   |
| `socketError`      | `(error: Error) => void`                | Emitted when an error occurs on the TCP or UDP socket. The socket won't be closed.                                                                                       |
| `socketClose`      | `(error: Error&#124;null) => void`      | Emitted after the TCP socket is closed. The argument `error` is defined if the socket was closed due to a transmission error.                                            |
| `close`            | `(hadError: Boolean) => void`           | Emitted after the TCP or UDP socket is closed and won't reconnect. The argument `hadError` is a boolean which says if the socket was closed due to a transmission error. |
| `reconnectFailure` | `(error: Error&#124;undefined) => void` | Emitted when the maximum number of backoffs (i.e., reconnect tries) is reached on a TCP connection.                                                                      |

**IMPORTANT:** In version prior to 6.0, an `error` event was emitted on the writable stream when an error occurs on the TCP or UDP socket.
In other words, it was not possible to write data to the writable stream after an error occurs on the TCP or UDP socket.
If you want to restore the previous behavior you can do:

```js
transport.on('socketError', () => {
  transport.end()
})
```

Alternatively, you can propagate the socket error using:

```js
transport.on('socketError', (err) => {
  transport.emit('error', err)
})
```

In this case, make sure that you are listening to the `error` event otherwise you will get an `Uncaught Error`.

## Usage as Pino Legacy Transport

Pino supports a [legacy transport interface](https://getpino.io/#/docs/transports?id=legacy-transports)
that is still supported by this module.
Given an application `foo` that logs via [pino][pino], and a system that
collects logs on port UDP `5000` on IP `10.10.10.5`, you would use `pino-socket`
like so:

```bash
$ node foo | pino-socket -a 10.10.10.5 -p 5000
```
OR
```bash
$ node foo | pino-socket -u /tmp/unix.sock
```

### CLI Options

+ `--settings` (`-s`): read settings from a JSON file (switches take precedence).
+ `--unixsocket` (`-u`): the unix socket path for the destination. Default: `&#8203;`.
+ `--address` (`-a`): the address for the destination socket. Default: `127.0.0.1`.
+ `--port` (`-p`): the port for the destination socket. Default: `514`.
+ `--mode` (`-m`): either `tcp` or `udp`. Default: `udp`.
+ `--secure` (`-tls`): enable secure (TLS) connection for TCP (only works with `--mode=tcp`).
+ `--noverify` (`-nv`): allow connection to server with self-signed certificates (only works with `--secure`).
+ `--reconnect` (`-r`): enable reconnecting to dropped TCP destinations. Default: off.
+ `--reconnectTries <n>` (`-t <n>`): set number (`<n>`) of reconnect attempts before giving up. Default: infinite.
+ `--echo` (`-e`): echo the received messages to stdout. Default: enabled.
+ `--no-echo` (`-ne`): disable echoing received messages to stdout.
+ `--recovery`: enable recovery mode for TCP (only works with `--mode=tcp`). Default: off.
+ `--recovery-queue-max-size <n>`: maximum size of items (`<n>`) added to the recovery queue. Default: 1024.

[rsyscee]: http://www.rsyslog.com/doc/mmjsonparse.html

#### Settings JSON File

The `--settings` switch can be used to specify a JSON file that contains
a hash of settings for the application. A full settings file is:

```json
{
  "address": "127.0.0.1",
  "port": 514,
  "mode": "tcp",
  "secure": false,
  "noverify": false,
  "reconnect": true,
  "reconnectTries": 20,
  "echo": false
}
```

Note that command line switches take precedence over settings in a settings
file. For example, given the settings file:

```json
{
  "address": "10.0.0.5",
  "port": 514
}
```

And the command line:

```bash
$ yes | pino-socket -s ./settings.json -p 1514
```

The connection will be made to address `10.0.0.5` on UDP port `1514`.

## License

[MIT License](http://jsumners.mit-license.org/)
