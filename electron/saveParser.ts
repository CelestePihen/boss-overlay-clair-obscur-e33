import { execFile } from 'child_process'
import { readFile, stat, unlink, writeFile } from 'fs/promises'
import { tmpdir } from 'os'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'
import { promisify } from 'util'

const execFileAsync = promisify(execFile)

// Fix pour __dirname en ES modules
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Charger la base de données de boss (format organisé par zone uniquement)
let bossDatabase: Array<{
  originalName: string
  displayName: string
  category: string
  zone: string
}> = []
let bossMap: Map<
  string,
  { displayName: string; category: string; zone: string }
> | null = null

// Type pour le format organisé par zone
type BossDatabaseByZone = Record<
  string,
  Array<{ originalName: string; displayName: string; category: string }>
>

// Cache pour éviter les reconversions inutiles
interface SaveCache {
  savePath: string
  mtime: number // Timestamp de dernière modification
  bossList: Boss[]
}
let saveCache: SaveCache | null = null

async function loadBossDatabase() {
  if (bossDatabase.length === 0) {
    try {
      const isDev =
        process.env.NODE_ENV === 'development' || !process.resourcesPath
      const dbPath = isDev
        ? join(__dirname, '../data/bossDatabase.json')
        : join(process.resourcesPath!, 'data', 'bossDatabase.json')

      console.log('Loading boss database from:', dbPath)
      const dbContent = await readFile(dbPath, 'utf-8')
      const parsedData = JSON.parse(dbContent) as BossDatabaseByZone

      // Format organisé par zone uniquement
      console.log('Loading boss database (zone-organized format)')
      bossDatabase = []
      for (const [zoneName, bosses] of Object.entries(parsedData)) {
        for (const boss of bosses) {
          bossDatabase.push({
            ...boss,
            zone: zoneName,
          })
        }
      }

      // Créer un index Map pour les lookups rapides par originalName
      bossMap = new Map()
      for (const boss of bossDatabase) {
        bossMap.set(boss.originalName, {
          displayName: boss.displayName,
          category: boss.category,
          zone: boss.zone,
        })
      }

      console.log(`Loaded ${bossDatabase.length} boss entries`)
    } catch (error) {
      console.error('Failed to load boss database:', error)
    }
  }
}

/**
 * Sauvegarder la base de données mise à jour
 */
export async function saveBossDatabase(newBoss: {
  originalName: string
  displayName: string
  category: string
  zone: string
}) {
  try {
    const isDev =
      process.env.NODE_ENV === 'development' || !process.resourcesPath
    const dbPath = isDev
      ? join(__dirname, '../data/bossDatabase.json')
      : join(process.resourcesPath!, 'data', 'bossDatabase.json')

    // Lire le fichier actuel
    const dbContent = await readFile(dbPath, 'utf-8')
    const parsedData = JSON.parse(dbContent) as BossDatabaseByZone

    // Ajouter le boss dans sa nouvelle zone
    if (!parsedData[newBoss.zone]) {
      parsedData[newBoss.zone] = []
    }

    // Vérifier si le boss existe déjà dans la zone cible
    const existingIndex = parsedData[newBoss.zone].findIndex(
      (b) => b.originalName === newBoss.originalName,
    )
    if (existingIndex >= 0) {
      // Mettre à jour le boss existant
      parsedData[newBoss.zone][existingIndex] = {
        originalName: newBoss.originalName,
        displayName: newBoss.displayName,
        category: newBoss.category,
      }
    } else {
      // Ajouter le nouveau boss
      parsedData[newBoss.zone].push({
        originalName: newBoss.originalName,
        displayName: newBoss.displayName,
        category: newBoss.category,
      })
    }

    // Sauvegarder le fichier
    await writeFile(dbPath, JSON.stringify(parsedData, null, 2), 'utf-8')
    console.log(`Boss added/updated: ${newBoss.displayName} in ${newBoss.zone}`)

    // Recharger la base de données en mémoire ET invalider le cache de save
    bossDatabase = []
    bossMap = null
    saveCache = null // IMPORTANT: invalider le cache pour forcer le re-parse
    await loadBossDatabase()
  } catch (error) {
    console.error('Failed to save boss database:', error)
    throw error
  }
}

interface Boss {
  name: string
  killed: boolean
  encountered: boolean
  category?: string
  zone?: string
  originalName?: string // Pour identifier les boss inconnus
  needsInfo?: boolean // Flag pour indiquer qu'il faut remplir les infos
}

interface SaveData {
  root: {
    properties: {
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

/**
 * Parse le fichier .sav en utilisant uesave-cli avec cache
 */
export async function parseSaveFile(savePath: string): Promise<Boss[]> {
  // Charger la base de données
  await loadBossDatabase()

  try {
    // Vérifier le cache : si le fichier n'a pas changé, retourner les données en cache
    const stats = await stat(savePath)
    const currentMtime = stats.mtimeMs

    if (
      saveCache &&
      saveCache.savePath === savePath &&
      saveCache.mtime === currentMtime
    ) {
      console.log('Using cached boss list (file unchanged)')
      return saveCache.bossList
    }

    // Chemin vers uesave.exe
    // En dev: __dirname = electron/, donc ../tools/uesave.exe
    // En prod packagé: __dirname = resources/app.asar/dist-electron/, donc ../../tools/uesave.exe
    // Mais avec extraResources dans electron-builder, c'est dans resources/tools/
    const isDev =
      process.env.NODE_ENV === 'development' || !process.resourcesPath
    const uesavePath = isDev
      ? join(__dirname, '../tools/uesave.exe')
      : join(process.resourcesPath!, 'tools', 'uesave.exe')

    console.log('Looking for uesave.exe at:', uesavePath)

    // Vérifier que uesave.exe existe
    try {
      await readFile(uesavePath)
    } catch (error) {
      console.error('uesave.exe not found at:', uesavePath)
      throw new Error(
        `uesave.exe not found. Please ensure tools/uesave.exe exists in the application directory.`,
        { cause: error },
      )
    }

    // Créer un fichier JSON temporaire
    const tempJsonPath = join(tmpdir(), `save_${Date.now()}.json`)

    try {
      // Convertir .sav vers JSON avec uesave
      // Syntaxe correcte : uesave to-json --input file.sav --output file.json

      await execFileAsync(uesavePath, [
        'to-json',
        '--input',
        savePath,
        '--output',
        tempJsonPath,
      ])

      // Lire le JSON
      const jsonContent = await readFile(tempJsonPath, 'utf-8')
      const saveData: SaveData = JSON.parse(jsonContent)

      // Parser les boss avec la base de données
      const bossList = extractBossesWithDatabase(saveData)

      // Mettre à jour le cache
      saveCache = {
        savePath,
        mtime: currentMtime,
        bossList,
      }
      console.log('Boss list parsed and cached')

      // Nettoyer le fichier temporaire
      await unlink(tempJsonPath).catch(() => {})

      return bossList
    } catch (error) {
      console.error('Error executing uesave:', error)
      // Si uesave n'est pas disponible, retourner des données de test
      return getMockBosses()
    }
  } catch (error) {
    console.error('Error in parseSaveFile:', error)
    return getMockBosses()
  }
}

/**
 * Normalise un nom d'ennemi en retirant le hash/GUID final
 * Ex: "ObjectID_..._C_4DFD38854045646F8DC570BDF56675B6" -> "ObjectID_..._C"
 */
function normalizeEnemyName(name: string): string {
  const parts = name.split('_')
  const lastPart = parts[parts.length - 1]

  // Si la dernière partie est un hash (32-33 caractères alphanumériques)
  if (lastPart && (lastPart.length === 32 || lastPart.length === 33)) {
    return parts.slice(0, -1).join('_')
  }

  return name
}

/**
 * Extrait les boss en utilisant la base de données et les données de la sauvegarde
 * Affiche :
 * - Les boss présents dans la sauvegarde (encountered: true)
 * - Les boss ajoutés manuellement dans les zones personnalisées (encountered: false)
 */
function extractBossesWithDatabase(saveData: SaveData): Boss[] {
  // Si la base de données n'est pas chargée, retourner les données de test
  if (bossDatabase.length === 0 || !bossMap) {
    console.warn('Boss database not loaded, using mock data')
    return getMockBosses()
  }

  // Récupérer les listes d'ennemis de la sauvegarde
  const battledEnemies = saveData?.root?.properties?.BattledEnemies_0?.Map || []
  const encounteredEnemies =
    saveData?.root?.properties?.EncounteredEnemies_0?.Map || []
  const transientEnemies =
    saveData?.root?.properties?.TransientBattledEnemies_0?.Map || []

  // Créer un Set des ennemis tués (nom original)
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

  // Collecter TOUS les ennemis présents dans la sauvegarde
  const allSaveEnemies = new Set<string>()
  battledEnemies.forEach((enemy) => allSaveEnemies.add(enemy.key.Name))
  encounteredEnemies.forEach((enemy) => allSaveEnemies.add(enemy.key.Name))
  transientEnemies.forEach((enemy) => allSaveEnemies.add(enemy.key.Name))

  // Créer un index pour retrouver les ennemis de la save par nom normalisé
  const saveEnemyNormalizedMap = new Map<string, string>() // nom normalisé -> nom exact dans save
  for (const enemyName of allSaveEnemies) {
    const normalized = normalizeEnemyName(enemyName)
    saveEnemyNormalizedMap.set(normalized, enemyName)
  }

  // Parcourir la base de données dans l'ordre pour préserver l'ordre du JSON
  const bossList: Boss[] = []
  const processedSaveEnemies = new Set<string>()

  for (const boss of bossDatabase) {
    // Chercher si ce boss est dans la save (match exact ou normalisé)
    let saveEnemyName: string | undefined

    // Match exact
    if (allSaveEnemies.has(boss.originalName)) {
      saveEnemyName = boss.originalName
    } else {
      // Match normalisé (sans le hash)
      const normalized = normalizeEnemyName(boss.originalName)
      saveEnemyName = saveEnemyNormalizedMap.get(normalized)

      if (saveEnemyName) {
        console.log(
          `Matched ${saveEnemyName} to ${boss.originalName} (normalized)`,
        )
      }
    }

    // Ne JAMAIS afficher les boss de "Hidden", même s'ils sont dans la save
    if (boss.zone === 'Hidden') {
      if (saveEnemyName) {
        processedSaveEnemies.add(saveEnemyName)
        console.log(
          `Hidden boss processed: ${boss.displayName} (will not appear)`,
        )
      } else {
        console.log(`Hidden boss not in save: ${boss.displayName}`)
      }
      continue
    }

    if (saveEnemyName) {
      // Boss présent dans la sauvegarde
      processedSaveEnemies.add(saveEnemyName)

      bossList.push({
        name: boss.displayName,
        killed: killedEnemiesSet.has(saveEnemyName),
        encountered: true,
        category: boss.category,
        zone: boss.zone,
        originalName: saveEnemyName,
      })
    } else {
      // Boss manuel (pas dans la save)
      // Ne pas afficher les zones exclues
      const excludedZones = ['Sans zone', 'Hidden', '❓ À définir']
      if (!excludedZones.includes(boss.zone)) {
        bossList.push({
          name: boss.displayName,
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

/**
 * Données de test si uesave n'est pas disponible
 */
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
