# pino-socket

This module provides a "transport" for [pino][pino] that simply forwards
messages to an arbitrary socket. The socket can be UDPv4 or TCPv4. The module
can echo the received logs or work silently.

You should install `pino-socket` globally for ease of use:

```bash
$ npm install --production -g pino-socket
```

[pino]: https://www.npmjs.com/package/pino

## Usage

Given an application `foo` that logs via [pino][pino], and a system that
collects logs on port UDP `5000` on IP `10.10.10.5`, you would use `pino-socket`
like so:

```bash
$ node foo | pino-socket -a 10.10.10.5 -p 5000
```

## Options

+ `--address` (`-a`): the address for the destination socket. Default: `127.0.0.1`.
+ `--mode` (`-m`): either `tcp` or `udp`. Default: `udp`.
+ `--port` (`-p`): the port for the destination socket. Default: `514`.
+ `--echo` (`-e`): echo the received messages to stdout. Default: enabled.
+ `--no-echo` (`-ne`): disable echoing received messages to stdout.

## License

[MIT License](http://jsumners.mit-license.org/)
