import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'

import {
  buildWeaponLocationCoverageReport,
  WEAPON_ZONE_OVERRIDES,
  type WeaponLocationRow,
} from '../src/utils/weaponLocations.ts'

async function readJson<T>(path: string): Promise<T> {
  return JSON.parse(await readFile(path, 'utf-8')) as T
}

const weaponsPath = resolve(process.cwd(), 'data', 'weapons_locations.json')
const rows = await readJson<WeaponLocationRow[]>(weaponsPath)
const report = buildWeaponLocationCoverageReport(rows)

assert.equal(rows.length, 116)
assert.equal(WEAPON_ZONE_OVERRIDES['dark shores'], 'dark_shores_bloodied_beach')
assert.equal(WEAPON_ZONE_OVERRIDES['lumiere act i'], 'lumiere_prologue')
assert.equal(WEAPON_ZONE_OVERRIDES['lumiere act iii'], 'lumiere')
assert.equal(report.uniqueSourceZones.includes('Dark Shores'), true)
assert.equal(
  report.resolvedRows.some(
    (row) =>
      row.location === 'Dark Shores' &&
      row.zoneName === 'dark_shores_bloodied_beach',
  ),
  true,
)
assert.equal(report.resolvedRows.length, 116)
assert.deepEqual(report.unresolvedSourceZones, [])
assert.equal(
  report.resolvedRows.some(
    (row) => row.location === 'Coastal Cave' && row.zoneName === 'coastal_cave',
  ),
  true,
)
assert.equal(
  report.resolvedRows.some(
    (row) =>
      row.location === 'Isle of the Eyes' && row.zoneName === 'isle_of_eyes',
  ),
  true,
)
assert.equal(
  report.resolvedRows.some(
    (row) =>
      row.location === 'Lumiere Act I' &&
      row.zoneName === 'lumiere_prologue',
  ),
  true,
)
assert.equal(
  report.resolvedRows.some(
    (row) => row.location === 'Lumiere Act III' && row.zoneName === 'lumiere',
  ),
  true,
)
assert.equal(
  report.resolvedRows.some(
    (row) => row.location === 'Lumiere ACT III' && row.zoneName === 'lumiere',
  ),
  true,
)

console.log('weaponLocations.test.ts passed')
