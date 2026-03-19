import type { Picto } from '../src/types/Picto.js'

interface LocalizedText {
  SourceString?: string | null
  CultureInvariantString?: string | null
}

interface CompositeItemRow {
  Item_Type_88_2F24F8FB4235429B4DE1399DBA533C78?: string
  Item_DisplayName_89_41C0C54E4A55598869C84CA3B5B5DECA?: LocalizedText
}

interface CompositeItemTable {
  Rows?: Record<string, CompositeItemRow>
}

export interface PictoCatalogFile {
  Pictos: Record<string, string>
}

export interface PictoAcquireInfo {
  pictoName: string
  effect: string
  health: string
  defense: string
  speed: string
  criticalRate: string
  mapName: string
  nearestFlag: string
  mapAndNearestFlag: string
  howToGet: string
}

export interface PictoSaveData {
  root?: {
    properties?: {
      InventoryItems_0?: {
        Map?: Array<{
          key?: { Name?: string }
          value?: { Int?: number }
        }>
      }
      PassiveEffectsProgressions_0?: {
        Array?: {
          Struct?: {
            value?: Array<{
              Struct?: {
                PassiveEffectName_3_A92DB6CC4549450728A867A714ADF6C5_0?: {
                  Name?: string
                }
                IsLearnt_9_2561000E49D90653437DE9A45BE2A86D_0?: {
                  Bool?: boolean
                }
              }
            }>
          }
        }
      }
      WeaponProgressions_0?: {
        Array?: {
          Struct?: {
            value?: Array<{
              Struct?: {
                DefinitionID_3_60EB24664894755B19F4EBA18A21AF1A_0?: {
                  Name?: string
                }
                CurrentLevel_6_227A00644D035BDD595B2D86C8455B71_0?: {
                  Int?: number
                }
              }
            }>
          }
        }
      }
    }
  }
}

const PICTO_ITEM_TYPE = 'E_jRPG_ItemType::NewEnumerator10'
const PICTO_ACQUIRE_HEADERS = [
  'Picto Name',
  'Effect',
  'Health',
  'Defense',
  'Speed',
  'Critical Rate',
  'Map and Nearest Flag',
  'How to Get',
] as const

const unavailablePictoNames = new Set([
  'The Best Defense',
  'Bloody Bullet',
  'Passive Defense',
  'Dodge Specialist',
  'Dodge Helper',
  'Lucky Aim',
  'Successive Parry',
  'Parry Specialist',
  'Solidifying Meditation',
  'Great Energy Tint',
  'Great Healing Tint',
  'Charybde To Scylla',
  'Evasive Healer',
  'Charging Recovery',
  'Gradient Recovery',
  'Better Healing Tint',
  'Parry Helper',
  'Physical Fighter',
  'Shield Breaker',
  'Soul Eater',
])

function toFriendlyPictoName(displayName?: LocalizedText): string | null {
  const sourceString = displayName?.SourceString
  if (sourceString) {
    return sourceString
  }

  const fallback = displayName?.CultureInvariantString
  if (fallback) {
    return `${fallback}**`
  }

  return null
}

function parseMapAndNearestFlag(value: string): {
  mapName: string
  nearestFlag: string
} {
  const trimmed = value.trim()
  if (trimmed.length === 0) {
    return { mapName: '', nearestFlag: '' }
  }

  const match = trimmed.match(/^(.*?)(?:\s*\((.*)\))?$/)
  if (!match) {
    return { mapName: trimmed, nearestFlag: '' }
  }

  return {
    mapName: match[1]?.trim() ?? '',
    nearestFlag: match[2]?.trim() ?? '',
  }
}

function splitTsvLine(line: string): string[] {
  return line.split('\t').map((value) => value.trim())
}

function createDefaultPictoAcquireInfo(pictoName: string): PictoAcquireInfo {
  return {
    pictoName,
    effect: '',
    health: '',
    defense: '',
    speed: '',
    criticalRate: '',
    mapName: '',
    nearestFlag: '',
    mapAndNearestFlag: '',
    howToGet: '',
  }
}

export function buildPictoCatalogFromCompositeData(
  compositeData: CompositeItemTable[],
): PictoCatalogFile {
  const rows = compositeData[0]?.Rows ?? {}
  const available: Array<[string, string]> = []

  for (const [id, item] of Object.entries(rows)) {
    if (item.Item_Type_88_2F24F8FB4235429B4DE1399DBA533C78 !== PICTO_ITEM_TYPE) {
      continue
    }

    const friendlyName = toFriendlyPictoName(
      item.Item_DisplayName_89_41C0C54E4A55598869C84CA3B5B5DECA,
    )

    if (!friendlyName) {
      continue
    }

    if (friendlyName.endsWith('**')) {
      continue
    }

    if (unavailablePictoNames.has(friendlyName)) {
      continue
    }

    available.push([id, friendlyName])
  }

  const sortByName = (left: [string, string], right: [string, string]) =>
    left[1].localeCompare(right[1])

  const pictos = Object.fromEntries(available.sort(sortByName))

  return { Pictos: pictos }
}

export function parsePictoAcquireTsv(tsvContent: string): Map<string, PictoAcquireInfo> {
  const lines = tsvContent
    .split(/\r?\n/)
    .map((line) => line.trimEnd())
    .filter((line) => line.length > 0)

  if (lines.length === 0) {
    throw new Error('pictos_acquire.tsv is empty.')
  }

  const header = splitTsvLine(lines[0])
  for (const expectedHeader of PICTO_ACQUIRE_HEADERS) {
    if (!header.includes(expectedHeader)) {
      throw new Error(
        `pictos_acquire.tsv is missing required header "${expectedHeader}".`,
      )
    }
  }

  const indexByHeader = new Map(header.map((name, index) => [name, index]))
  const acquireInfoByName = new Map<string, PictoAcquireInfo>()

  for (let lineIndex = 1; lineIndex < lines.length; lineIndex += 1) {
    const columns = splitTsvLine(lines[lineIndex])
    const pictoName = columns[indexByHeader.get('Picto Name') ?? -1] ?? ''

    if (pictoName.length === 0) {
      throw new Error(`pictos_acquire.tsv has a blank picto name at row ${lineIndex + 1}.`)
    }

    if (acquireInfoByName.has(pictoName)) {
      throw new Error(`pictos_acquire.tsv has a duplicate picto name: "${pictoName}".`)
    }

    const mapAndNearestFlag =
      columns[indexByHeader.get('Map and Nearest Flag') ?? -1] ?? ''
    const parsedLocation = parseMapAndNearestFlag(mapAndNearestFlag)

    acquireInfoByName.set(pictoName, {
      pictoName,
      effect: columns[indexByHeader.get('Effect') ?? -1] ?? '',
      health: columns[indexByHeader.get('Health') ?? -1] ?? '',
      defense: columns[indexByHeader.get('Defense') ?? -1] ?? '',
      speed: columns[indexByHeader.get('Speed') ?? -1] ?? '',
      criticalRate: columns[indexByHeader.get('Critical Rate') ?? -1] ?? '',
      mapName: parsedLocation.mapName,
      nearestFlag: parsedLocation.nearestFlag,
      mapAndNearestFlag,
      howToGet: columns[indexByHeader.get('How to Get') ?? -1] ?? '',
    })
  }

  return acquireInfoByName
}

export function validatePictoAcquireData(
  pictoCatalog: Record<string, string>,
  acquireInfoByName: Map<string, PictoAcquireInfo>,
): void {
  const catalogNames = new Set(Object.values(pictoCatalog))
  const missingFromAcquire = [...catalogNames].filter(
    (name) => !acquireInfoByName.has(name),
  )
  const extraInAcquire = [...acquireInfoByName.keys()].filter(
    (name) => !catalogNames.has(name),
  )

  if (missingFromAcquire.length > 0 || extraInAcquire.length > 0) {
    const details = [
      missingFromAcquire.length > 0
        ? `Missing from TSV: ${missingFromAcquire.join(', ')}`
        : null,
      extraInAcquire.length > 0
        ? `Unknown TSV names: ${extraInAcquire.join(', ')}`
        : null,
    ]
      .filter(Boolean)
      .join(' | ')

    throw new Error(`pictos_acquire.tsv does not match pictos.json. ${details}`)
  }
}

export function extractPictos(
  saveData: PictoSaveData,
  pictoCatalog: Record<string, string>,
  acquireInfoByName: Map<string, PictoAcquireInfo>,
): Picto[] {
  const inventoryItems = saveData.root?.properties?.InventoryItems_0?.Map ?? []
  const passiveEffects =
    saveData.root?.properties?.PassiveEffectsProgressions_0?.Array?.Struct
      ?.value ?? []
  const weaponProgressions =
    saveData.root?.properties?.WeaponProgressions_0?.Array?.Struct?.value ?? []

  const inventoryCounts = new Map<string, number>()
  for (const entry of inventoryItems) {
    const id = entry.key?.Name
    if (!id) {
      continue
    }
    inventoryCounts.set(id.toLowerCase(), entry.value?.Int ?? 0)
  }

  const masteredById = new Map<string, boolean>()
  for (const entry of passiveEffects) {
    const id =
      entry.Struct?.PassiveEffectName_3_A92DB6CC4549450728A867A714ADF6C5_0?.Name
    if (!id) {
      continue
    }
    masteredById.set(
      id.toLowerCase(),
      entry.Struct?.IsLearnt_9_2561000E49D90653437DE9A45BE2A86D_0?.Bool ===
        true,
    )
  }

  const levelById = new Map<string, number>()
  for (const entry of weaponProgressions) {
    const id =
      entry.Struct?.DefinitionID_3_60EB24664894755B19F4EBA18A21AF1A_0?.Name
    if (!id) {
      continue
    }
    levelById.set(
      id.toLowerCase(),
      entry.Struct?.CurrentLevel_6_227A00644D035BDD595B2D86C8455B71_0?.Int ?? 1,
    )
  }

  return Object.entries(pictoCatalog).map(([id, friendlyName]) => {
    const key = id.toLowerCase()
    const acquireInfo =
      acquireInfoByName.get(friendlyName) ??
      createDefaultPictoAcquireInfo(friendlyName)

    return {
      id,
      friendlyName,
      found: (inventoryCounts.get(key) ?? 0) > 0,
      mastered: masteredById.get(key) ?? false,
      level: levelById.get(key) ?? 1,
      effect: acquireInfo.effect,
      health: acquireInfo.health,
      defense: acquireInfo.defense,
      speed: acquireInfo.speed,
      criticalRate: acquireInfo.criticalRate,
      mapName: acquireInfo.mapName,
      nearestFlag: acquireInfo.nearestFlag,
      mapAndNearestFlag: acquireInfo.mapAndNearestFlag,
      howToGet: acquireInfo.howToGet,
    }
  })
}
