import { Buffer } from 'node:buffer'

import { toZoneLookupKey, ZONE_ALIASES } from '../src/components/zoneNormalization.ts'
import type { MusicRecordEntry } from '../src/types/MusicRecordEntry.js'
import {
  buildMusicLocationCoverageReport,
  type MusicLocationRow,
} from '../src/utils/musicLocations.ts'

const ITEM_TYPE_MUSIC_RECORD = 'E_jRPG_ItemType::NewEnumerator11'
const MUSIC_NAME_ALIASES: Record<string, string> = {
  'un 33 decembre lumiere': 'un 33 decembre a lumiere',
}

interface LocalizedText {
  SourceString?: string | null
  CultureInvariantString?: string | null
}

interface MusicRecordRow {
  Item_DisplayName_89_41C0C54E4A55598869C84CA3B5B5DECA?: LocalizedText
  Item_Type_88_2F24F8FB4235429B4DE1399DBA533C78?: string
}

interface MusicRecordTable {
  Rows?: Record<string, MusicRecordRow>
}

export interface MusicRecordCatalogEntry {
  id: string
  name: string
  zoneName: string
  sourceZoneName: string
  locationUrl: string
  summary: string
}

export interface MusicRecordCatalogFile {
  MusicRecords: Record<string, MusicRecordCatalogEntry>
}

export interface MusicRecordSaveData {
  root?: {
    properties?: {
      InventoryItems_0?: {
        Map?: Array<{
          key?: { Name?: string }
          value?: { Int?: number }
        }>
      }
    }
  }
}

const zoneAliasLookup = new Map<string, string>()

for (const [zoneName, aliases] of Object.entries(ZONE_ALIASES)) {
  for (const alias of aliases) {
    zoneAliasLookup.set(toZoneLookupKey(alias), zoneName)
  }
}

function readLocalizedText(value?: LocalizedText): string {
  return value?.SourceString || value?.CultureInvariantString || ''
}

function repairMojibake(value: string): string {
  if (!/[ÃÂâð]/.test(value)) {
    return value
  }

  try {
    const repaired = Buffer.from(value, 'latin1').toString('utf8')
    return repaired.includes('\uFFFD') ? value : repaired
  } catch {
    return value
  }
}

function normalizeMusicLookupKey(value: string): string {
  const normalized = repairMojibake(value.trim())
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9' ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase()

  return MUSIC_NAME_ALIASES[normalized] ?? normalized
}

function getMusicRecords(mappingData: MusicRecordTable[]): Array<{
  id: string
  name: string
}> {
  const rows = mappingData[0]?.Rows ?? {}
  const records: Array<{ id: string; name: string }> = []

  for (const [recordId, row] of Object.entries(rows)) {
    if (row.Item_Type_88_2F24F8FB4235429B4DE1399DBA533C78 !== ITEM_TYPE_MUSIC_RECORD) {
      continue
    }

    const name = repairMojibake(
      readLocalizedText(row.Item_DisplayName_89_41C0C54E4A55598869C84CA3B5B5DECA),
    )
    if (!name) {
      continue
    }

    records.push({ id: recordId, name })
  }

  records.sort((left, right) =>
    left.id.localeCompare(right.id, undefined, { numeric: true }),
  )
  return records
}

export function buildMusicRecordCatalog(
  mappingData: MusicRecordTable[],
  locationRows: MusicLocationRow[],
): MusicRecordCatalogFile {
  const coverage = buildMusicLocationCoverageReport(locationRows)
  if (coverage.unresolvedRows.length > 0) {
    const unresolved = coverage.unresolvedRows
      .map((row) => `${row.name} (${row.location})`)
      .join(', ')
    throw new Error(`Unresolved music record locations: ${unresolved}`)
  }

  const records = getMusicRecords(mappingData)
  const recordsByName = new Map<string, { id: string; name: string }>()
  for (const record of records) {
    recordsByName.set(normalizeMusicLookupKey(record.name), record)
  }

  const entries: Array<[string, MusicRecordCatalogEntry]> = []

  for (const row of locationRows) {
    const match = recordsByName.get(normalizeMusicLookupKey(row.name))
    if (!match) {
      throw new Error(`No music record mapping found for ${row.name}`)
    }

    const zoneName = zoneAliasLookup.get(toZoneLookupKey(row.location.trim()))
    if (!zoneName) {
      throw new Error(`No canonical zone mapping found for ${row.location}`)
    }

    entries.push([
      match.id,
      {
        id: match.id,
        name: match.name,
        zoneName,
        sourceZoneName: row.location.trim(),
        locationUrl: row.location_url?.trim() ?? '',
        summary: row.description?.trim() ?? '',
      },
    ])
  }

  entries.sort((left, right) =>
    left[0].localeCompare(right[0], undefined, { numeric: true }),
  )

  return {
    MusicRecords: Object.fromEntries(entries),
  }
}

export function extractMusicRecords(
  saveData: MusicRecordSaveData,
  catalog: Record<string, MusicRecordCatalogEntry>,
): MusicRecordEntry[] {
  const inventoryItems = saveData.root?.properties?.InventoryItems_0?.Map ?? []
  const inventoryCounts = new Map<string, number>()

  for (const entry of inventoryItems) {
    const id = entry.key?.Name
    if (!id) {
      continue
    }

    inventoryCounts.set(id.toLowerCase(), entry.value?.Int ?? 0)
  }

  return Object.values(catalog).map((entry) => ({
    id: entry.id,
    name: entry.name,
    found: (inventoryCounts.get(entry.id.toLowerCase()) ?? 0) !== 0,
    zoneName: entry.zoneName,
    sourceZoneName: entry.sourceZoneName,
    locationUrl: entry.locationUrl,
    summary: entry.summary,
  }))
}
