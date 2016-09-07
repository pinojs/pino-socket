### 1.0.0
+ Load settings from a json file. See the [settings test](test/settings.js)
  for an example.
+ Remove CEE support (use `pino-syslog` instead)
+ Add support for dealing with TCP back pressure. See [issue 4][i4].

[i4]: https://github.com/jsumners/pino-socket/issues/4

### 0.4.1
+ Shutdown when `stdin` closes (issue #5)

### 0.4.0
+ Add support for reconnecting to dropped TCP destinations (issue #3)
  + `--reconnect` (`-r`) to enable
  + `--reconnectTries <n>` (`-t <n>`) to set the number of retries
    before giving up (default: infinite)

### 0.3.0
+ Add cli help output via `--help` (@mcollina)
+ Add a Contributing.md file

### 0.2.0
+ Correct documentation
+ Switch to [standardjs.com][sjs] code style
+ Add `--cee` switch to prefix sent messages with `@cee: `
+ Ensure local echo and socket sends are asynchronous

[sjs]: http://standardjs.com/
