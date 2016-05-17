# pino-socket

This module provides a "transport" for [pino][pino] that simply forwards
messages to an arbitrary socket. The socket can be UDPv4 or TCPv4. The module
can echo the received logs or work silently.

[pino]: https://www.npmjs.com/package/pino

## Options

+ `--address` (`-a`): the address for the destination socket. Default: `127.0.0.1`.
+ `--mode` (`-m`): either `tcp` or `udp`. Default: `udp`.
+ `--port` (`-p`): the port for the destination socket. Default: `514`.
+ `--echo` (`-e`): echo the received messages to stdout. Default: enabled.
+ `--no-echo` (`-ne`): disable echoing received messages to stdout.

## License

[MIT License](http://jsumners.mit-license.org/)
