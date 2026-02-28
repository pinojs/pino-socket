'use strict'

const test = require('node:test')
const Queue = require('../lib/Queue')

test('#enqueue items', function (t) {
  const q = new Queue()
  q.enqueue('1')
  q.enqueue('2')
  q.enqueue('3')
  q.enqueue('4')
  t.assert.equal(q.size(), 4)
  t.assert.equal(q.dequeue(), '1')
  t.assert.equal(q.dequeue(), '2')
  t.assert.equal(q.dequeue(), '3')
  t.assert.equal(q.size(), 1)
  t.assert.equal(q.dequeue(), '4')
  t.assert.equal(q.size(), 0)
  t.assert.equal(q.dequeue(), undefined) // empty
  t.assert.equal(q.size(), 0)
})

test('#dequeue non empty queue', function (t) {
  const q = new Queue()
  q.enqueue('1')
  t.assert.equal(q.dequeue(), '1')
  q.enqueue('2')
  t.assert.equal(q.dequeue(), '2')
  t.assert.equal(q.dequeue(), undefined) // empty
  t.assert.equal(q.size(), 0)
})

test('#dequeue empty queue', function (t) {
  const q = new Queue()
  t.assert.equal(q.dequeue(), undefined) // empty
})

test('#enqueue with max size should evict first in (same size)', function (t) {
  const q = new Queue({
    maxSize: 10
  })
  q.enqueue('a')
  q.enqueue('bc')
  q.enqueue('de')
  q.enqueue('f')
  q.enqueue('g')
  q.enqueue('hij')
  q.enqueue('k') // exceed max size, will dequeue 'a' to make space
  t.assert.equal(q.size(), 6)
  t.assert.equal(q.dequeue(), 'bc')
})

test('#enqueue with max size should evict first in (different size)', function (t) {
  const q = new Queue({
    maxSize: 10
  })
  q.enqueue('abc')
  q.enqueue('de')
  q.enqueue('f')
  q.enqueue('ghi')
  q.enqueue('j')
  q.enqueue('k')
  q.enqueue('l') // exceed max size, will dequeue 'abc' to make space
  t.assert.equal(q.size(), 6)
  t.assert.equal(q.dequeue(), 'de')
})

test('#enqueue with max size should evict until the total size is below max size', function (t) {
  const q = new Queue({
    maxSize: 10
  })
  q.enqueue('a')
  q.enqueue('b')
  q.enqueue('c')
  q.enqueue('def')
  q.enqueue('ghi')
  q.enqueue('klmno') // exceed max size, will dequeue 'a', 'b', 'c' and 'def' to make space
  t.assert.equal(q.size(), 2)
  t.assert.equal(q.dequeue(), 'ghi')
})

test('#enqueue an item that exceeds max size', function (t, done) {
  t.plan(3)
  const q = new Queue({
    maxSize: 2
  })
  process.on('warning', (event) => {
    t.assert.equal(event.message, 'unable to enqueue item because item size 3 is greater than maxSize 2')
    done()
  })
  q.enqueue('abc') // should emit a warning
  t.assert.equal(q.size(), 0)
  t.assert.equal(q.dequeue(), undefined)
})
