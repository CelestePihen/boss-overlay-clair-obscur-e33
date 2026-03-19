import chokidar, { FSWatcher } from 'chokidar'
import { app } from 'electron'
import { existsSync } from 'fs'
import { mkdir, readFile } from 'fs/promises'
import { basename, join } from 'path'

import type { Boss } from '../src/types/Boss.js'
import type { SaveSnapshot } from '../src/types/SaveSnapshot.js'
import { parseSaveFile } from './saveParser.js'

let currentWatcher: FSWatcher | null = null
let previousBossList: Boss[] = []
let currentSavePath: string | null = null
let currentCallback:
  | ((snapshot: SaveSnapshot, newlyKilled?: Boss[]) => void)
  | null = null

interface ManualBossStates {
  [originalName: string]: {
    killed: boolean
    encountered?: boolean
  }
}

const manualStatesDir = join(app.getPath('userData'), 'manual-states')

function getManualStatesPath(savePath: string): string {
  const saveFileName = basename(savePath, '.sav')
  return join(manualStatesDir, `${saveFileName}.json`)
}

async function loadManualStates(savePath: string): Promise<ManualBossStates> {
  try {
    if (!existsSync(manualStatesDir)) {
      await mkdir(manualStatesDir, { recursive: true })
    }

    const manualStatesPath = getManualStatesPath(savePath)
    if (existsSync(manualStatesPath)) {
      const data = await readFile(manualStatesPath, 'utf-8')
      const rawStates = JSON.parse(data)

      const states: ManualBossStates = {}
      for (const [key, value] of Object.entries(rawStates)) {
        if (key.startsWith('MANUAL_')) {
          states[key] = {
            killed: (value as { killed: boolean }).killed,
            encountered: true,
          }
        } else {
          states[key] = value as { killed: boolean; encountered?: boolean }
        }
      }
      return states
    }
  } catch (error) {
    console.warn('Could not load manual states in watcher:', error)
  }
  return {}
}

async function mergeSnapshotWithManualStates(
  savePath: string,
  snapshot: SaveSnapshot,
): Promise<SaveSnapshot> {
  const manualStates = await loadManualStates(savePath)

  const bosses = snapshot.bosses.map((boss) => {
    if (boss.originalName && manualStates[boss.originalName]) {
      const state = manualStates[boss.originalName]
      return {
        ...boss,
        killed: state.killed,
        encountered: state.encountered ?? boss.encountered,
      }
    }
    return boss
  })

  return {
    ...snapshot,
    bosses,
  }
}

export function watchSaveFile(
  savePath: string,
  callback: (snapshot: SaveSnapshot, newlyKilled?: Boss[]) => void,
) {
  currentSavePath = savePath
  currentCallback = callback

  if (currentWatcher) {
    currentWatcher.close()
  }

  currentWatcher = chokidar.watch(savePath, {
    persistent: true,
    ignoreInitial: true,
  })

  currentWatcher.on('ready', async () => {
    console.log('Watcher ready, loading initial save snapshot')
    let snapshot = await parseSaveFile(savePath)
    snapshot = await mergeSnapshotWithManualStates(savePath, snapshot)
    previousBossList = snapshot.bosses
    callback(snapshot)
  })

  currentWatcher.on('change', async (path: string) => {
    let snapshot = await parseSaveFile(path)
    snapshot = await mergeSnapshotWithManualStates(path, snapshot)

    const newlyKilled: Boss[] = []
    if (previousBossList.length > 0) {
      for (const boss of snapshot.bosses) {
        const previousBoss = previousBossList.find(
          (candidate) => candidate.originalName === boss.originalName,
        )

        if (previousBoss) {
          if (!previousBoss.killed && boss.killed) {
            newlyKilled.push(boss)
          }
        } else if (boss.killed) {
          newlyKilled.push(boss)
        }
      }
    }

    previousBossList = snapshot.bosses
    callback(snapshot, newlyKilled.length > 0 ? newlyKilled : undefined)
  })

  currentWatcher.on('error', (err) => {
    const error = err instanceof Error ? err : new Error(String(err))
    console.error('Watcher error:', error)
  })
}

export async function refreshBossList() {
  if (currentSavePath && currentCallback) {
    console.log('Manual refresh triggered')
    let snapshot = await parseSaveFile(currentSavePath)
    snapshot = await mergeSnapshotWithManualStates(currentSavePath, snapshot)

    previousBossList = snapshot.bosses
    currentCallback(snapshot)
  }
}
