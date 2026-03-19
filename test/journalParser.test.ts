import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'

import {
  extractJournals,
  type JournalCatalogFile,
  type JournalLocationFile,
  type JournalSaveData,
} from '../electron/journals.ts'

async function readJson<T>(path: string): Promise<T> {
  return JSON.parse(await readFile(path, 'utf-8')) as T
}

function requireJournal(
  journals: ReturnType<typeof extractJournals>,
  journalId: string,
) {
  const journal = journals.find((entry) => entry.id === journalId)
  assert.ok(journal, `Expected journal ${journalId} to exist in extracted snapshot`)
  return journal
}

const rootDir = process.cwd()
const catalogPath = resolve(rootDir, 'data', 'journals.json')
const locationsPath = resolve(rootDir, 'data', 'journal_locations.json')
const exportedSavePath = resolve(rootDir, 'test_save', 'expedition_0.json')

const catalog = await readJson<JournalCatalogFile>(catalogPath)
const locations = await readJson<JournalLocationFile>(locationsPath)
const exportedSave = await readJson<JournalSaveData>(exportedSavePath)

assert.equal(Object.keys(catalog.Journals).length, 49)
assert.equal(Object.keys(locations.Journals).length, 49)
assert.equal(catalog.Journals.Journal_RenoirSirene.name, 'Journal - Unknown')
assert.equal(locations.Journals.Journal_RenoirSirene.zoneName, 'sirene')
assert.equal(locations.Journals.Journal_Exp53.zoneName, 'the_small_bourgeon')

const journals = extractJournals(exportedSave, catalog.Journals, locations.Journals)
assert.equal(journals.length, Object.keys(catalog.Journals).length)

const expedition81 = requireJournal(journals, 'Journal_Exp81')
assert.equal(expedition81.found, true)
assert.equal(expedition81.count, 1)
assert.equal(expedition81.zoneName, 'spring_meadows')
assert.equal(expedition81.summary.length > 0, true)

const renoirVisages = requireJournal(journals, 'Journal_RenoirVisages')
assert.equal(renoirVisages.found, true)
assert.equal(renoirVisages.zoneName, 'visages')
assert.equal(renoirVisages.name, 'Journal - Unknown')

const renoirSirene = requireJournal(journals, 'Journal_RenoirSirene')
assert.equal(renoirSirene.found, false)
assert.equal(renoirSirene.zoneName, 'sirene')
assert.equal(renoirSirene.name, 'Journal - Unknown')

const julie = requireJournal(journals, 'Journal_Exp100B')
assert.equal(julie.found, false)
assert.equal(julie.name, 'Journal - Julie Search and Rescue')
assert.equal(julie.zoneName, 'the_continent')

const caseInsensitiveJournals = extractJournals(
  {
    root: {
      properties: {
        InventoryItems_0: {
          Map: [{ key: { Name: 'journal_renoirsirene' }, value: { Int: 2 } }],
        },
      },
    },
  },
  {
    Journal_RenoirSirene: {
      id: 'Journal_RenoirSirene',
      name: 'Journal - Unknown',
    },
  },
  {
    Journal_RenoirSirene: {
      journalName: 'Journal - Unknown',
      zoneName: 'sirene',
      sourceZoneName: 'The Canvas',
      summary: 'Hidden in the manor side room.',
    },
  },
)

assert.deepEqual(caseInsensitiveJournals, [
  {
    id: 'Journal_RenoirSirene',
    name: 'Journal - Unknown',
    found: true,
    count: 2,
    zoneName: 'sirene',
    sourceZoneName: 'The Canvas',
    summary: 'Hidden in the manor side room.',
  },
])

console.log('journalParser.test.ts passed')
