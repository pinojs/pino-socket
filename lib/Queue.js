'use strict'

const { emitWarning } = require('process')

/**
 * @typedef {object} QueueOptions
 * @prop {number} [maxSize] Positive integer to track the sizes of items added to the cache, and automatically evict items in order to stay below this size. Default: `Infinity`
 * @prop {(any) => number?} [sizeCalculation] Function used to calculate the size of stored items. Default: `item => item.length`.
 */

/**
 * A linear data structure of a FIFO (First In - First Out) type.
 *
 * Inspired by:
 * - https://vhudyma-blog.eu/implement-queue-in-javascript/
 * - https://github.com/isaacs/node-lru-cache
 */
module.exports = class Queue {
  /**
   * @param {QueueOptions} opts
   */
  constructor (opts) {
    // The actual queue
    this.items = {}
    // The index of the head item
    this.head = 0
    // The index of the tail item
    this.tail = 0
    this.calculatedSize = 0
    this.sizes = {}
    this.opts = {
      maxSize: Infinity,
      sizeCalculation: (item) => item.length,
      ...opts
    }
  }

  enqueue (item) {
    const index = this.tail
    const size = this.opts.sizeCalculation(item)
    if (size > this.opts.maxSize) {
      emitWarning(`unable to enqueue item because item size ${size} is greater than maxSize ${this.opts.maxSize}`)
      return
    }
    this.sizes[index] = size
    const maxSize = this.opts.maxSize - size
    while (this.calculatedSize > maxSize) {
      this.evict()
    }
    this.calculatedSize += size
    // Add an item on the current tail index
    this.items[index] = item
    // Increase the index of the tail item
    // So the next items are added at the end
    this.tail++
  }

  evict () {
    // If the queue is empty
    if (this.tail === this.head) {
      return undefined
    }
    const index = this.head
    this.calculatedSize -= this.sizes[index]
    delete this.sizes[index]
    this.dequeue()
  }

  dequeue () {
    const item = this.peek()
    if (item === undefined) {
      return item
    }
    // Delete it
    delete this.items[this.head]
    // Increase the head index
    this.head++
    // Return the item
    return item
  }

  peek () {
    // If the queue is empty, return "undefined"
    if (this.tail === this.head) {
      return undefined
    }
    // Pick an item
    return this.items[this.head]
  }

  size () {
    return Object.keys(this.items).length
  }

  isEmpty () {
    return this.size() === 0
  }
}
