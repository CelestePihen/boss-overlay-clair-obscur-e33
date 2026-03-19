import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'

import {
  buildJournalCatalog,
  buildJournalLocationCoverageReport,
  JOURNAL_NAME_ALIASES,
  JOURNAL_ROW_ID_OVERRIDES,
  JOURNAL_ZONE_OVERRIDES,
  parseJournalLocationsTsv,
} from '../src/utils/journalLocations.ts'

async function readJson<T>(path: string): Promise<T> {
  return JSON.parse(await readFile(path, 'utf-8')) as T
}

const journalsPath = resolve(process.cwd(), 'originalGameMapping', 'DT_Items_Journals.json')
const journalsDataTable = (await readJson<{ Rows: Record<string, unknown> }[]>(journalsPath))[0]
const tsvPath = resolve(process.cwd(), 'data', 'journals_locations.tsv')
const tsvText = await readFile(tsvPath, 'utf-8')

const catalog = buildJournalCatalog(journalsDataTable)
const rows = parseJournalLocationsTsv(tsvText)
const report = buildJournalLocationCoverageReport(catalog, rows)

assert.equal(Object.keys(catalog).length, 49)
assert.equal(rows.length, 49)
assert.equal(JOURNAL_NAME_ALIASES.julie, 'julie search and rescue')
assert.equal(JOURNAL_ROW_ID_OVERRIDES['unknown|visages'], 'Journal_RenoirVisages')
assert.equal(JOURNAL_ROW_ID_OVERRIDES['unknown|the canvas'], 'Journal_RenoirSirene')
assert.equal(JOURNAL_ROW_ID_OVERRIDES['unknown|the reacher'], 'Journal_RenoirReacher')
assert.equal(JOURNAL_ZONE_OVERRIDES['the continent world map'], 'the_continent')

const julieRow = report.resolvedRows.find((row) => row.journalId === 'Journal_Exp100B')
assert.ok(julieRow)
assert.equal(julieRow.sourceZoneName, 'The Continent/World Map')
assert.equal(julieRow.zoneName, 'the_continent')

const visagesUnknown = report.resolvedRows.find(
  (row) => row.journalId === 'Journal_RenoirVisages',
)
assert.ok(visagesUnknown)
assert.equal(visagesUnknown.sourceZoneName, 'Visages')

const reacherUnknown = report.resolvedRows.find(
  (row) => row.journalId === 'Journal_RenoirReacher',
)
assert.ok(reacherUnknown)
assert.equal(reacherUnknown.sourceZoneName, 'The Reacher')

const sireneUnknown = report.resolvedRows.find(
  (row) => row.journalId === 'Journal_RenoirSirene',
)
assert.ok(sireneUnknown)
assert.equal(sireneUnknown.sourceZoneName, 'The Canvas')
assert.equal(sireneUnknown.zoneName, 'sirene')

assert.deepEqual(report.unresolvedJournalNameRows, [])
assert.deepEqual(report.unresolvedZoneRows, [])
assert.deepEqual(report.journalOnlyZoneSuggestions, [])

console.log('journalLocations tests passed')
