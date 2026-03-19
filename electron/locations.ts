import type { CurrentLocation } from '../src/types/CurrentLocation.js'

interface LocalizedText {
  SourceString?: string | null
  CultureInvariantString?: string | null
}

interface GameplayTag {
  TagName?: string | null
}

interface SubAreaEntry {
  Key?: GameplayTag | null
  Value?: LocalizedText | null
}

interface LevelDataRow {
  LevelAssetName_85_BF09694C41CC0444295731A40341A5F9?: string
  DisplayName_10_D3213B974EE2CBDD44757B978CD84FD8?: LocalizedText
  MainSpawnPoint_72_5C7B345E44E5B2867FCE0687BB65019F?: GameplayTag
  SubAreas_73_B59A02D5470428064B9B03A1A3F5F82C?: SubAreaEntry[]
}

interface LevelDataTable {
  Rows?: Record<string, LevelDataRow>
}

export interface LocationCatalogEntry {
  areaName: string
  levelKey: string
  mainSpawnPoint: string
  subFlags: Record<string, string>
}

export interface LocationCatalogFile {
  levels: Record<string, LocationCatalogEntry>
}

export interface LocationSaveData {
  root?: {
    properties?: {
      MapToLoad_0?: {
        Name?: string
      }
      SpawnPointTagToLoadAt_0?: {
        Struct?: {
          Struct?: {
            TagName_0?: {
              Name?: string
            }
          }
        }
      }
      ReturnSpawnPointTag_0?: {
        Struct?: {
          Struct?: {
            TagName_0?: {
              Name?: string
            }
          }
        }
      }
    }
  }
}

function getDisplayName(text?: LocalizedText | null): string | null {
  return text?.SourceString ?? text?.CultureInvariantString ?? null
}

function normalizeAreaName(rowName: string, displayName: string): string {
  if (rowName === 'SideLevel_CleasTower_Entrance') {
    return `${displayName} Entrance`
  }

  if (displayName === 'Lumière') {
    return `${displayName} (ACT 3) except Main`
  }

  return displayName
}

export function buildLocationCatalogFromLevelData(
  levelData: LevelDataTable[],
): LocationCatalogFile {
  const rows = levelData[0]?.Rows ?? {}
  const levels: Record<string, LocationCatalogEntry> = {}

  for (const [rowName, row] of Object.entries(rows)) {
    const levelKey = row.LevelAssetName_85_BF09694C41CC0444295731A40341A5F9
    const displayName = getDisplayName(
      row.DisplayName_10_D3213B974EE2CBDD44757B978CD84FD8,
    )

    if (!levelKey || !displayName) {
      continue
    }

    const areaName = normalizeAreaName(rowName, displayName)
    const mainSpawnPoint =
      row.MainSpawnPoint_72_5C7B345E44E5B2867FCE0687BB65019F?.TagName ?? ''

    const subFlags: Record<string, string> = {}
    for (const subArea of row.SubAreas_73_B59A02D5470428064B9B03A1A3F5F82C ?? []) {
      const tagName = subArea.Key?.TagName
      const subAreaName = getDisplayName(subArea.Value)
      if (!tagName || !subAreaName || tagName === mainSpawnPoint) {
        continue
      }

      subFlags[tagName] = subAreaName
    }

    levels[levelKey] = {
      areaName,
      levelKey,
      mainSpawnPoint,
      subFlags,
    }
  }

  return {
    levels: Object.fromEntries(
      Object.entries(levels).sort((left, right) =>
        left[1].areaName.localeCompare(right[1].areaName),
      ),
    ),
  }
}

export function extractCurrentLocation(
  saveData: LocationSaveData,
  locationCatalog: LocationCatalogFile,
): CurrentLocation | null {
  const properties = saveData.root?.properties
  const levelKey = properties?.MapToLoad_0?.Name?.trim() ?? ''
  const spawnTag =
    properties?.SpawnPointTagToLoadAt_0?.Struct?.Struct?.TagName_0?.Name?.trim() ??
    ''
  const returnSpawnTag =
    properties?.ReturnSpawnPointTag_0?.Struct?.Struct?.TagName_0?.Name?.trim() ??
    ''

  if (!levelKey && !spawnTag && !returnSpawnTag) {
    return null
  }

  const catalogEntry = locationCatalog.levels[levelKey]
  const areaName = catalogEntry?.areaName ?? null

  let subLocationName: string | null = null
  if (catalogEntry && spawnTag && spawnTag !== catalogEntry.mainSpawnPoint) {
    subLocationName = catalogEntry.subFlags[spawnTag] ?? null
  }

  let displayName = 'Unknown location'
  if (areaName && subLocationName) {
    displayName = `${areaName} - ${subLocationName}`
  } else if (areaName) {
    displayName = areaName
  } else if (spawnTag) {
    displayName = spawnTag
  } else if (levelKey) {
    displayName = levelKey
  }

  return {
    levelKey,
    spawnTag,
    returnSpawnTag: returnSpawnTag || undefined,
    areaName,
    subLocationName,
    displayName,
  }
}
