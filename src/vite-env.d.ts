/// <reference types="vite/client" />

import type { Boss } from './types/Boss'

declare global {
  interface Window {
    electronAPI: {
      startWatch: (savePath: string) => Promise<void>
      onBossUpdate: (callback: (bossList: Boss[]) => void) => void
      saveBossInfo: (bossInfo: {
        originalName: string
        displayName: string
        category: string
        zone: string
      }) => Promise<{ success: boolean; error?: string }>
      onRestoreSavePath: (callback: (savePath: string) => void) => void
      selectFile: () => Promise<string | null>
      closeApp: () => void
      getConfig: () => Promise<{
        lastSavePath?: string
        allowManualEditAutoDetected?: boolean
        allowBossEditing?: boolean
        language?: string
      }>
      saveConfig: (config: {
        lastSavePath?: string
        allowManualEditAutoDetected?: boolean
        allowBossEditing?: boolean
        language?: string
      }) => Promise<{ success: boolean }>
      getManualStates: (
        savePath: string,
      ) => Promise<Record<string, { killed: boolean; encountered: boolean }>>
      saveManualState: (
        savePath: string,
        originalName: string,
        state: { killed: boolean; encountered: boolean },
      ) => Promise<{ success: boolean; error?: string }>
      clearManualStates: (
        savePath: string,
      ) => Promise<{ success: boolean; error?: string }>
    }
  }
}

export {}
