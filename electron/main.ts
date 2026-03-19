import { app, BrowserWindow, ipcMain, screen } from 'electron'
import { existsSync } from 'fs'
import { access, mkdir, readFile, writeFile } from 'fs/promises'
import { basename, dirname, join } from 'path'
import { fileURLToPath } from 'url'

import { saveBossDatabase } from './saveParser.js'
import { refreshBossList, watchSaveFile } from './saveWatcher.js'
import { getRestoredWindowPosition } from './windowState.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const configPath = join(app.getPath('userData'), 'config.json')
const manualStatesDir = join(app.getPath('userData'), 'manual-states')

function getManualStatesPath(savePath: string): string {
  const saveFileName = basename(savePath, '.sav')
  return join(manualStatesDir, `${saveFileName}.json`)
}

interface AppConfig {
  lastSavePath?: string
  allowManualEditAutoDetected?: boolean
  language?: string
  backgroundOpacity?: number
  windowX?: number
  windowY?: number
}

interface ManualBossStates {
  [originalName: string]: {
    killed: boolean
    encountered?: boolean
  }
}

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
    console.warn('Could not load manual states:', error)
  }
  return {}
}

async function saveManualStates(
  savePath: string,
  states: ManualBossStates,
): Promise<void> {
  try {
    if (!existsSync(manualStatesDir)) {
      await mkdir(manualStatesDir, { recursive: true })
    }

    const statesToSave: Record<string, { killed: boolean; encountered?: boolean }> = {}
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
let windowStateSaveTimeout: NodeJS.Timeout | null = null

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

async function persistWindowPosition() {
  if (!mainWindow || mainWindow.isDestroyed()) {
    return
  }

  const [x, y] = mainWindow.getPosition()
  const config = await loadConfig()
  config.windowX = x
  config.windowY = y
  await saveConfig(config)
}

function queueWindowPositionSave() {
  if (windowStateSaveTimeout) {
    clearTimeout(windowStateSaveTimeout)
  }

  windowStateSaveTimeout = setTimeout(() => {
    void persistWindowPosition()
  }, 150)
}

function createWindow(config: AppConfig = {}) {
  const isDev =
    process.env.NODE_ENV === 'development' || process.argv.includes('--dev')
  const preloadPath = join(__dirname, 'preload.js')
  const restoredPosition = getRestoredWindowPosition(
    { x: config.windowX, y: config.windowY },
    screen.getAllDisplays().map((display) => display.workArea),
  )

  console.log('Preload path:', preloadPath)
  console.log('__dirname:', __dirname)

  mainWindow = new BrowserWindow({
    width: 725,
    height: 1000,
    ...restoredPosition,
    transparent: true,
    frame: false,
    alwaysOnTop: false,
    resizable: true,
    webPreferences: {
      preload: preloadPath,
      nodeIntegration: false,
      contextIsolation: true,
    },
  })

  mainWindow.once('ready-to-show', () => {
    void persistWindowPosition()
  })

  mainWindow.on('move', () => {
    queueWindowPositionSave()
  })

  mainWindow.on('close', () => {
    if (windowStateSaveTimeout) {
      clearTimeout(windowStateSaveTimeout)
      windowStateSaveTimeout = null
    }
    void persistWindowPosition()
  })

  mainWindow.on('closed', () => {
    mainWindow = null
  })

  if (isDev) {
    console.log('Loading in DEV mode from localhost:5173')
    mainWindow.loadURL('http://localhost:5173')
    mainWindow.webContents.openDevTools()
  } else {
    const htmlPath = join(__dirname, '..', 'dist', 'index.html')
    mainWindow.loadFile(htmlPath)
  }

  mainWindow.webContents.on(
    'did-fail-load',
    (_event, errorCode, errorDescription) => {
      console.error('Failed to load:', errorCode, errorDescription)
    },
  )
}

app.whenReady().then(async () => {
  const uesaveExists = await validateUesave()
  if (!uesaveExists) {
    console.warn(
      'WARNING: uesave.exe not found. The save parser will not work correctly.',
    )
    console.warn(
      'Please ensure tools/uesave.exe exists in the application directory.',
    )
  }

  const config = await loadConfig()
  createWindow(config)

  if (config.lastSavePath && existsSync(config.lastSavePath)) {
    mainWindow?.webContents.once('did-finish-load', () => {
      mainWindow?.webContents.send('restore-save-path', config.lastSavePath)
    })
  }

  app.on('activate', async () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow(await loadConfig())
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

ipcMain.handle('start-watch', async (_event, savePath: string) => {
  const config = await loadConfig()
  config.lastSavePath = savePath
  await saveConfig(config)

  watchSaveFile(savePath, (snapshot) => {
    mainWindow?.webContents.send('boss-update', snapshot)
  })
  return { success: true, message: 'Watching started' }
})

ipcMain.handle(
  'save-boss-info',
  async (
    _event,
    bossInfo: {
      originalName: string
      id: string
      category: string
      zone: string
    },
  ) => {
    try {
      await saveBossDatabase(bossInfo)
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

  const localAppData =
    process.env.LOCALAPPDATA ||
    join(process.env.USERPROFILE || '', 'AppData', 'Local')
  const defaultPath = join(localAppData, 'Sandfall', 'Saved', 'SaveGames')

  const result = await dialog.showOpenDialog(mainWindow!, {
    properties: ['openFile'],
    defaultPath,
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

ipcMain.handle('save-config', async (_event, config: AppConfig) => {
  await saveConfig(config)
  return { success: true }
})

ipcMain.handle('get-manual-states', async (_event, savePath: string) => {
  if (!savePath) return {}
  return await loadManualStates(savePath)
})

ipcMain.handle(
  'save-manual-state',
  async (
    _event,
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

ipcMain.handle('clear-manual-states', async (_event, savePath: string) => {
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

    await refreshBossList()

    return { success: true }
  } catch (error) {
    console.error('Failed to clear manual states:', error)
    return { success: false, error: String(error) }
  }
})
