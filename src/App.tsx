import { useState, useEffect } from 'react'
import BossChecklist from './components/BossChecklist'
import Settings from './components/Settings'
import { BossInfoForm } from './components/BossInfoForm'

interface Boss {
  name: string
  killed: boolean
  encountered: boolean
  category?: string
  zone?: string
  originalName?: string
  needsInfo?: boolean
}

function App() {
  const [bosses, setBosses] = useState<Boss[]>([])
  const [showSettings, setShowSettings] = useState(false)
  const [savePath, setSavePath] = useState('')
  const [unknownBoss, setUnknownBoss] = useState<Boss | null>(null)
  const [editingBoss, setEditingBoss] = useState<Boss | null>(null)
  const [isAddingBoss, setIsAddingBoss] = useState(false)
  const [manualStates, setManualStates] = useState<Record<string, { killed: boolean; encountered: boolean }>>({})

  // Charger les états manuels au démarrage
  useEffect(() => {
    if (window.electronAPI) {
      window.electronAPI.getManualStates().then(states => {
        setManualStates(states)
      })
    }
  }, [])

  useEffect(() => {
    if (window.electronAPI) {
      // Écouter les mises à jour des boss
      window.electronAPI.onBossUpdate((bossList: Boss[]) => {
        // Fusionner avec les états manuels
        const mergedBosses = bossList.map(boss => {
          if (boss.originalName && manualStates[boss.originalName]) {
            return {
              ...boss,
              killed: manualStates[boss.originalName].killed,
              encountered: manualStates[boss.originalName].encountered
            }
          }
          return boss
        })
        setBosses(mergedBosses)
      })

      // Écouter les boss inconnus tués
      window.electronAPI.onUnknownBossKilled((boss: Boss) => {
        setUnknownBoss(boss)
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

  const handleSaveBossInfo = async (info: { originalName: string; displayName: string; category: string; zone: string }) => {
    if (window.electronAPI) {
      const result = await window.electronAPI.saveBossInfo(info)
      if (result.success) {
        setUnknownBoss(null)
        setEditingBoss(null)
        setIsAddingBoss(false)
        // Afficher une notification de succès
        console.log('Boss info saved successfully!')
      } else {
        alert(`Erreur lors de la sauvegarde: ${result.error}`)
      }
    }
  }

  const handleCancelBossInfo = () => {
    setUnknownBoss(null)
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
    if (!boss.originalName) return

    const newState = {
      killed,
      encountered: true // Si on clique, c'est qu'on l'a rencontré
    }

    // Sauvegarder l'état manuel
    if (window.electronAPI) {
      await window.electronAPI.saveManualState(boss.originalName, newState)
    }

    // Mettre à jour le state local
    setManualStates(prev => ({
      ...prev,
      [boss.originalName!]: newState
    }))

    // Mettre à jour la liste des boss immédiatement
    setBosses(prevBosses => 
      prevBosses.map(b => 
        b.originalName === boss.originalName 
          ? { ...b, ...newState }
          : b
      )
    )
  }

  return (
    <div className="app">
      {/* Formulaire de boss inconnu (nouveau boss tué) */}
      {unknownBoss && unknownBoss.originalName && (
        <BossInfoForm
          boss={{
            name: unknownBoss.name,
            originalName: unknownBoss.originalName,
            category: unknownBoss.category,
            zone: unknownBoss.zone
          }}
          onSubmit={handleSaveBossInfo}
          onCancel={handleCancelBossInfo}
          isEditMode={false}
        />
      )}

      {/* Formulaire d'édition de boss existant */}
      {editingBoss && editingBoss.originalName && (
        <BossInfoForm
          boss={{
            name: editingBoss.name,
            originalName: editingBoss.originalName,
            category: editingBoss.category,
            zone: editingBoss.zone
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
            zone: ''
          }}
          onSubmit={handleSaveBossInfo}
          onCancel={handleCancelBossInfo}
          isEditMode={true}
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
        />
      ) : (
        <BossChecklist 
          bosses={bosses}
          onEditBoss={handleEditBoss}
          onAddBoss={handleAddBoss}
          onToggleBoss={handleToggleBoss}
        />
      )}
    </div>
  )
}

export default App