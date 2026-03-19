import { toZoneLookupKey, ZONE_ALIASES } from '../components/zoneNormalization.ts'

export interface WeaponLocationRow {
  table_id: string
  character: string
  weapon_name: string
  location: string
  location_url: string | null
  description: string
  data_key: string
  data_db_key: string
}

export interface ResolvedWeaponLocationRow extends WeaponLocationRow {
  zoneName: string
  sourceZoneName: string
}

export interface WeaponLocationCoverageReport {
  resolvedRows: ResolvedWeaponLocationRow[]
  unresolvedZoneRows: WeaponLocationRow[]
  uniqueSourceZones: string[]
  unresolvedSourceZones: string[]
}

export const WEAPON_ZONE_OVERRIDES: Record<string, string> = {
  'dark shores': 'dark_shores_bloodied_beach',
  'lumiere act i': 'lumiere_prologue',
  'lumiere act iii': 'lumiere',
  'lumiere act3': 'lumiere',
  'lumiere act 3': 'lumiere',
}

const zoneAliasLookup = new Map<string, string>()
for (const [zoneName, aliases] of Object.entries(ZONE_ALIASES)) {
  for (const alias of aliases) {
    zoneAliasLookup.set(toZoneLookupKey(alias), zoneName)
  }
}

export function buildWeaponLocationCoverageReport(
  rows: WeaponLocationRow[],
): WeaponLocationCoverageReport {
  const resolvedRows: ResolvedWeaponLocationRow[] = []
  const unresolvedZoneRows: WeaponLocationRow[] = []
  const uniqueSourceZones = new Set<string>()
  const unresolvedSourceZones = new Set<string>()

  for (const row of rows) {
    const sourceZoneName = row.location.trim()
    uniqueSourceZones.add(sourceZoneName)

    const lookupKey = toZoneLookupKey(sourceZoneName)
    const zoneName = WEAPON_ZONE_OVERRIDES[lookupKey] ?? zoneAliasLookup.get(lookupKey)

    if (!zoneName) {
      unresolvedZoneRows.push(row)
      unresolvedSourceZones.add(sourceZoneName)
      continue
    }

    resolvedRows.push({
      ...row,
      zoneName,
      sourceZoneName,
    })
  }

  return {
    resolvedRows,
    unresolvedZoneRows,
    uniqueSourceZones: [...uniqueSourceZones].sort(),
    unresolvedSourceZones: [...unresolvedSourceZones].sort(),
  }
}


