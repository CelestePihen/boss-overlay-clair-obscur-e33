import { execFile } from 'child_process'
import { readFile, stat, unlink, writeFile } from 'fs/promises'
import { tmpdir } from 'os'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'
import { promisify } from 'util'

import type { Boss } from '../src/types/Boss.js'
import type { SaveSnapshot } from '../src/types/SaveSnapshot.js'
import {
  extractFriendlyNevrons,
  type FriendlyNevronCatalogFile,
  type FriendlyNevronSaveData,
} from './friendlyNevrons.js'
import {
  extractJournals,
  type JournalCatalogFile,
  type JournalLocationFile,
  type JournalSaveData,
} from './journals.js'
import {
  extractCurrentLocation,
  type LocationCatalogFile,
  type LocationSaveData,
} from './locations.js'
import {
  extractLostGestrals,
  type LostGestralCatalogFile,
} from './lostGestrals.js'
import {
  extractMonocoFeet,
  type MonocoFeetCatalogFile,
  type MonocoFeetMetadataEntry,
  type MonocoFeetMetadataRow,
  type MonocoFeetSaveData,
  parseMonocoFeetMetadata,
} from './monocoFeet.js'
import {
  extractMusicRecords,
  type MusicRecordCatalogFile,
  type MusicRecordSaveData,
} from './musicRecords.js'
import {
  extractPictos,
  parsePictoAcquireTsv,
  type PictoAcquireInfo,
  type PictoCatalogFile,
  type PictoSaveData,
  validatePictoAcquireData,
} from './pictos.js'
import {
  extractWeapons,
  type WeaponCatalogFile,
  type WeaponSaveData,
} from './weapons.js'

const execFileAsync = promisify(execFile)

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

let bossDatabase: Array<{
  originalName: string
  id: string
  category: string
  zone: string
}> = []
let bossMap: Map<string, { id: string; category: string; zone: string }> | null =
  null
let pictoCatalog: Record<string, string> | null = null
let pictoAcquireInfo: Map<string, PictoAcquireInfo> | null = null
let locationCatalog: LocationCatalogFile | null = null
let journalCatalog: JournalCatalogFile['Journals'] | null = null
let journalLocations: JournalLocationFile['Journals'] | null = null
let lostGestralCatalog: LostGestralCatalogFile['LostGestrals'] | null = null
let friendlyNevronCatalog: FriendlyNevronCatalogFile['FriendlyNevrons'] | null = null
let musicRecordCatalog: MusicRecordCatalogFile['MusicRecords'] | null = null
let monocoFeetCatalog: Record<string, MonocoFeetCatalogFile['MonocoFeet'][string]> | null =
  null
let monocoFeetMetadata: Map<string, MonocoFeetMetadataEntry> | null = null
let weaponCatalog: WeaponCatalogFile['Weapons'] | null = null

type BossDatabaseByZone = Record<
  string,
  Array<{ originalName: string; id: string; category: string }>
>

interface SaveCache {
  savePath: string
  mtime: number
  snapshot: SaveSnapshot
}
let saveCache: SaveCache | null = null

type PictoSaveProperties = NonNullable<
  NonNullable<PictoSaveData['root']>['properties']
>

interface SaveData extends JournalSaveData, LocationSaveData, MonocoFeetSaveData, FriendlyNevronSaveData, WeaponSaveData, MusicRecordSaveData {
  root: {
    properties: PictoSaveProperties & {
      MapToLoad_0?: {
        Name: string
      }
      SpawnPointTagToLoadAt_0?: {
        Struct: {
          Struct: {
            TagName_0: {
              Name: string
            }
          }
        }
      }
      ReturnSpawnPointTag_0?: {
        Struct: {
          Struct: {
            TagName_0: {
              Name: string
            }
          }
        }
      }
      QuestStatuses_0?: {
        Map?: Array<{
          key?: { Name?: string }
          value?: {
            Struct?: {
              Struct?: {
                ObjectivesStatus_8_EA1232C14DA1F6DDA84EBA9185000F56_0?: {
                  Map?: Array<{
                    key?: { Name?: string }
                    value?: {
                      Byte?: {
                        Label?: string
                      }
                    }
                  }>
                }
              }
            }
          }
        }>
      }
      BattledEnemies_0?: {
        Map: Array<{
          key: { Name: string }
          value: { Bool: boolean }
        }>
      }
      EncounteredEnemies_0?: {
        Map: Array<{
          key: { Name: string }
          value: { Bool: boolean }
        }>
      }
      TransientBattledEnemies_0?: {
        Map: Array<{
          key: { Name: string }
          value: { Bool: boolean }
        }>
      }
    }
  }
}

function getDataPath(fileName: string) {
  const isDev = process.env.NODE_ENV === 'development' || !process.resourcesPath
  return isDev
    ? join(__dirname, `../data/${fileName}`)
    : join(process.resourcesPath!, 'data', fileName)
}

async function loadBossDatabase() {
  if (bossDatabase.length > 0) {
    return
  }

  try {
    const dbPath = getDataPath('bossDatabase.json')
    console.log('Loading boss database from:', dbPath)

    const dbContent = await readFile(dbPath, 'utf-8')
    const parsedData = JSON.parse(dbContent) as BossDatabaseByZone

    bossDatabase = []
    for (const [zoneName, bosses] of Object.entries(parsedData)) {
      for (const boss of bosses) {
        bossDatabase.push({
          ...boss,
          zone: zoneName,
        })
      }
    }

    bossMap = new Map()
    for (const boss of bossDatabase) {
      bossMap.set(boss.originalName, {
        id: boss.id,
        category: boss.category,
        zone: boss.zone,
      })
    }

    console.log(`Loaded ${bossDatabase.length} boss entries`)
  } catch (error) {
    console.error('Failed to load boss database:', error)
  }
}

async function loadLocationData() {
  if (locationCatalog) {
    return
  }

  try {
    const locationPath = getDataPath('locations.json')
    console.log('Loading location catalog from:', locationPath)

    const locationContent = await readFile(locationPath, 'utf-8')
    locationCatalog = JSON.parse(locationContent) as LocationCatalogFile

    console.log(`Loaded ${Object.keys(locationCatalog.levels).length} locations`)
  } catch (error) {
    console.error('Failed to load location catalog:', error)
    locationCatalog = { levels: {} }
  }
}

async function loadPictoData() {
  if (pictoCatalog && pictoAcquireInfo) {
    return
  }

  try {
    const catalogPath = getDataPath('pictos.json')
    const acquirePath = getDataPath('pictos_acquire.tsv')
    console.log('Loading picto catalog from:', catalogPath)
    console.log('Loading picto acquire data from:', acquirePath)

    const [catalogContent, acquireContent] = await Promise.all([
      readFile(catalogPath, 'utf-8'),
      readFile(acquirePath, 'utf-8'),
    ])

    const parsedCatalog = JSON.parse(catalogContent) as PictoCatalogFile
    const parsedAcquireInfo = parsePictoAcquireTsv(acquireContent)
    validatePictoAcquireData(parsedCatalog.Pictos, parsedAcquireInfo)

    pictoCatalog = parsedCatalog.Pictos
    pictoAcquireInfo = parsedAcquireInfo

    console.log(`Loaded ${Object.keys(pictoCatalog).length} pictos with acquire data`)
  } catch (error) {
    console.error('Failed to load picto data:', error)
    pictoCatalog = {}
    pictoAcquireInfo = new Map()
  }
}

async function loadJournalData() {
  if (journalCatalog && journalLocations) {
    return
  }

  try {
    const catalogPath = getDataPath('journals.json')
    const locationsPath = getDataPath('journal_locations.json')
    console.log('Loading journal catalog from:', catalogPath)
    console.log('Loading journal locations from:', locationsPath)

    const [catalogContent, locationsContent] = await Promise.all([
      readFile(catalogPath, 'utf-8'),
      readFile(locationsPath, 'utf-8'),
    ])

    const parsedCatalog = JSON.parse(catalogContent) as JournalCatalogFile
    const parsedLocations = JSON.parse(locationsContent) as JournalLocationFile

    journalCatalog = parsedCatalog.Journals
    journalLocations = parsedLocations.Journals

    console.log(
      `Loaded ${Object.keys(journalCatalog).length} journals with ${Object.keys(journalLocations).length} location entries`,
    )
  } catch (error) {
    console.error('Failed to load journal data:', error)
    journalCatalog = {}
    journalLocations = {}
  }
}


async function loadLostGestralData() {
  if (lostGestralCatalog) {
    return
  }

  try {
    const catalogPath = getDataPath('lost_gestrals.json')
    console.log('Loading lost gestral catalog from:', catalogPath)

    const catalogContent = await readFile(catalogPath, 'utf-8')
    const parsedCatalog = JSON.parse(catalogContent) as LostGestralCatalogFile
    lostGestralCatalog = parsedCatalog.LostGestrals

    console.log(`Loaded ${Object.keys(lostGestralCatalog).length} lost gestrals`)
  } catch (error) {
    console.error('Failed to load lost gestral data:', error)
    lostGestralCatalog = {}
  }
}

async function loadFriendlyNevronData() {
  if (friendlyNevronCatalog) {
    return
  }

  try {
    const catalogPath = getDataPath('friendly_nevrons.json')
    console.log('Loading Friendly Nevron catalog from:', catalogPath)

    const catalogContent = await readFile(catalogPath, 'utf-8')
    const parsedCatalog = JSON.parse(catalogContent) as FriendlyNevronCatalogFile
    friendlyNevronCatalog = parsedCatalog.FriendlyNevrons

    console.log(`Loaded ${Object.keys(friendlyNevronCatalog).length} Friendly Nevrons`)
  } catch (error) {
    console.error('Failed to load Friendly Nevron data:', error)
    friendlyNevronCatalog = {}
  }
}

async function loadMusicRecordData() {
  if (musicRecordCatalog) {
    return
  }

  try {
    const catalogPath = getDataPath('music_records.json')
    console.log('Loading music record catalog from:', catalogPath)

    const catalogContent = await readFile(catalogPath, 'utf-8')
    const parsedCatalog = JSON.parse(catalogContent) as MusicRecordCatalogFile
    musicRecordCatalog = parsedCatalog.MusicRecords

    console.log(`Loaded ${Object.keys(musicRecordCatalog).length} music records`)
  } catch (error) {
    console.error('Failed to load music record data:', error)
    musicRecordCatalog = {}
  }
}

async function loadMonocoFeetData() {
  if (monocoFeetCatalog && monocoFeetMetadata) {
    return
  }

  try {
    const catalogPath = getDataPath('monoco_feet.json')
    const metadataPath = getDataPath('feet_collection_with_locations.json')
    console.log('Loading Monoco feet catalog from:', catalogPath)
    console.log('Loading Monoco feet metadata from:', metadataPath)

    const [catalogContent, metadataContent] = await Promise.all([
      readFile(catalogPath, 'utf-8'),
      readFile(metadataPath, 'utf-8'),
    ])

    const parsedCatalog = JSON.parse(catalogContent) as MonocoFeetCatalogFile
    const parsedMetadata = JSON.parse(metadataContent) as MonocoFeetMetadataRow[]

    monocoFeetCatalog = parsedCatalog.MonocoFeet
    monocoFeetMetadata = parseMonocoFeetMetadata(parsedMetadata)

    console.log(
      `Loaded ${Object.keys(monocoFeetCatalog).length} Monoco feet with ${monocoFeetMetadata.size} metadata rows`,
    )
  } catch (error) {
    console.error('Failed to load Monoco feet data:', error)
    monocoFeetCatalog = {}
    monocoFeetMetadata = new Map()
  }
}

async function loadWeaponData() {
  if (weaponCatalog) {
    return
  }

  try {
    const catalogPath = getDataPath('weapons.json')
    console.log('Loading weapon catalog from:', catalogPath)

    const catalogContent = await readFile(catalogPath, 'utf-8')
    const parsedCatalog = JSON.parse(catalogContent) as WeaponCatalogFile
    weaponCatalog = parsedCatalog.Weapons

    console.log(`Loaded ${Object.keys(weaponCatalog).length} weapons`)
  } catch (error) {
    console.error('Failed to load weapon data:', error)
    weaponCatalog = {}
  }
}

export async function saveBossDatabase(newBoss: {
  originalName: string
  id: string
  category: string
  zone: string
}) {
  try {
    const dbPath = getDataPath('bossDatabase.json')
    const dbContent = await readFile(dbPath, 'utf-8')
    const parsedData = JSON.parse(dbContent) as BossDatabaseByZone

    if (!parsedData[newBoss.zone]) {
      parsedData[newBoss.zone] = []
    }

    const existingIndex = parsedData[newBoss.zone].findIndex(
      (boss) => boss.originalName === newBoss.originalName,
    )

    if (existingIndex >= 0) {
      parsedData[newBoss.zone][existingIndex] = {
        originalName: newBoss.originalName,
        id: newBoss.id,
        category: newBoss.category,
      }
    } else {
      parsedData[newBoss.zone].push({
        originalName: newBoss.originalName,
        id: newBoss.id,
        category: newBoss.category,
      })
    }

    await writeFile(dbPath, JSON.stringify(parsedData, null, 2), 'utf-8')
    console.log(`Boss added/updated: ${newBoss.id} in ${newBoss.zone}`)

    bossDatabase = []
    bossMap = null
    saveCache = null
    await loadBossDatabase()
  } catch (error) {
    console.error('Failed to save boss database:', error)
    throw error
  }
}

function createFallbackSnapshot(): SaveSnapshot {
  return {
    bosses: getMockBosses(),
    pictos:
      pictoCatalog && pictoAcquireInfo
        ? extractPictos({}, pictoCatalog, pictoAcquireInfo)
        : [],
    monocoFeet:
      monocoFeetCatalog && monocoFeetMetadata
        ? extractMonocoFeet({}, monocoFeetCatalog, monocoFeetMetadata)
        : [],
    journals:
      journalCatalog && journalLocations
        ? extractJournals({}, journalCatalog, journalLocations)
        : [],
    lostGestrals:
      lostGestralCatalog ? extractLostGestrals({}, lostGestralCatalog) : [],
    friendlyNevrons:
      friendlyNevronCatalog ? extractFriendlyNevrons({}, friendlyNevronCatalog) : [],
    weapons: weaponCatalog ? extractWeapons({}, weaponCatalog) : [],
    musicRecords: musicRecordCatalog ? extractMusicRecords({}, musicRecordCatalog) : [],
    location: null,
  }
}

function buildSaveSnapshot(saveData: SaveData): SaveSnapshot {
  return {
    bosses: extractBossesWithDatabase(saveData),
    pictos:
      pictoCatalog && pictoAcquireInfo
        ? extractPictos(saveData, pictoCatalog, pictoAcquireInfo)
        : [],
    monocoFeet:
      monocoFeetCatalog && monocoFeetMetadata
        ? extractMonocoFeet(saveData, monocoFeetCatalog, monocoFeetMetadata)
        : [],
    journals:
      journalCatalog && journalLocations
        ? extractJournals(saveData, journalCatalog, journalLocations)
        : [],
    lostGestrals:
      lostGestralCatalog ? extractLostGestrals(saveData, lostGestralCatalog) : [],
    friendlyNevrons:
      friendlyNevronCatalog
        ? extractFriendlyNevrons(saveData, friendlyNevronCatalog)
        : [],
    weapons: weaponCatalog ? extractWeapons(saveData, weaponCatalog) : [],
    musicRecords: musicRecordCatalog
      ? extractMusicRecords(saveData, musicRecordCatalog)
      : [],
    location: locationCatalog ? extractCurrentLocation(saveData, locationCatalog) : null,
  }
}

export async function parseSaveFile(savePath: string): Promise<SaveSnapshot> {
  await loadBossDatabase()
  await loadLocationData()
  await loadPictoData()
  await loadJournalData()
  await loadLostGestralData()
  await loadFriendlyNevronData()
  await loadMusicRecordData()
  await loadMonocoFeetData()
  await loadWeaponData()

  try {
    const stats = await stat(savePath)
    const currentMtime = stats.mtimeMs

    if (
      saveCache &&
      saveCache.savePath === savePath &&
      saveCache.mtime === currentMtime
    ) {
      console.log('Using cached save snapshot (file unchanged)')
      return saveCache.snapshot
    }

    const isDev = process.env.NODE_ENV === 'development' || !process.resourcesPath
    const uesavePath = isDev
      ? join(__dirname, '../tools/uesave.exe')
      : join(process.resourcesPath!, 'tools', 'uesave.exe')

    console.log('Looking for uesave.exe at:', uesavePath)

    try {
      await readFile(uesavePath)
    } catch (error) {
      console.error('uesave.exe not found at:', uesavePath)
      throw new Error(
        'uesave.exe not found. Please ensure tools/uesave.exe exists in the application directory.',
        { cause: error },
      )
    }

    const tempJsonPath = join(tmpdir(), `save_${Date.now()}.json`)

    try {
      await execFileAsync(uesavePath, [
        'to-json',
        '--input',
        savePath,
        '--output',
        tempJsonPath,
      ])

      const jsonContent = await readFile(tempJsonPath, 'utf-8')
      const saveData = JSON.parse(jsonContent) as SaveData
      const snapshot = buildSaveSnapshot(saveData)

      saveCache = {
        savePath,
        mtime: currentMtime,
        snapshot,
      }
      console.log('Save snapshot parsed and cached')

      return snapshot
    } catch (error) {
      console.error('Error executing uesave:', error)
      return createFallbackSnapshot()
    } finally {
      await unlink(tempJsonPath).catch(() => {})
    }
  } catch (error) {
    console.error('Error in parseSaveFile:', error)
    return createFallbackSnapshot()
  }
}

function normalizeEnemyName(name: string): string {
  const parts = name.split('_')
  const lastPart = parts[parts.length - 1]

  if (lastPart && (lastPart.length === 32 || lastPart.length === 33)) {
    return parts.slice(0, -1).join('_')
  }

  return name
}

function extractBossesWithDatabase(saveData: SaveData): Boss[] {
  if (bossDatabase.length === 0 || !bossMap) {
    console.warn('Boss database not loaded, using mock data')
    return getMockBosses()
  }

  const battledEnemies = saveData?.root?.properties?.BattledEnemies_0?.Map ?? []
  const encounteredEnemies =
    saveData?.root?.properties?.EncounteredEnemies_0?.Map ?? []
  const transientEnemies =
    saveData?.root?.properties?.TransientBattledEnemies_0?.Map ?? []

  const killedEnemiesSet = new Set<string>()
  battledEnemies.forEach((enemy) => {
    if (enemy.value.Bool === true) {
      killedEnemiesSet.add(enemy.key.Name)
    }
  })
  transientEnemies.forEach((enemy) => {
    if (enemy.value.Bool === true) {
      killedEnemiesSet.add(enemy.key.Name)
    }
  })

  const allSaveEnemies = new Set<string>()
  battledEnemies.forEach((enemy) => allSaveEnemies.add(enemy.key.Name))
  encounteredEnemies.forEach((enemy) => allSaveEnemies.add(enemy.key.Name))
  transientEnemies.forEach((enemy) => allSaveEnemies.add(enemy.key.Name))

  const saveEnemyNormalizedMap = new Map<string, string>()
  for (const enemyName of allSaveEnemies) {
    const normalized = normalizeEnemyName(enemyName)
    saveEnemyNormalizedMap.set(normalized, enemyName)
  }

  const bossList: Boss[] = []
  const processedSaveEnemies = new Set<string>()

  for (const boss of bossDatabase) {
    let saveEnemyName: string | undefined

    if (allSaveEnemies.has(boss.originalName)) {
      saveEnemyName = boss.originalName
    } else {
      const normalized = normalizeEnemyName(boss.originalName)
      saveEnemyName = saveEnemyNormalizedMap.get(normalized)

      if (saveEnemyName) {
        console.log(
          `Matched ${saveEnemyName} to ${boss.originalName} (normalized)`,
        )
      }
    }

    if (boss.zone === 'Hidden') {
      if (saveEnemyName) {
        processedSaveEnemies.add(saveEnemyName)
        console.log(`Hidden boss processed: ${boss.id} (will not appear)`)
      } else {
        console.log(`Hidden boss not in save: ${boss.id}`)
      }
      continue
    }

    if (saveEnemyName) {
      processedSaveEnemies.add(saveEnemyName)

      bossList.push({
        name: boss.id,
        killed: killedEnemiesSet.has(saveEnemyName),
        encountered: true,
        category: boss.category,
        zone: boss.zone,
        originalName: saveEnemyName,
      })
    } else {
      const excludedZones = ['Sans zone', 'Hidden', '? � d�finir']
      if (!excludedZones.includes(boss.zone)) {
        bossList.push({
          name: boss.id,
          killed: false,
          encountered: false,
          category: boss.category,
          zone: boss.zone,
          originalName: boss.originalName,
        })
      }
    }
  }

  console.log(
    `Extracted ${bossList.length} bosses (${allSaveEnemies.size} from save, ${bossList.length - allSaveEnemies.size} manual)`,
  )
  console.log(`${killedEnemiesSet.size} killed`)
  return bossList
}

function getMockBosses(): Boss[] {
  return [
    {
      name: 'Boss Mime',
      killed: true,
      encountered: true,
      category: 'Mime',
      zone: 'Test Zone',
    },
    {
      name: 'Boss Petank',
      killed: false,
      encountered: true,
      category: 'Petank',
      zone: 'Test Zone',
    },
    {
      name: 'Alpha Enemy',
      killed: false,
      encountered: false,
      category: 'Alpha',
      zone: 'Test Zone 2',
    },
    {
      name: 'Merchant Test',
      killed: true,
      encountered: true,
      category: 'Merchant',
      zone: 'Test Zone 2',
    },
  ]
}
