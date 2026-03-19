import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'

import {
  buildZoneLevelCoverageReport,
  IGN_ZONE_LEVEL_ALIASES,
} from '../src/components/zoneLevels.ts'
import { ZONE_ALIASES } from '../src/components/zoneNormalization.ts'
import type { IgnZoneLevelsFile } from '../src/types/ZoneLevels.ts'

async function readJson<T>(path: string): Promise<T> {
  return JSON.parse(await readFile(path, 'utf-8')) as T
}

const ignZoneLevelsPath = resolve(process.cwd(), 'data', 'ign_zone_levels.json')
const ignZoneLevels = await readJson<IgnZoneLevelsFile>(ignZoneLevelsPath)

const report = buildZoneLevelCoverageReport(ignZoneLevels)

assert.deepEqual(IGN_ZONE_LEVEL_ALIASES.dark_shores_bloodied_beach, ['Dark Shores'])
assert.deepEqual(IGN_ZONE_LEVEL_ALIASES.spring_meadows, ['The Meadows'])

assert.deepEqual(report.resolvedZones.abbest_cave, {
  recommendedMinLevel: 20,
  recommendedMaxLevel: 20,
  sourceZoneName: 'Abbest Cave',
  sourceAnchorId: 'Abbest_Cave',
})

assert.deepEqual(report.resolvedZones.dark_shores_bloodied_beach, {
  recommendedMinLevel: 60,
  recommendedMaxLevel: 60,
  sourceZoneName: 'Dark Shores',
  sourceAnchorId: 'Dark_Shores',
})

assert.deepEqual(report.resolvedZones.spring_meadows, {
  recommendedMinLevel: 0,
  recommendedMaxLevel: 0,
  sourceZoneName: 'The Meadows',
  sourceAnchorId: 'The_Meadows',
})

assert.equal(report.resolvedZones.the_continent, undefined)
assert.deepEqual(report.missingCanonicalZones, [
  'ancient_gestral_city',
  'camp',
  'gestral_beach',
  'stone_quarry',
  'the_manor',
  'the_continent',
  'the_small_bourgeon',
])
assert.equal(report.missingCanonicalZones.includes('the_continent'), true)
assert.equal(report.missingCanonicalZones.includes('camp'), true)
assert.equal(report.missingCanonicalZones.includes('flying_waters'), false)
assert.equal(report.missingCanonicalZones.includes('ancient_sanctuary'), false)
assert.equal(report.missingCanonicalZones.includes('the_monolith'), false)
assert.equal(report.unmappedIgnZones.includes('The Canvas'), true)
assert.equal(report.unmappedIgnZones.includes('Lost Woods'), false)

assert.deepEqual(
  report.missingCanonicalZones.filter((zoneName) => !ZONE_ALIASES[zoneName]),
  [],
)

console.log('zoneLevels tests passed')
