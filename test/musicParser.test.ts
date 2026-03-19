import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'

import {
  extractMusicRecords,
  type MusicRecordCatalogFile,
  type MusicRecordSaveData,
} from '../electron/musicRecords.ts'

async function readJson<T>(path: string): Promise<T> {
  return JSON.parse(await readFile(path, 'utf-8')) as T
}

function requireEntry(
  entries: ReturnType<typeof extractMusicRecords>,
  id: string,
) {
  const entry = entries.find((item) => item.id === id)
  assert.ok(entry, `Expected music record ${id} to exist`)
  return entry
}

const root = process.cwd()
const catalogPath = resolve(root, 'data', 'music_records.json')
const savePath = resolve(root, 'test_save', 'expedition_0.json')

const catalog = await readJson<MusicRecordCatalogFile>(catalogPath)
const saveData = await readJson<MusicRecordSaveData>(savePath)
const extracted = extractMusicRecords(saveData, catalog.MusicRecords)

assert.equal(extracted.length, 33)
assert.equal(extracted.filter((record) => record.found).length, 10)

const lumiere = requireEntry(extracted, 'MusicRecord_2')
assert.equal(lumiere.name, 'Lumi\u00E8re')
assert.equal(lumiere.found, true)
assert.equal(lumiere.zoneName, 'lumiere_prologue')

const renoir = requireEntry(extracted, 'MusicRecord_29')
assert.equal(renoir.name, 'Renoir')
assert.equal(renoir.found, true)
assert.equal(renoir.zoneName, 'the_manor')

const children = requireEntry(extracted, 'MusicRecord_27')
assert.equal(children.name, 'Children of Lumi\u00E8re')
assert.equal(children.found, true)

const alicia = requireEntry(extracted, 'MusicRecord_1')
assert.equal(alicia.found, false)
assert.equal(alicia.zoneName, 'the_manor')

console.log('musicParser.test.ts passed')
