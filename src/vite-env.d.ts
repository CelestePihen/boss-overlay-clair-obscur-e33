/// <reference types="vite/client" />

import type { SaveSnapshot } from './types/SaveSnapshot'

declare global {
  interface Window {
    electronAPI: {
      startWatch: (
        savePath: string,
      ) => Promise<{ success: boolean; message: string }>
      onBossUpdate: (callback: (snapshot: SaveSnapshot) => void) => void
      saveBossInfo: (bossInfo: {
        originalName: string
        id: string
        category: string
        zone: string
      }) => Promise<{ success: boolean; error?: string }>
      onRestoreSavePath: (callback: (savePath: string) => void) => void
      selectFile: () => Promise<string | null>
      closeApp: () => void
      getConfig: () => Promise<{
        lastSavePath?: string
        allowManualEditAutoDetected?: boolean
        language?: string
        backgroundOpacity?: number
      }>
      saveConfig: (config: {
        lastSavePath?: string
        allowManualEditAutoDetected?: boolean
        language?: string
        backgroundOpacity?: number
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
