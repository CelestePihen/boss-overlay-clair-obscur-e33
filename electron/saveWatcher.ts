import chokidar, { FSWatcher } from 'chokidar'
import { parseSaveFile } from './saveParser.js'
import { readFile } from 'fs/promises'
import { existsSync } from 'fs'
import { join } from 'path'
import { app } from 'electron'

let currentWatcher: FSWatcher | null = null
let previousBossList: any[] = []
let currentSavePath: string | null = null
let currentCallback: ((bossList: Boss[], newlyKilled?: Boss[], unknownBosses?: Boss[]) => void) | null = null

interface Boss {
  name: string
  killed: boolean
  encountered: boolean
  category?: string
  zone?: string
  originalName?: string
  needsInfo?: boolean
}

interface ManualBossStates {
  [originalName: string]: {
    killed: boolean
    encountered: boolean
  }
}

// Charger les états manuels
async function loadManualStates(): Promise<ManualBossStates> {
  try {
    const manualStatesPath = join(app.getPath('userData'), 'manual-boss-states.json')
    if (existsSync(manualStatesPath)) {
      const data = await readFile(manualStatesPath, 'utf-8')
      return JSON.parse(data)
    }
  } catch (error) {
    console.warn('Could not load manual states in watcher:', error)
  }
  return {}
}

// Fusionner les boss de la sauvegarde avec les états manuels
async function mergeBossesWithManualStates(bossList: Boss[]): Promise<Boss[]> {
  const manualStates = await loadManualStates()
  
  return bossList.map(boss => {
    if (boss.originalName && manualStates[boss.originalName]) {
      return {
        ...boss,
        killed: manualStates[boss.originalName].killed,
        encountered: manualStates[boss.originalName].encountered
      }
    }
    return boss
  })
}

export function watchSaveFile(savePath: string, callback: (bossList: Boss[], newlyKilled?: Boss[], unknownBosses?: Boss[]) => void) {
  // Sauvegarder pour le refresh manuel
  currentSavePath = savePath
  currentCallback = callback
  
  // Fermer le watcher précédent s'il existe
  if (currentWatcher) {
    currentWatcher.close()
  }

  currentWatcher = chokidar.watch(savePath, {
    persistent: true,
    ignoreInitial: false
  })

  currentWatcher.on('change', async (path: string) => {
    let bossList = await parseSaveFile(path)
    
    // Fusionner avec les états manuels
    bossList = await mergeBossesWithManualStates(bossList)
    
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
    
    // Détecter les boss inconnus nouvellement tués (qui nécessitent des infos)
    const unknownBosses = newlyKilled.filter(boss => boss.needsInfo === true)
    
    previousBossList = bossList
    callback(bossList, newlyKilled.length > 0 ? newlyKilled : undefined, unknownBosses.length > 0 ? unknownBosses : undefined)
  })

  currentWatcher.on('add', async (path: string) => {
    let bossList = await parseSaveFile(path)
    
    // Fusionner avec les états manuels
    bossList = await mergeBossesWithManualStates(bossList)
    
    previousBossList = bossList
    callback(bossList)
  })

  currentWatcher.on('error', (error: unknown) => {
    console.error('Watcher error:', error)
  })

  // Ne retourne rien pour éviter le problème de clonage
}

/**
 * Force un refresh immédiat sans attendre un changement de fichier
 */
export async function refreshBossList() {
  if (currentSavePath && currentCallback) {
    console.log('Manual refresh triggered')
    let bossList = await parseSaveFile(currentSavePath)
    
    // Fusionner avec les états manuels
    bossList = await mergeBossesWithManualStates(bossList)
    
    // Pas de détection de nouveaux boss tués lors d'un refresh manuel
    previousBossList = bossList
    currentCallback(bossList)
  }
}