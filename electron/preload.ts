const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
  startWatch: (savePath: string) => {
    return ipcRenderer.invoke('start-watch', savePath)
  },
  onBossUpdate: (callback: (bossList: any) => void) => {
    ipcRenderer.on('boss-update', (_event: any, bossList: any) => callback(bossList))
  },
  onUnknownBossKilled: (callback: (boss: any) => void) => {
    ipcRenderer.on('unknown-boss-killed', (_event: any, boss: any) => callback(boss))
  },
  saveBossInfo: (bossInfo: { originalName: string; displayName: string; category: string; zone: string }) => {
    return ipcRenderer.invoke('save-boss-info', bossInfo)
  },
  getLastZone: () => {
    return ipcRenderer.invoke('get-last-zone')
  },
  getLastWasHidden: () => {
    return ipcRenderer.invoke('get-last-was-hidden')
  },
  onRestoreSavePath: (callback: (savePath: string) => void) => {
    ipcRenderer.on('restore-save-path', (_event: any, savePath: string) => callback(savePath))
  },
  selectFile: () => {
    return ipcRenderer.invoke('select-file')
  },
  closeApp: () => {
    return ipcRenderer.invoke('close-app')
  },
  getManualStates: () => {
    return ipcRenderer.invoke('get-manual-states')
  },
  saveManualState: (originalName: string, state: { killed: boolean; encountered: boolean }) => {
    return ipcRenderer.invoke('save-manual-state', originalName, state)
  }
})