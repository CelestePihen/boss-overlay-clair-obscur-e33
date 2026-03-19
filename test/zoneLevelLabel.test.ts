import assert from 'node:assert/strict'

import { formatZoneLevelLabel } from '../src/utils/zoneLevelLabel.ts'

assert.equal(formatZoneLevelLabel(undefined, undefined), '')
assert.equal(formatZoneLevelLabel(20, 20), ' — 20')
assert.equal(formatZoneLevelLabel(20, 25), ' — 20-25')
assert.equal(formatZoneLevelLabel(0, 0), ' — 0')

console.log('zoneLevelLabel tests passed')
