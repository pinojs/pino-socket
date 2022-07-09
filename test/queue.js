'use strict'
/* eslint-env node, mocha */

const Queue = require('../lib/Queue')
const { expect } = require('chai')

suite('Queue')

test('#enqueue elements', function () {
  const q = new Queue()
  q.enqueue('1')
  q.enqueue('2')
  q.enqueue('3')
  q.enqueue('4')
  expect(q.size()).to.eq(4)
  expect(q.dequeue()).to.eq('1')
  expect(q.dequeue()).to.eq('2')
  expect(q.dequeue()).to.eq('3')
  expect(q.size()).to.eq(1)
  expect(q.dequeue()).to.eq('4')
  expect(q.size()).to.eq(0)
  expect(q.dequeue()).to.eq(undefined) // empty
  expect(q.size()).to.eq(0)
})

test('#dequeue non empty queue', function () {
  const q = new Queue()
  q.enqueue('1')
  expect(q.dequeue()).to.eq('1')
  q.enqueue('2')
  expect(q.dequeue()).to.eq('2')
  expect(q.dequeue()).to.eq(undefined) // empty
  expect(q.size()).to.eq(0)
})

test('#dequeue empty queue', function () {
  const q = new Queue()
  expect(q.dequeue()).to.eq(undefined) // empty
})

test('#enqueue with max size should evict first in (same size)', function () {
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
  expect(q.size()).to.eq(6)
  expect(q.dequeue()).to.eq('bc')
})

test('#enqueue with max size should evict first in (different size)', function () {
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
  expect(q.size()).to.eq(6)
  expect(q.dequeue()).to.eq('de')
})

test('#enqueue with max size should evict until the total size is below max size', function () {
  const q = new Queue({
    maxSize: 10
  })
  q.enqueue('a')
  q.enqueue('b')
  q.enqueue('c')
  q.enqueue('def')
  q.enqueue('ghi')
  q.enqueue('klmno') // exceed max size, will dequeue 'a', 'b', 'c' and 'def' to make space
  expect(q.size()).to.eq(2)
  expect(q.dequeue()).to.eq('ghi')
})

test('#enqueue an element that exceeds max size', function (done) {
  const q = new Queue({
    maxSize: 2
  })
  process.on('warning', (event) => {
    expect(event.message).to.eq('Unable to enqueue element because element size 3 is greater than maxSize 2')
    done()
  })
  q.enqueue('abc') // should emit a warning
  expect(q.size()).to.eq(0)
  expect(q.dequeue()).to.eq(undefined)
})
