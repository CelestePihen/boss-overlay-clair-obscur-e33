import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'

import {
  buildMusicLocationCoverageReport,
  parseMusicLocationRows,
} from '../src/utils/musicLocations.ts'

const rootDir = process.cwd()
const musicLocationsPath = resolve(rootDir, 'data', 'music_locations.json')
const rows = parseMusicLocationRows(await readFile(musicLocationsPath, 'utf-8'))
const report = buildMusicLocationCoverageReport(rows)

assert.equal(rows.length, 33)
assert.equal(report.totalRows, 33)
assert.deepEqual(report.duplicateNames, [])

console.log('resolved rows:', report.resolvedRows)
console.log('unresolved rows:', report.unresolvedRows.length)
for (const row of report.unresolvedRows) {
  console.log(`${row.location} => ${row.normalizedZoneName} (${row.name})`)
}

assert.equal(report.unresolvedRows.length, 0, 'music_locations.json has unresolved zone names')

console.log('musicLocations tests passed')
