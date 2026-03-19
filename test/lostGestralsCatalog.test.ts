import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'

interface LostGestralEntry {
  id: string
  name: string
  zoneName: string
  sourceZoneName: string
  summary: string
}

interface LostGestralCatalogFile {
  LostGestrals: Record<string, LostGestralEntry>
}

async function readJson<T>(path: string): Promise<T> {
  return JSON.parse(await readFile(path, 'utf-8')) as T
}

const catalogPath = resolve(process.cwd(), 'data', 'lost_gestrals.json')
const catalog = await readJson<LostGestralCatalogFile>(catalogPath)
const entries = Object.entries(catalog.LostGestrals)

assert.equal(entries.length, 9)

for (let index = 1; index <= 9; index += 1) {
  const id = `FindLostGestral_${index}`
  const entry = catalog.LostGestrals[id]
  assert.ok(entry, `Expected ${id} to exist in lost gestrals catalog`)
  assert.equal(entry.id, id)
  assert.equal(entry.name, `Lost Gestral ${index}`)
  assert.equal(entry.zoneName, 'the_continent')
  assert.equal(entry.sourceZoneName, 'Continent Map')
  assert.equal(entry.summary.length > 0, true)
}

console.log('lostGestralsCatalog.test.ts passed')
