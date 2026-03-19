import { CSSProperties, useEffect, useMemo, useState } from 'react'

import BossChecklist from './components/BossChecklist'
import type { ChecklistFilterMode } from './components/checklistModel'
import {
  type ChecklistFeatureKey,
  type ChecklistFeatureVisibility,
  DEFAULT_CHECKLIST_FEATURE_VISIBILITY,
} from './components/checklistVisibility'
import Settings from './components/Settings'
import { Boss } from './types/Boss'
import { CurrentLocation } from './types/CurrentLocation'
import { JournalEntry } from './types/JournalEntry'
import { LostGestralEntry } from './types/LostGestralEntry'
import { MonocoFoot } from './types/MonocoFoot'
import { MusicRecordEntry } from './types/MusicRecordEntry'
import { Picto } from './types/Picto'
import { SaveSnapshot } from './types/SaveSnapshot'
import { WeaponEntry } from './types/WeaponEntry'
import {
  DEFAULT_BACKGROUND_OPACITY,
  getOverlayTheme,
  normalizeBackgroundOpacity,
} from './utils/backgroundOpacity'

const SETTINGS_ICON = '\u2699\uFE0F'
const CLOSE_ICON = '\u2715'

function App() {
  const [bosses, setBosses] = useState<Boss[]>([])
  const [pictos, setPictos] = useState<Picto[]>([])
  const [monocoFeet, setMonocoFeet] = useState<MonocoFoot[]>([])
  const [journals, setJournals] = useState<JournalEntry[]>([])
  const [lostGestrals, setLostGestrals] = useState<LostGestralEntry[]>([])
  const [friendlyNevrons, setFriendlyNevrons] = useState<SaveSnapshot['friendlyNevrons']>([])
  const [weapons, setWeapons] = useState<WeaponEntry[]>([])
  const [musicRecords, setMusicRecords] = useState<MusicRecordEntry[]>([])
  const [location, setLocation] = useState<CurrentLocation | null>(null)
  const [showSettings, setShowSettings] = useState(false)
  const [savePath, setSavePath] = useState('')
  const [manualStates, setManualStates] = useState<
    Record<string, { killed: boolean; encountered: boolean }>
  >({})
  const [allowManualEdit, setAllowManualEdit] = useState(false)
  const [backgroundOpacity, setBackgroundOpacity] = useState(
    DEFAULT_BACKGROUND_OPACITY,
  )
  const [checklistFilterMode, setChecklistFilterMode] =
    useState<ChecklistFilterMode>('all')
  const [featureVisibility, setFeatureVisibility] = useState<ChecklistFeatureVisibility>(
    DEFAULT_CHECKLIST_FEATURE_VISIBILITY,
  )

  useEffect(() => {
    if (window.electronAPI) {
      window.electronAPI.getConfig().then((config) => {
        setAllowManualEdit(config.allowManualEditAutoDetected ?? false)
        setBackgroundOpacity(
          normalizeBackgroundOpacity(config.backgroundOpacity),
        )
      })
    }
  }, [])

  useEffect(() => {
    if (window.electronAPI && savePath) {
      window.electronAPI.getManualStates(savePath).then((states) => {
        setManualStates(states)
      })
    }
  }, [savePath])

  useEffect(() => {
    if (window.electronAPI) {
      window.electronAPI.onBossUpdate((snapshot: SaveSnapshot) => {
        const mergedBosses = snapshot.bosses.map((boss) => {
          if (boss.originalName && manualStates[boss.originalName]) {
            return {
              ...boss,
              killed: manualStates[boss.originalName].killed,
              encountered: manualStates[boss.originalName].encountered,
            }
          }
          return boss
        })

        setBosses(mergedBosses)
        setPictos(snapshot.pictos)
        setMonocoFeet(snapshot.monocoFeet)
        setJournals(snapshot.journals)
        setLostGestrals(snapshot.lostGestrals)
        setFriendlyNevrons(snapshot.friendlyNevrons)
        setWeapons(snapshot.weapons)
        setMusicRecords(snapshot.musicRecords)
        setLocation(snapshot.location)
      })

      window.electronAPI.onRestoreSavePath((path: string) => {
        setSavePath(path)
        window.electronAPI.startWatch(path)
      })
    }
  }, [manualStates])

  const handleStartWatch = (path: string) => {
    setSavePath(path)
    if (window.electronAPI) {
      window.electronAPI.startWatch(path)
    }

    setShowSettings(false)
  }

  const handleConfigChange = (config: {
    allowManualEditAutoDetected?: boolean
    backgroundOpacity?: number
  }) => {
    if (config.allowManualEditAutoDetected !== undefined) {
      setAllowManualEdit(config.allowManualEditAutoDetected)
    }
    if (config.backgroundOpacity !== undefined) {
      setBackgroundOpacity(normalizeBackgroundOpacity(config.backgroundOpacity))
    }
  }

  const handleToggleBoss = async (boss: Boss, killed: boolean) => {
    if (!boss.originalName || !savePath) return

    const isManualBoss = boss.originalName.startsWith('MANUAL_')
    if (!isManualBoss && !allowManualEdit) {
      return
    }

    const newState = {
      killed,
      encountered: true,
    }

    if (window.electronAPI) {
      await window.electronAPI.saveManualState(
        savePath,
        boss.originalName,
        newState,
      )
    }

    setManualStates((prev) => ({
      ...prev,
      [boss.originalName!]: newState,
    }))

    setBosses((prevBosses) =>
      prevBosses.map((candidate) =>
        candidate.originalName === boss.originalName
          ? { ...candidate, ...newState }
          : candidate,
      ),
    )
  }


  const handleToggleFeatureVisibility = (feature: ChecklistFeatureKey) => {
    setFeatureVisibility((prev) => ({
      ...prev,
      [feature]: !prev[feature],
    }))
  }

  const overlayTheme = useMemo(
    () => getOverlayTheme(backgroundOpacity),
    [backgroundOpacity],
  )

  const appStyle = useMemo(
    () =>
      ({
        background: overlayTheme.backgroundColor,
        ...overlayTheme.cssVariables,
      }) as CSSProperties,
    [overlayTheme],
  )

  return (
    <div className="app" style={appStyle}>
      <div className="title-bar">
        <span>Boss Overlay</span>
        <div className="controls">
          <button onClick={() => setShowSettings(!showSettings)}>{SETTINGS_ICON}</button>
          <button onClick={() => window.electronAPI?.closeApp()}>{CLOSE_ICON}</button>
        </div>
      </div>

      {showSettings ? (
        <Settings
          onSavePathChange={handleStartWatch}
          currentPath={savePath}
          onConfigChange={handleConfigChange}
        />
      ) : (
        <BossChecklist
          bosses={bosses}
          pictos={pictos}
          monocoFeet={monocoFeet}
          journals={journals}
          lostGestrals={lostGestrals}
          friendlyNevrons={friendlyNevrons}
          weapons={weapons}
          musicRecords={musicRecords}
          currentLocation={location}
          filterMode={checklistFilterMode}
          onFilterModeChange={setChecklistFilterMode}
          featureVisibility={featureVisibility}
          onToggleFeatureVisibility={handleToggleFeatureVisibility}
          onToggleBoss={handleToggleBoss}
          allowManualEdit={allowManualEdit}
        />
      )}
    </div>
  )
}

export default App
