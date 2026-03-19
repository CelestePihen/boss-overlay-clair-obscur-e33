import { basename } from 'node:path'

import type { MonocoFoot } from '../src/types/MonocoFoot.js'

export interface MonocoFeetCatalogEntry {
  skillId: string
  skillName: string
  footName: string
}

export interface MonocoFeetCatalogFile {
  MonocoFeet: Record<string, MonocoFeetCatalogEntry>
}

export interface MonocoFeetMetadataEntry {
  skillName: string
  monsterName: string
  monsterUrl: string
  fextraUrl: string
  locations: string[]
}

export interface MonocoFeetMetadataRow {
  skill_name?: string | null
  monster_name?: string | null
  monster_url?: string | null
  fextra_url?: string | null
  locations?: string[] | null
  location_error?: string | null
  skill_name_save?: string | null
}

export interface MonocoFeetSaveData {
  root?: {
    properties?: {
      InventoryItems_0?: {
        Map?: Array<{
          key?: { Name?: string }
          value?: { Int?: number }
        }>
      }
      CharactersCollection_0?: {
        Map?: Array<{
          key?: { Name?: string }
          value?: {
            Struct?: {
              Struct?: {
                UnlockedSkills_197_FAA1BD934F68CFC542FB048E3C0F3592_0?: {
                  Array?: {
                    Base?: {
                      Name?: string[]
                    }
                  }
                }
              }
            }
          }
        }>
      }
    }
  }
}

interface LocalizedText {
  SourceString?: string | null
  CultureInvariantString?: string | null
}

interface CompositeItemRow {
  Item_DisplayName_89_41C0C54E4A55598869C84CA3B5B5DECA?: LocalizedText
}

interface CompositeItemTable {
  Rows?: Record<string, CompositeItemRow>
}

interface SkillGraphUnlockNode {
  SkillUnlock_3_15FA1C06433ACE049603919CDF6155FF?: {
    Skill_2_9E4FC5804778258FBAA04BBF7F68F799?: {
      ObjectPath?: string
    }
    RequiresUnlockItem_18_D9EBC20F41097DD7517E428E4A57655E?: {
      RowName?: string
    }
  }
}

interface SkillGraphDataAsset {
  Properties?: {
    Nodes?: SkillGraphUnlockNode[]
  }
}

interface MonocoSkillAsset {
  Properties?: {
    NameID?: string
    name?: LocalizedText
  }
}

function readLocalizedText(value?: LocalizedText): string {
  return value?.SourceString || value?.CultureInvariantString || ''
}

function normalizeSkillSortName(value: string): string {
  return value.toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '')
}

function createDefaultMetadata(skillName: string): MonocoFeetMetadataEntry {
  return {
    skillName,
    monsterName: '',
    monsterUrl: '',
    fextraUrl: '',
    locations: [],
  }
}

export function resolveMonocoSkillAssetPath(objectPath: string): string {
  return objectPath
    .replace('/Game/Gameplay/SkillTree/Content/Monoco/Skills/', 'originalGameMapping/MonocoSkills/')
    .replace(/\.\d+$/, '.json')
}

export function buildMonocoFeetCatalog(
  compositeData: CompositeItemTable[],
  skillGraphData: SkillGraphDataAsset[],
  readSkillAsset: (skillAssetPath: string) => MonocoSkillAsset[],
): MonocoFeetCatalogFile {
  const compositeRows = compositeData[0]?.Rows ?? {}
  const skillNodes = skillGraphData[0]?.Properties?.Nodes ?? []
  const footNames = new Map<string, string>()

  for (const [footId, row] of Object.entries(compositeRows)) {
    if (!footId.endsWith('Foot')) {
      continue
    }

    const footName = readLocalizedText(
      row.Item_DisplayName_89_41C0C54E4A55598869C84CA3B5B5DECA,
    )

    if (footName) {
      footNames.set(footId, footName)
    }
  }

  const entries: Array<[string, MonocoFeetCatalogEntry]> = []

  for (const node of skillNodes) {
    const unlock = node.SkillUnlock_3_15FA1C06433ACE049603919CDF6155FF
    const footId = unlock?.RequiresUnlockItem_18_D9EBC20F41097DD7517E428E4A57655E?.RowName
    const objectPath = unlock?.Skill_2_9E4FC5804778258FBAA04BBF7F68F799?.ObjectPath

    if (!footId || footId === 'None' || footId.includes('GradientUnlock')) {
      continue
    }

    if (!objectPath) {
      continue
    }

    const skillAssetPath = resolveMonocoSkillAssetPath(objectPath)
    const skillAsset = readSkillAsset(skillAssetPath)[0]?.Properties
    const skillId = skillAsset?.NameID ?? ''
    const skillName = readLocalizedText(skillAsset?.name)
    const footName = footNames.get(footId) ?? ''

    if (!skillId || !skillName || !footName) {
      continue
    }

    entries.push([
      footId,
      {
        skillId,
        skillName,
        footName,
      },
    ])
  }

  entries.sort((left, right) => {
    const skillCompare = normalizeSkillSortName(left[1].skillName).localeCompare(
      normalizeSkillSortName(right[1].skillName),
    )

    if (skillCompare !== 0) {
      return skillCompare
    }

    return left[0].localeCompare(right[0])
  })

  return {
    MonocoFeet: Object.fromEntries(entries),
  }
}

export function parseMonocoFeetMetadata(
  rows: MonocoFeetMetadataRow[],
): Map<string, MonocoFeetMetadataEntry> {
  const metadata = new Map<string, MonocoFeetMetadataEntry>()

  for (const row of rows) {
    const skillId = row.skill_name_save?.trim()
    if (!skillId || row.location_error) {
      continue
    }

    metadata.set(skillId.toLowerCase(), {
      skillName: row.skill_name?.trim() || '',
      monsterName: row.monster_name?.trim() || '',
      monsterUrl: row.monster_url?.trim() || '',
      fextraUrl: row.fextra_url?.trim() || '',
      locations: Array.isArray(row.locations)
        ? row.locations.map((location) => location.trim()).filter(Boolean)
        : [],
    })
  }

  return metadata
}

export function extractMonocoFeet(
  saveData: MonocoFeetSaveData,
  catalog: Record<string, MonocoFeetCatalogEntry>,
  metadataBySkillId: Map<string, MonocoFeetMetadataEntry>,
): MonocoFoot[] {
  const inventoryItems = saveData.root?.properties?.InventoryItems_0?.Map ?? []
  const characters = saveData.root?.properties?.CharactersCollection_0?.Map ?? []

  const inventoryCounts = new Map<string, number>()
  for (const entry of inventoryItems) {
    const id = entry.key?.Name
    if (!id) {
      continue
    }

    inventoryCounts.set(id.toLowerCase(), entry.value?.Int ?? 0)
  }

  const monocoEntry = characters.find((entry) => entry.key?.Name === 'Monoco')
  const unlockedSkills =
    monocoEntry?.value?.Struct?.Struct?.UnlockedSkills_197_FAA1BD934F68CFC542FB048E3C0F3592_0
      ?.Array?.Base?.Name ?? []
  const unlockedSkillIds = new Set(
    unlockedSkills.map((skillId) => skillId.toLowerCase()),
  )

  return Object.entries(catalog).map(([footId, entry]) => {
    const metadata =
      metadataBySkillId.get(entry.skillId.toLowerCase()) ??
      createDefaultMetadata(entry.skillName)

    return {
      id: footId,
      skillId: entry.skillId,
      skillName: entry.skillName,
      footName: entry.footName,
      found: (inventoryCounts.get(footId.toLowerCase()) ?? 0) > 0,
      count: inventoryCounts.get(footId.toLowerCase()) ?? 0,
      skillUnlocked: unlockedSkillIds.has(entry.skillId.toLowerCase()),
      monsterName: metadata.monsterName,
      monsterUrl: metadata.monsterUrl,
      fextraUrl: metadata.fextraUrl,
      locations: metadata.locations,
    }
  })
}

export function getMonocoSkillAssetFileName(objectPath: string): string {
  return basename(resolveMonocoSkillAssetPath(objectPath))
}
