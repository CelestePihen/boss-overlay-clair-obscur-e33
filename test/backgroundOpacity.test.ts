import assert from 'node:assert/strict'

import {
  DEFAULT_BACKGROUND_OPACITY,
  getBackgroundColor,
  getOverlayTheme,
  normalizeBackgroundOpacity,
} from '../src/utils/backgroundOpacity.ts'

assert.equal(normalizeBackgroundOpacity(undefined), DEFAULT_BACKGROUND_OPACITY)
assert.equal(normalizeBackgroundOpacity('72'), 72)
assert.equal(normalizeBackgroundOpacity(72.6), 73)
assert.equal(normalizeBackgroundOpacity(-10), 0)
assert.equal(normalizeBackgroundOpacity(150), 100)
assert.equal(getBackgroundColor(85), 'rgba(0, 0, 0, 0.85)')
assert.equal(getBackgroundColor(0), 'rgba(0, 0, 0, 0)')

const lowOpacityTheme = getOverlayTheme(20)
const highOpacityTheme = getOverlayTheme(95)
assert.equal(lowOpacityTheme.backgroundColor, 'rgba(0, 0, 0, 0.2)')
assert.equal(highOpacityTheme.backgroundColor, 'rgba(0, 0, 0, 0.95)')
assert.notEqual(
  lowOpacityTheme.cssVariables['--text-primary'],
  highOpacityTheme.cssVariables['--text-primary'],
)
assert.notEqual(
  lowOpacityTheme.cssVariables['--killed-item-opacity'],
  highOpacityTheme.cssVariables['--killed-item-opacity'],
)

console.log('backgroundOpacity.test.ts passed')
