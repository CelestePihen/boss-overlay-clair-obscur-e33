/// <reference types="vite/client" />

interface Window {
  electronAPI: {
    startWatch: (savePath: string) => Promise<void>
    onBossUpdate: (callback: (bossList: any) => void) => void
    onUnknownBossKilled: (callback: (boss: any) => void) => void
    saveBossInfo: (bossInfo: { originalName: string; displayName: string; category: string; zone: string }) => Promise<{ success: boolean; error?: string }>
    getLastZone: () => Promise<string>
    getLastWasHidden: () => Promise<boolean>
    onRestoreSavePath: (callback: (savePath: string) => void) => void
    selectFile: () => Promise<string | null>
    closeApp: () => void
    getManualStates: () => Promise<Record<string, { killed: boolean; encountered: boolean }>>
    saveManualState: (originalName: string, state: { killed: boolean; encountered: boolean }) => Promise<{ success: boolean; error?: string }>
  }
}