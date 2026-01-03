'use strict'

const pino = require('pino')()
pino.info('hello world')
setTimeout(() => { throw new Error('uncaught') }, 20)
