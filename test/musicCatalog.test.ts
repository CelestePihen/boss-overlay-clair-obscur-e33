import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'

import {
  buildMusicRecordCatalog,
  type MusicRecordCatalogFile,
} from '../electron/musicRecords.ts'
import { parseMusicLocationRows } from '../src/utils/musicLocations.ts'

async function readJson<T>(path: string): Promise<T> {
  return JSON.parse(await readFile(path, 'utf-8')) as T
}

const root = process.cwd()
const mappingPath = resolve(root, 'originalGameMapping', 'DT_MusicRecords.json')
const locationsPath = resolve(root, 'data', 'music_locations.json')
const catalogPath = resolve(root, 'data', 'music_records.json')

const mappingData = await readJson<unknown[]>(mappingPath)
const locationRows = parseMusicLocationRows(await readFile(locationsPath, 'utf-8'))
const expected = buildMusicRecordCatalog(mappingData, locationRows)
const actual = await readJson<MusicRecordCatalogFile>(catalogPath)

assert.deepEqual(actual, expected)
assert.equal(Object.keys(actual.MusicRecords).length, 33)
assert.deepEqual(actual.MusicRecords.MusicRecord_1, {
  id: 'MusicRecord_1',
  name: 'Alicia',
  zoneName: 'the_manor',
  sourceZoneName: 'The Manor',
  locationUrl: 'https://game-checklists.com/expedition33/all-manor-doors.html',
  summary: 'Enter The Manor from Falling Leaves',
})

assert.equal(actual.MusicRecords.MusicRecord_2?.name, 'Lumi\u00E8re')
assert.equal(actual.MusicRecords.MusicRecord_2?.zoneName, 'lumiere_prologue')
assert.equal(actual.MusicRecords.MusicRecord_31?.name, "L'Amour d'une M\u00E8re")

console.log('musicCatalog.test.ts passed')
