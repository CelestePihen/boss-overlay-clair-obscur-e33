import { contextBridge, ipcRenderer, IpcRendererEvent } from 'electron'

contextBridge.exposeInMainWorld('electronAPI', {
  startWatch: (savePath: string) => {
    return ipcRenderer.invoke('start-watch', savePath)
  },
  onBossUpdate: (callback: (bossList: any[]) => void) => {
    ipcRenderer.on('boss-update', (_event: IpcRendererEvent, bossList: any[]) =>
      callback(bossList),
    )
  },

  saveBossInfo: (bossInfo: {
    originalName: string
    displayName: string
    category: string
    zone: string
  }) => {
    return ipcRenderer.invoke('save-boss-info', bossInfo)
  },
  onRestoreSavePath: (callback: (savePath: string) => void) => {
    ipcRenderer.on(
      'restore-save-path',
      (_event: IpcRendererEvent, savePath: string) => callback(savePath),
    )
  },
  selectFile: () => {
    return ipcRenderer.invoke('select-file')
  },
  closeApp: () => {
    return ipcRenderer.invoke('close-app')
  },
  getConfig: () => {
    return ipcRenderer.invoke('get-config')
  },
  saveConfig: (config: any) => {
    return ipcRenderer.invoke('save-config', config)
  },
  getManualStates: (savePath: string) => {
    return ipcRenderer.invoke('get-manual-states', savePath)
  },
  saveManualState: (
    savePath: string,
    originalName: string,
    state: { killed: boolean; encountered: boolean },
  ) => {
    return ipcRenderer.invoke(
      'save-manual-state',
      savePath,
      originalName,
      state,
    )
  },
  clearManualStates: (savePath: string) => {
    return ipcRenderer.invoke('clear-manual-states', savePath)
  },
})
