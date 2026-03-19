import { toZoneLookupKey, ZONE_ALIASES } from '../components/zoneNormalization.ts'

export interface JournalCatalogEntry {
  id: string
  name: string
}

export interface JournalLocationTsvRow {
  journalName: string
  zoneName: string
  summary: string
}

export interface ResolvedJournalLocationRow {
  journalId: string
  journalName: string
  zoneName: string
  sourceZoneName: string
  summary: string
}

export interface UnresolvedJournalNameRow {
  row: JournalLocationTsvRow
  candidateJournalIds: string[]
}

export interface UnresolvedJournalZoneRow {
  row: JournalLocationTsvRow
  resolvedJournalId: string
  suggestedZoneName: string
}

export interface JournalLocationCoverageReport {
  catalog: Record<string, JournalCatalogEntry>
  resolvedRows: ResolvedJournalLocationRow[]
  unresolvedJournalNameRows: UnresolvedJournalNameRow[]
  unresolvedZoneRows: UnresolvedJournalZoneRow[]
  journalOnlyZoneSuggestions: string[]
}

interface JournalDataTable {
  Rows: Record<
    string,
    {
      Item_DisplayName_89_41C0C54E4A55598869C84CA3B5B5DECA?: {
        SourceString?: string
        CultureInvariantString?: string
      }
    }
  >
}

const existingZoneLookup = new Map<string, string>()
for (const [zoneName, aliases] of Object.entries(ZONE_ALIASES)) {
  for (const alias of aliases) {
    existingZoneLookup.set(toZoneLookupKey(alias), zoneName)
  }
}

export const JOURNAL_NAME_ALIASES: Record<string, string> = {
  julie: 'julie search and rescue',
}

export const JOURNAL_ROW_ID_OVERRIDES: Record<string, string> = {
  "unknown|visages": 'Journal_RenoirVisages',
  "unknown|the canvas": 'Journal_RenoirSirene',
  "unknown|the reacher": 'Journal_RenoirReacher',
}

export const JOURNAL_ZONE_OVERRIDES: Record<string, string> = {
  [toZoneLookupKey('The Continent/World Map')]: 'the_continent',
  [toZoneLookupKey('Old Lumiere (Manor Entrance)')]: 'old_lumiere',
  [toZoneLookupKey('The Canvas')]: 'sirene',
  [toZoneLookupKey('The Small Bourgeon')]: 'the_small_bourgeon',
  [toZoneLookupKey('Stone Quarry')]: 'stone_quarry',
  [toZoneLookupKey('White Tree')]: 'white_tree',
  [toZoneLookupKey('Gestral Beach')]: 'gestral_beach',
  [toZoneLookupKey('The Fountain')]: 'the_fountain',
}

export const JOURNAL_ZONE_SUGGESTIONS: Record<string, string> = {
  [toZoneLookupKey('The Small Bourgeon')]: 'the_small_bourgeon',
  [toZoneLookupKey('Stone Quarry')]: 'stone_quarry',
  [toZoneLookupKey('White Tree')]: 'white_tree',
  [toZoneLookupKey('Gestral Beach')]: 'gestral_beach',
  [toZoneLookupKey('The Fountain')]: 'the_fountain',
  [toZoneLookupKey('The Canvas')]: 'the_canvas',
}

function toJournalLookupKey(value: string): string {
  return toZoneLookupKey(value).replace(/^journal /, '')
}

function toRowOverrideKey(journalName: string, zoneName: string): string {
  return `${toJournalLookupKey(journalName)}|${toZoneLookupKey(zoneName)}`
}

function toSuggestedZoneName(zoneName: string): string {
  const normalizedZoneName = toZoneLookupKey(zoneName)
  return JOURNAL_ZONE_SUGGESTIONS[normalizedZoneName] ?? normalizedZoneName.replace(/ /g, '_')
}

export function buildJournalCatalog(
  dataTable: JournalDataTable,
): Record<string, JournalCatalogEntry> {
  const catalog: Record<string, JournalCatalogEntry> = {}

  for (const [id, row] of Object.entries(dataTable.Rows)) {
    const nameSource = row.Item_DisplayName_89_41C0C54E4A55598869C84CA3B5B5DECA
    const name = nameSource?.SourceString || nameSource?.CultureInvariantString || id
    catalog[id] = { id, name }
  }

  return catalog
}

export function parseJournalLocationsTsv(tsvText: string): JournalLocationTsvRow[] {
  const [headerLine, ...dataLines] = tsvText.trim().split(/\r?\n/)
  const header = headerLine.split('\t')

  if (
    header.length !== 3 ||
    header[0] !== 'journal_name' ||
    header[1] !== 'zone_name' ||
    header[2] !== 'summary'
  ) {
    throw new Error('journals_locations.tsv has an unexpected header shape')
  }

  return dataLines.map((line) => {
    const [journalName = '', zoneName = '', summary = ''] = line.split('\t')
    return {
      journalName: journalName.trim(),
      zoneName: zoneName.trim(),
      summary: summary.trim(),
    }
  })
}

export function buildJournalLocationCoverageReport(
  catalog: Record<string, JournalCatalogEntry>,
  rows: JournalLocationTsvRow[],
): JournalLocationCoverageReport {
  const catalogNameLookup = new Map<string, JournalCatalogEntry[]>()

  for (const entry of Object.values(catalog)) {
    const key = toJournalLookupKey(entry.name)
    const bucket = catalogNameLookup.get(key)
    if (bucket) {
      bucket.push(entry)
    } else {
      catalogNameLookup.set(key, [entry])
    }
  }

  const resolvedRows: ResolvedJournalLocationRow[] = []
  const unresolvedJournalNameRows: UnresolvedJournalNameRow[] = []
  const unresolvedZoneRows: UnresolvedJournalZoneRow[] = []
  const journalOnlyZoneSuggestions = new Set<string>()

  for (const row of rows) {
    const overrideId = JOURNAL_ROW_ID_OVERRIDES[toRowOverrideKey(row.journalName, row.zoneName)]
    const journalEntries = overrideId
      ? catalog[overrideId]
        ? [catalog[overrideId]]
        : []
      : (catalogNameLookup.get(
          JOURNAL_NAME_ALIASES[toJournalLookupKey(row.journalName)] ??
            toJournalLookupKey(row.journalName),
        ) ?? [])

    if (journalEntries.length !== 1) {
      unresolvedJournalNameRows.push({
        row,
        candidateJournalIds: journalEntries.map((entry) => entry.id),
      })
      continue
    }

    const journalEntry = journalEntries[0]
    const zoneLookupKey = toZoneLookupKey(row.zoneName)
    const resolvedZoneName =
      JOURNAL_ZONE_OVERRIDES[zoneLookupKey] ?? existingZoneLookup.get(zoneLookupKey)

    if (!resolvedZoneName) {
      const suggestedZoneName = toSuggestedZoneName(row.zoneName)
      journalOnlyZoneSuggestions.add(suggestedZoneName)
      unresolvedZoneRows.push({
        row,
        resolvedJournalId: journalEntry.id,
        suggestedZoneName,
      })
      continue
    }

    resolvedRows.push({
      journalId: journalEntry.id,
      journalName: journalEntry.name,
      zoneName: resolvedZoneName,
      sourceZoneName: row.zoneName,
      summary: row.summary,
    })
  }

  return {
    catalog,
    resolvedRows,
    unresolvedJournalNameRows,
    unresolvedZoneRows,
    journalOnlyZoneSuggestions: [...journalOnlyZoneSuggestions].sort(),
  }
}
