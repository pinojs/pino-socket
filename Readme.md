# pino-socket

**Lead maintainer:** [jsumners](https://github.com/jsumners)

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
OR
```bash
$ node foo | pino-socket -u /tmp/unix.sock
```

## Options

+ `--settings` (`-s`): read settings from a JSON file (switches take precedence)
+ `--unixsocket` (`-u`): the unix socket path for the destination. Default: ``.
+ `--address` (`-a`): the address for the destination socket. Default: `127.0.0.1`.
+ `--mode` (`-m`): either `tcp` or `udp`. Default: `udp`.
+ `--port` (`-p`): the port for the destination socket. Default: `514`.
+ `--reconnect` (`-r`): enable reconnecting to dropped TCP destinations. Default: off
+ `--reconnectTries <n>` (`-t <n>`): set number (`<n>`) of reconnect attempts
  before giving up. Default: infinite
+ `--echo` (`-e`): echo the received messages to stdout. Default: enabled.
+ `--no-echo` (`-ne`): disable echoing received messages to stdout.

[rsyscee]: http://www.rsyslog.com/doc/mmjsonparse.html

### Settings JSON File

The `--settings` switch can be used to specify a JSON file that contains
a hash of settings for the the application. A full settings file is:

```json
{
  "address": "127.0.0.1",
  "port": 514,
  "mode": "tcp",
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
