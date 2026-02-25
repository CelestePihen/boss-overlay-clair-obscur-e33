import { app, BrowserWindow, ipcMain, Notification } from 'electron'
import { existsSync } from 'fs'
import { access, mkdir, readFile, writeFile } from 'fs/promises'
import { basename, dirname, join } from 'path'
import { fileURLToPath } from 'url'

import { saveBossDatabase } from './saveParser.js'
import { refreshBossList, watchSaveFile } from './saveWatcher.js'

// Fix pour __dirname en ES modules
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Chemin des fichiers de configuration
const configPath = join(app.getPath('userData'), 'config.json')
const manualStatesDir = join(app.getPath('userData'), 'manual-states')

// Générer le chemin du fichier d'états manuels basé sur le nom de la sauvegarde
function getManualStatesPath(savePath: string): string {
  const saveFileName = basename(savePath, '.sav')
  return join(manualStatesDir, `${saveFileName}.json`)
}

interface AppConfig {
  lastSavePath?: string
  allowManualEditAutoDetected?: boolean // Autoriser la modification manuelle des boss détectés automatiquement
  allowBossEditing?: boolean // Autoriser l'édition des informations des boss (nom, zone, catégorie)
}

interface ManualBossStates {
  [originalName: string]: {
    killed: boolean
    encountered?: boolean // Optionnel : absent pour les MANUAL_*, présent pour les autres
  }
}

// Charger la configuration
async function loadConfig(): Promise<AppConfig> {
  try {
    if (existsSync(configPath)) {
      const data = await readFile(configPath, 'utf-8')
      return JSON.parse(data)
    }
  } catch (error) {
    console.warn('Could not load config:', error)
  }
  return {}
}

// Sauvegarder la configuration
async function saveConfig(config: AppConfig): Promise<void> {
  try {
    const userDataPath = app.getPath('userData')
    if (!existsSync(userDataPath)) {
      await mkdir(userDataPath, { recursive: true })
    }
    await writeFile(configPath, JSON.stringify(config, null, 2), 'utf-8')
  } catch (error) {
    console.error('Could not save config:', error)
  }
}

// Charger les états manuels des boss
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
            killed: (value as unknown).killed,
            encountered: true,
          }
        } else {
          states[key] = value as unknown
        }
      }
      return states
    }
  } catch (error) {
    console.warn('Could not load manual states:', error)
  }
  return {}
}

// Sauvegarder les états manuels des boss
async function saveManualStates(
  savePath: string,
  states: ManualBossStates,
): Promise<void> {
  try {
    // Créer le dossier s'il n'existe pas
    if (!existsSync(manualStatesDir)) {
      await mkdir(manualStatesDir, { recursive: true })
    }

    // Pour les boss MANUAL_*, on ne sauvegarde que le champ killed
    const statesToSave: unknown = {}
    for (const [key, value] of Object.entries(states)) {
      if (key.startsWith('MANUAL_')) {
        statesToSave[key] = { killed: value.killed }
      } else {
        statesToSave[key] = value
      }
    }

    const manualStatesPath = getManualStatesPath(savePath)
    await writeFile(
      manualStatesPath,
      JSON.stringify(statesToSave, null, 2),
      'utf-8',
    )
  } catch (error) {
    console.error('Could not save manual states:', error)
  }
}

let mainWindow: BrowserWindow | null = null

async function validateUesave(): Promise<boolean> {
  try {
    const isDev =
      process.env.NODE_ENV === 'development' || !process.resourcesPath
    const uesavePath = isDev
      ? join(__dirname, '../tools/uesave.exe')
      : join(process.resourcesPath!, 'tools', 'uesave.exe')

    console.log('Validating uesave.exe at:', uesavePath)
    await access(uesavePath)
    return true
  } catch (_error) {
    console.error('uesave.exe not found in tools/ directory')
    return false
  }
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 600,
    height: 700,
    transparent: true,
    frame: false,
    alwaysOnTop: false,
    resizable: true,
    webPreferences: {
      preload: join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
  })

  // En production, charger les fichiers buildés
  // En dev, charger depuis le serveur Vite
  const isDev =
    process.env.NODE_ENV === 'development' || process.argv.includes('--dev')

  if (isDev) {
    console.log('Loading in DEV mode from localhost:5173')
    mainWindow.loadURL('http://localhost:5173')
    mainWindow.webContents.openDevTools()
  } else {
    // Dans l'app packagée, __dirname = resources/app.asar/dist-electron
    // Le index.html est dans resources/app.asar/dist/index.html
    // Donc on remonte d'un niveau puis on va dans dist/
    const htmlPath = join(__dirname, '..', 'dist', 'index.html')
    console.log('Loading in PROD mode from:', htmlPath)
    console.log('__dirname:', __dirname)
    mainWindow.loadFile(htmlPath)
    // Ne pas ouvrir devtools en production
  }

  // Log des erreurs de chargement
  mainWindow.webContents.on(
    'did-fail-load',
    (event, errorCode, errorDescription) => {
      console.error('Failed to load:', errorCode, errorDescription)
    },
  )
}

app.whenReady().then(async () => {
  // Valider la présence de uesave.exe au démarrage
  const uesaveExists = await validateUesave()
  if (!uesaveExists) {
    console.warn(
      'WARNING: uesave.exe not found. The save parser will not work correctly.',
    )
    console.warn(
      'Please ensure tools/uesave.exe exists in the application directory.',
    )
  }

  createWindow()

  // Charger la configuration et restaurer le dernier fichier .sav
  const config = await loadConfig()
  if (config.lastSavePath && existsSync(config.lastSavePath)) {
    // Attendre que la fenêtre soit prête
    mainWindow?.webContents.once('did-finish-load', () => {
      mainWindow?.webContents.send('restore-save-path', config.lastSavePath)
    })
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// IPC handlers
ipcMain.handle('start-watch', async (event, savePath: string) => {
  // Sauvegarder le chemin du fichier dans la config
  const config = await loadConfig()
  config.lastSavePath = savePath
  await saveConfig(config)

  watchSaveFile(savePath, (bossList, newlyKilled) => {
    mainWindow?.webContents.send('boss-update', bossList)

    // Afficher une notification pour les boss nouvellement tués
    if (newlyKilled && newlyKilled.length > 0) {
      for (const boss of newlyKilled) {
        const notification = new Notification({
          title: '🎯 Boss vaincu !',
          body: `${boss.name}${boss.zone ? ` (${boss.zone})` : ''}`,
          silent: false,
        })
        notification.show()
      }
    }
  })
  // Retourner une valeur simple au lieu d'une fonction
  return { success: true, message: 'Watching started' }
})

ipcMain.handle(
  'save-boss-info',
  async (
    event,
    bossInfo: {
      originalName: string
      displayName: string
      category: string
      zone: string
    },
  ) => {
    try {
      await saveBossDatabase(bossInfo)

      // Forcer un refresh immédiat de la liste
      await refreshBossList()

      return { success: true }
    } catch (error) {
      console.error('Failed to save boss info:', error)
      return { success: false, error: String(error) }
    }
  },
)

ipcMain.handle('select-file', async () => {
  const { dialog } = await import('electron')

  // Construire le chemin par défaut vers le dossier de sauvegardes du jeu
  const localAppData =
    process.env.LOCALAPPDATA ||
    join(process.env.USERPROFILE || '', 'AppData', 'Local')
  const defaultPath = join(localAppData, 'Sandfall', 'Saved', 'SaveGames')

  const result = await dialog.showOpenDialog(mainWindow!, {
    properties: ['openFile'],
    defaultPath: defaultPath,
    filters: [
      { name: 'Save Files', extensions: ['sav'] },
      { name: 'All Files', extensions: ['*'] },
    ],
  })

  if (!result.canceled && result.filePaths.length > 0) {
    return result.filePaths[0]
  }
  return null
})

ipcMain.handle('close-app', () => {
  app.quit()
})

ipcMain.handle('get-config', async () => {
  return await loadConfig()
})

ipcMain.handle('save-config', async (event, config: AppConfig) => {
  await saveConfig(config)
  return { success: true }
})

ipcMain.handle('get-manual-states', async (event, savePath: string) => {
  if (!savePath) return {}
  return await loadManualStates(savePath)
})

ipcMain.handle(
  'save-manual-state',
  async (
    event,
    savePath: string,
    originalName: string,
    state: { killed: boolean; encountered: boolean },
  ) => {
    try {
      if (!savePath) {
        return { success: false, error: 'No save path provided' }
      }
      const states = await loadManualStates(savePath)
      states[originalName] = state
      await saveManualStates(savePath, states)
      return { success: true }
    } catch (error) {
      console.error('Failed to save manual state:', error)
      return { success: false, error: String(error) }
    }
  },
)

ipcMain.handle('clear-manual-states', async (event, savePath: string) => {
  try {
    if (!savePath) {
      return { success: false, error: 'No save path provided' }
    }
    const manualStatesPath = getManualStatesPath(savePath)
    if (existsSync(manualStatesPath)) {
      const { unlink } = await import('fs/promises')
      await unlink(manualStatesPath)
      console.log('Manual states cleared for:', savePath)
    }

    // Forcer un refresh immédiat de la liste
    await refreshBossList()

    return { success: true }
  } catch (error) {
    console.error('Failed to clear manual states:', error)
    return { success: false, error: String(error) }
  }
})
