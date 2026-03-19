import { readFileSync } from 'node:fs'

import { normalizeZoneName } from '../components/checklistModel.ts'

export interface MusicLocationRow {
  name: string
  location: string
  location_url?: string
  description?: string
  data_key?: string
  data_db_key?: string
}

export interface MusicLocationCoverageReport {
  totalRows: number
  resolvedRows: number
  unresolvedRows: Array<{
    name: string
    location: string
    normalizedZoneName: string
  }>
  duplicateNames: string[]
}

export function parseMusicLocationRows(raw: string): MusicLocationRow[] {
  return JSON.parse(raw) as MusicLocationRow[]
}

export function buildMusicLocationCoverageReport(
  rows: MusicLocationRow[],
): MusicLocationCoverageReport {
  const unresolvedRows: MusicLocationCoverageReport['unresolvedRows'] = []
  const duplicateNames: string[] = []
  const seenNames = new Set<string>()
  let resolvedRows = 0

  for (const row of rows) {
    const name = row.name?.trim() ?? ''
    const location = row.location?.trim() ?? ''
    if (name.length === 0) {
      continue
    }

    const nameKey = name.toLowerCase()
    if (seenNames.has(nameKey)) {
      duplicateNames.push(name)
    } else {
      seenNames.add(nameKey)
    }

    const normalized = normalizeZoneName(location, 'location')
    if (!normalized.matched && location.length > 0) {
      unresolvedRows.push({
        name,
        location,
        normalizedZoneName: normalized.zoneName,
      })
      continue
    }

    resolvedRows += 1
  }

  return {
    totalRows: rows.length,
    resolvedRows,
    unresolvedRows,
    duplicateNames,
  }
}

export function loadMusicLocationRows(path: string): MusicLocationRow[] {
  return parseMusicLocationRows(readFileSync(path, 'utf-8'))
}
