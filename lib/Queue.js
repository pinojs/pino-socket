'use strict'

const { emitWarning } = require('process')

/**
 * @typedef {object} QueueOptions
 * @prop {number} [maxSize] Positive integer to track the sizes of items added to the cache, and automatically evict items in order to stay below this size. Default: `Infinity`
 * @prop {(any) => number?} [sizeCalculation] Function used to calculate the size of stored elements. Default: `element => element.length`.
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
    this.elements = {}
    // The index of the head element
    this.head = 0
    // The index of the tail element
    this.tail = 0
    this.calculatedSize = 0
    this.sizes = {}
    this.opts = {
      maxSize: Infinity,
      sizeCalculation: (element) => element.length,
      ...opts
    }
  }

  enqueue (element) {
    const index = this.tail
    const size = this.opts.sizeCalculation(element)
    if (size > this.opts.maxSize) {
      emitWarning(`Unable to enqueue element because element size ${size} is greater than maxSize ${this.opts.maxSize}`)
      return
    }
    this.sizes[index] = size
    const maxSize = this.opts.maxSize - size
    while (this.calculatedSize > maxSize) {
      this.evict()
    }
    this.calculatedSize += size
    // Add an element on the current tail index
    this.elements[index] = element
    // Increase the index of the tail element
    // So the next elements are added at the end
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
    const element = this.peek()
    if (element === undefined) {
      return element
    }
    // Delete it
    delete this.elements[this.head]
    // Increase the head index
    this.head++
    // Return the element
    return element
  }

  peek () {
    // If the queue is empty, return "undefined"
    if (this.tail === this.head) {
      return undefined
    }
    // Pick an element
    return this.elements[this.head]
  }

  size () {
    return Object.keys(this.elements).length
  }

  isEmpty () {
    return this.size() === 0
  }
}
