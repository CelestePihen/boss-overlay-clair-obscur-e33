import { useEffect, useState } from 'react'

import BossChecklist from './components/BossChecklist'
import { BossInfoForm } from './components/BossInfoForm'
import Settings from './components/Settings'
import { useI18n } from './i18n'
import { Boss } from './types/Boss'

function App() {
  const { t } = useI18n()
  const [bosses, setBosses] = useState<Boss[]>([])
  const [showSettings, setShowSettings] = useState(false)
  const [savePath, setSavePath] = useState('')
  const [editingBoss, setEditingBoss] = useState<Boss | null>(null)
  const [isAddingBoss, setIsAddingBoss] = useState(false)
  const [manualStates, setManualStates] = useState<
    Record<string, { killed: boolean; encountered: boolean }>
  >({})
  const [allowManualEdit, setAllowManualEdit] = useState(false)
  const [allowBossEditing, setAllowBossEditing] = useState(false)

  // Charger la config au démarrage
  useEffect(() => {
    if (window.electronAPI) {
      window.electronAPI.getConfig().then((config) => {
        setAllowManualEdit(config.allowManualEditAutoDetected ?? false)
        setAllowBossEditing(config.allowBossEditing ?? false)
      })
    }
  }, [])

  // Charger les états manuels quand le savePath change
  useEffect(() => {
    if (window.electronAPI && savePath) {
      window.electronAPI.getManualStates(savePath).then((states) => {
        setManualStates(states)
      })
    }
  }, [savePath])

  useEffect(() => {
    if (window.electronAPI) {
      // Écouter les mises à jour des boss
      window.electronAPI.onBossUpdate((bossList: Boss[]) => {
        // Fusionner avec les états manuels
        const mergedBosses = bossList.map((boss) => {
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
      })

      // Écouter la restauration du dernier chemin de sauvegarde
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
    allowBossEditing?: boolean
  }) => {
    if (config.allowManualEditAutoDetected !== undefined) {
      setAllowManualEdit(config.allowManualEditAutoDetected)
    }
    if (config.allowBossEditing !== undefined) {
      setAllowBossEditing(config.allowBossEditing)
    }
  }

  const handleSaveBossInfo = async (info: {
    originalName: string
    displayName: string
    category: string
    zone: string
  }) => {
    if (window.electronAPI) {
      const result = await window.electronAPI.saveBossInfo(info)
      if (result.success) {
        setEditingBoss(null)
        setIsAddingBoss(false)
        // Afficher une notification de succès
        console.log('Boss info saved successfully!')
      } else {
        alert(
          t('bossForm.saveError', { error: result.error || 'Unknown error' }),
        )
      }
    }
  }

  const handleCancelBossInfo = () => {
    setEditingBoss(null)
    setIsAddingBoss(false)
  }

  const handleEditBoss = (boss: Boss) => {
    setEditingBoss(boss)
  }

  const handleAddBoss = () => {
    setIsAddingBoss(true)
  }

  const handleToggleBoss = async (boss: Boss, killed: boolean) => {
    if (!boss.originalName || !savePath) return

    // Vérifier si c'est un boss manuel ou si l'option est activée
    const isManualBoss = boss.originalName.startsWith('MANUAL_')
    if (!isManualBoss && !allowManualEdit) {
      // Empêcher la modification des boss non-manuels si l'option est désactivée
      return
    }

    const newState = {
      killed,
      encountered: true, // Si on clique, c'est qu'on l'a rencontré
    }

    // Sauvegarder l'état manuel
    if (window.electronAPI) {
      await window.electronAPI.saveManualState(
        savePath,
        boss.originalName,
        newState,
      )
    }

    // Mettre à jour le state local
    setManualStates((prev) => ({
      ...prev,
      [boss.originalName!]: newState,
    }))

    // Mettre à jour la liste des boss immédiatement
    setBosses((prevBosses) =>
      prevBosses.map((b) =>
        b.originalName === boss.originalName ? { ...b, ...newState } : b,
      ),
    )
  }

  return (
    <div className="app">
      {/* Formulaire d'édition de boss existant */}
      {editingBoss && editingBoss.originalName && (
        <BossInfoForm
          boss={{
            name: editingBoss.name,
            originalName: editingBoss.originalName,
            category: editingBoss.category,
            zone: editingBoss.zone,
          }}
          onSubmit={handleSaveBossInfo}
          onCancel={handleCancelBossInfo}
          isEditMode={true}
        />
      )}

      {/* Formulaire d'ajout manuel de boss */}
      {isAddingBoss && (
        <BossInfoForm
          boss={{
            name: '',
            originalName: `MANUAL_${Date.now()}`, // ID unique pour les boss manuels
            category: 'Boss',
            zone: '',
          }}
          onSubmit={handleSaveBossInfo}
          onCancel={handleCancelBossInfo}
          isEditMode={false}
        />
      )}

      <div className="title-bar">
        <span>Boss Overlay</span>
        <div className="controls">
          <button onClick={() => setShowSettings(!showSettings)}>⚙️</button>
          <button onClick={() => window.electronAPI?.closeApp()}>✕</button>
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
          onEditBoss={allowBossEditing ? handleEditBoss : undefined}
          onAddBoss={handleAddBoss}
          onToggleBoss={handleToggleBoss}
          allowManualEdit={allowManualEdit}
        />
      )}
    </div>
  )
}

export default App
