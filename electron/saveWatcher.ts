import chokidar, { FSWatcher } from 'chokidar'
import { parseSaveFile } from './saveParser.js'
import { readFile, mkdir } from 'fs/promises'
import { existsSync } from 'fs'
import { join, basename } from 'path'
import { app } from 'electron'

let currentWatcher: FSWatcher | null = null
let previousBossList: any[] = []
let currentSavePath: string | null = null
let currentCallback: ((bossList: Boss[], newlyKilled?: Boss[]) => void) | null = null

interface Boss {
  name: string
  killed: boolean
  encountered: boolean
  category?: string
  zone?: string
  originalName?: string
}

interface ManualBossStates {
  [originalName: string]: {
    killed: boolean
    encountered?: boolean  // Optionnel : absent pour les MANUAL_*, présent pour les autres
  }
}

const manualStatesDir = join(app.getPath('userData'), 'manual-states')

// Générer le chemin du fichier d'états manuels basé sur le nom de la sauvegarde
function getManualStatesPath(savePath: string): string {
  const saveFileName = basename(savePath, '.sav')
  return join(manualStatesDir, `${saveFileName}.json`)
}

// Charger les états manuels
async function loadManualStates(savePath: string): Promise<ManualBossStates> {
  try {
    // Créer le dossier s'il n'existe pas
    if (!existsSync(manualStatesDir)) {
      await mkdir(manualStatesDir, { recursive: true })
    }
    
    const manualStatesPath = getManualStatesPath(savePath)
    if (existsSync(manualStatesPath)) {
      const data = await readFile(manualStatesPath, 'utf-8')
      const rawStates = JSON.parse(data)
      
      // Ajouter automatiquement encountered: true pour les boss MANUAL_*
      const states: ManualBossStates = {}
      for (const [key, value] of Object.entries(rawStates)) {
        if (key.startsWith('MANUAL_')) {
          states[key] = {
            killed: (value as any).killed,
            encountered: true
          }
        } else {
          states[key] = value as any
        }
      }
      return states
    }
  } catch (error) {
    console.warn('Could not load manual states in watcher:', error)
  }
  return {}
}

// Fusionner les boss de la sauvegarde avec les états manuels
async function mergeBossesWithManualStates(savePath: string, bossList: Boss[]): Promise<Boss[]> {
  const manualStates = await loadManualStates(savePath)
  
  return bossList.map(boss => {
    if (boss.originalName && manualStates[boss.originalName]) {
      const state = manualStates[boss.originalName]
      return {
        ...boss,
        killed: state.killed,
        encountered: state.encountered ?? boss.encountered  // Utiliser encountered du state si présent
      }
    }
    return boss
  })
}

export function watchSaveFile(savePath: string, callback: (bossList: Boss[], newlyKilled?: Boss[]) => void) {
  // Sauvegarder pour le refresh manuel
  currentSavePath = savePath
  currentCallback = callback
  
  // Fermer le watcher précédent s'il existe
  if (currentWatcher) {
    currentWatcher.close()
  }

  currentWatcher = chokidar.watch(savePath, {
    persistent: true,
    ignoreInitial: true
  })

  // Charger une seule fois au démarrage quand le watcher est prêt
  currentWatcher.on('ready', async () => {
    console.log('Watcher ready, loading initial boss list')
    let bossList = await parseSaveFile(savePath)
    bossList = await mergeBossesWithManualStates(savePath, bossList)
    previousBossList = bossList
    callback(bossList)
  })

  currentWatcher.on('change', async (path: string) => {
    let bossList: Boss[] = await parseSaveFile(path)
    
    // Fusionner avec les états manuels
    bossList = await mergeBossesWithManualStates(path, bossList)
    
    // Détecter les boss nouvellement tués
    const newlyKilled: Boss[] = []
    if (previousBossList.length > 0) {
      for (const boss of bossList) {
        // Utiliser originalName pour la comparaison (plus fiable)
        const previousBoss = previousBossList.find(b => b.originalName === boss.originalName)
        
        if (previousBoss) {
          // Boss existait déjà : vérifier s'il vient d'être tué
          if (!previousBoss.killed && boss.killed) {
            newlyKilled.push(boss)
          }
        } else {
          // Boss n'existait pas dans previousBossList : c'est un nouveau boss rencontré
          // S'il est déjà tué, c'est qu'on vient de le tuer
          if (boss.killed) {
            newlyKilled.push(boss)
          }
        }
      }
    }
    
    previousBossList = bossList
    callback(bossList, newlyKilled.length > 0 ? newlyKilled : undefined)
  })

  currentWatcher.on('error', (error: unknown) => {
    console.error('Watcher error:', error)
  })
}

/**
 * Force un refresh immédiat sans attendre un changement de fichier
 */
export async function refreshBossList() {
  if (currentSavePath && currentCallback) {
    console.log('Manual refresh triggered')
    let bossList = await parseSaveFile(currentSavePath)
    
    // Fusionner avec les états manuels
    bossList = await mergeBossesWithManualStates(currentSavePath, bossList)
    
    // Pas de détection de nouveaux boss tués lors d'un refresh manuel
    previousBossList = bossList
    currentCallback(bossList)
  }
}