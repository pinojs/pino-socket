'use strict'

const pino = require('pino')
const log = pino({ level: 'debug' })

log.debug({ foo: 'bar' })
