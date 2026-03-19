import type { WeaponEntry } from '../src/types/WeaponEntry.js'
import {
  buildWeaponLocationCoverageReport,
  type WeaponLocationRow,
} from '../src/utils/weaponLocations.ts'

const ITEM_TYPE_WEAPON = 'E_jRPG_ItemType::NewEnumerator0'
const VERSO_DLC_HARDCODED_NAME = 'VD_Verso_2'
const WEAPON_NAME_ALIASES: Record<string, string> = {
  seashellum: 'seashelum',
}
const WEAPON_SUBTYPE_OWNERS: Record<string, string> = {
  'E_jRPG_ItemSubtype::NewEnumerator0': 'Lune',
  'E_jRPG_ItemSubtype::NewEnumerator1': 'Monoco',
  'E_jRPG_ItemSubtype::NewEnumerator2': 'Sciel',
  'E_jRPG_ItemSubtype::NewEnumerator14': 'Maelle',
  'E_jRPG_ItemSubtype::NewEnumerator16': 'Gustave',
  'E_jRPG_ItemSubtype::NewEnumerator21': 'Verso',
}

interface LocalizedText {
  SourceString?: string | null
  CultureInvariantString?: string | null
}

interface CompositeItemRow {
  Item_Type_88_2F24F8FB4235429B4DE1399DBA533C78?: string
  Item_Subtype_87_0CE0028F4D632385B61EDABBFBDF5360?: string
  Item_DisplayName_89_41C0C54E4A55598869C84CA3B5B5DECA?: LocalizedText
  Item_HardcodedName_90_C7F763B74AAB28EF890A66854D7D95AA?: string
}

interface CompositeItemTable {
  Rows?: Record<string, CompositeItemRow>
}

export interface WeaponCatalogEntry {
  id: string
  name: string
  owner: string
  zoneName: string
  sourceZoneName: string
  locationUrl: string
  summary: string
}

export interface WeaponCatalogFile {
  Weapons: Record<string, WeaponCatalogEntry>
}

export interface WeaponSaveData {
  root?: {
    properties?: {
      InventoryItems_0?: {
        Map?: Array<{
          key?: { Name?: string }
          value?: { Int?: number }
        }>
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
      CharactersCollection_0?: {
        Map?: Array<{
          value?: {
            Struct?: {
              Struct?: {
                EquippedItemsPerSlot_183_3B9D37B549426C770DB5E5BE821896E9_0?: {
                  Map?: Array<{
                    value?: { Name?: string }
                  }>
                }
              }
            }
          }
        }>
      }
    }
  }
}

interface CompositeWeaponEntry {
  id: string
  name: string
  owner: string
}

function readLocalizedText(value?: LocalizedText): string {
  return value?.SourceString || value?.CultureInvariantString || ''
}

function normalizeWeaponLookupKey(value: string): string {
  return (WEAPON_NAME_ALIASES[value.trim().toLowerCase()] ?? value.trim())
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9' ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase()
}

function getCompositeWeapons(compositeData: CompositeItemTable[]): CompositeWeaponEntry[] {
  const compositeRows = compositeData[0]?.Rows ?? {}
  const entries: CompositeWeaponEntry[] = []

  for (const [weaponId, row] of Object.entries(compositeRows)) {
    if (row.Item_Type_88_2F24F8FB4235429B4DE1399DBA533C78 !== ITEM_TYPE_WEAPON) {
      continue
    }

    const owner =
      WEAPON_SUBTYPE_OWNERS[row.Item_Subtype_87_0CE0028F4D632385B61EDABBFBDF5360 ?? '']
    if (!owner) {
      continue
    }

    if (row.Item_HardcodedName_90_C7F763B74AAB28EF890A66854D7D95AA === VERSO_DLC_HARDCODED_NAME) {
      continue
    }

    const name = readLocalizedText(row.Item_DisplayName_89_41C0C54E4A55598869C84CA3B5B5DECA)
    if (!name || name === 'Baguette' || weaponId.endsWith('_Placeholder')) {
      continue
    }

    entries.push({
      id: weaponId,
      name,
      owner,
    })
  }

  return entries
}

export function buildWeaponCatalog(
  compositeData: CompositeItemTable[],
  locationRows: WeaponLocationRow[],
): WeaponCatalogFile {
  const coverage = buildWeaponLocationCoverageReport(locationRows)
  if (coverage.unresolvedSourceZones.length > 0) {
    throw new Error(
      `Unresolved weapon source zones: ${coverage.unresolvedSourceZones.join(', ')}`,
    )
  }

  const compositeWeapons = getCompositeWeapons(compositeData)
  const weaponsByName = new Map<string, CompositeWeaponEntry[]>()

  for (const weapon of compositeWeapons) {
    const lookupKey = normalizeWeaponLookupKey(weapon.name)
    const matches = weaponsByName.get(lookupKey) ?? []
    matches.push(weapon)
    weaponsByName.set(lookupKey, matches)
  }

  const catalogEntries: Array<[string, WeaponCatalogEntry]> = []

  for (const row of coverage.resolvedRows) {
    const lookupKey = normalizeWeaponLookupKey(row.weapon_name)
    const matches = weaponsByName.get(lookupKey) ?? []

    if (matches.length !== 1) {
      throw new Error(
        `Expected exactly one composite weapon match for ${row.character} ${row.weapon_name}, found ${matches.length}`,
      )
    }

    const match = matches[0]
    catalogEntries.push([
      match.id,
      {
        id: match.id,
        name: match.name,
        owner: match.owner,
        zoneName: row.zoneName,
        sourceZoneName: row.sourceZoneName,
        locationUrl: row.location_url ?? '',
        summary: row.description.trim(),
      },
    ])
  }

  catalogEntries.sort((left, right) => {
    const ownerCompare = left[1].owner.localeCompare(right[1].owner)
    if (ownerCompare !== 0) {
      return ownerCompare
    }

    return left[1].name.localeCompare(right[1].name)
  })

  return {
    Weapons: Object.fromEntries(catalogEntries),
  }
}

export function extractWeapons(
  saveData: WeaponSaveData,
  catalog: Record<string, WeaponCatalogEntry>,
): WeaponEntry[] {
  const inventoryItems = saveData.root?.properties?.InventoryItems_0?.Map ?? []
  const weaponProgressions =
    saveData.root?.properties?.WeaponProgressions_0?.Array?.Struct?.value ?? []
  const characters = saveData.root?.properties?.CharactersCollection_0?.Map ?? []

  const inventoryCounts = new Map<string, number>()
  for (const entry of inventoryItems) {
    const id = entry.key?.Name
    if (!id) {
      continue
    }

    inventoryCounts.set(id.toLowerCase(), entry.value?.Int ?? 0)
  }

  const weaponLevels = new Map<string, number>()
  for (const entry of weaponProgressions) {
    const id =
      entry.Struct?.DefinitionID_3_60EB24664894755B19F4EBA18A21AF1A_0?.Name
    if (!id) {
      continue
    }

    weaponLevels.set(
      id.toLowerCase(),
      entry.Struct?.CurrentLevel_6_227A00644D035BDD595B2D86C8455B71_0?.Int ?? 0,
    )
  }

  const equippedWeaponIds = new Set<string>()
  for (const character of characters) {
    const equippedItems =
      character.value?.Struct?.Struct?.EquippedItemsPerSlot_183_3B9D37B549426C770DB5E5BE821896E9_0
        ?.Map ?? []

    for (const equippedItem of equippedItems) {
      const itemId = equippedItem.value?.Name
      if (!itemId) {
        continue
      }

      equippedWeaponIds.add(itemId.toLowerCase())
    }
  }

  return Object.values(catalog).map((entry) => {
    const inventoryCount = inventoryCounts.get(entry.id.toLowerCase()) ?? 0
    const equipped = equippedWeaponIds.has(entry.id.toLowerCase())
    const found = inventoryCount > 0 || equipped
    const level = weaponLevels.get(entry.id.toLowerCase()) ?? (found ? 1 : 0)

    return {
      id: entry.id,
      name: entry.name,
      owner: entry.owner,
      found,
      level,
      equipped,
      zoneName: entry.zoneName,
      sourceZoneName: entry.sourceZoneName,
      locationUrl: entry.locationUrl,
      summary: entry.summary,
    }
  })
}
