import assert from 'node:assert/strict'

import { getRestoredWindowPosition } from '../electron/windowState.ts'

const displays = [
  { x: 0, y: 0, width: 1920, height: 1080 },
  { x: 1920, y: 0, width: 1920, height: 1080 },
]

assert.deepEqual(
  getRestoredWindowPosition({ x: 120, y: 240 }, displays),
  { x: 120, y: 240 },
)

assert.deepEqual(
  getRestoredWindowPosition({ x: 2000, y: 200 }, displays),
  { x: 2000, y: 200 },
)

assert.equal(getRestoredWindowPosition({ x: -5000, y: 0 }, displays), undefined)
assert.equal(getRestoredWindowPosition({ x: 0 }, displays), undefined)
assert.equal(getRestoredWindowPosition(undefined, displays), undefined)

console.log('windowState.test.ts passed')
