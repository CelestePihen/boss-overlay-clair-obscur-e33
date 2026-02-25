import { useEffect, useState } from 'react'

interface Props {
  onSavePathChange: (path: string) => void
  currentPath: string
  onConfigChange?: (config: {
    allowManualEditAutoDetected?: boolean
    allowBossEditing?: boolean
  }) => void
}

function Settings({ onSavePathChange, currentPath, onConfigChange }: Props) {
  const [path, setPath] = useState(currentPath)
  const [isClearing, setIsClearing] = useState(false)
  const [allowManualEdit, setAllowManualEdit] = useState(false)
  const [allowBossEditing, setAllowBossEditing] = useState(false)

  // Charger la config au montage
  useEffect(() => {
    if (window.electronAPI) {
      window.electronAPI.getConfig().then((config) => {
        setAllowManualEdit(config.allowManualEditAutoDetected ?? false)
        setAllowBossEditing(config.allowBossEditing ?? false)
      })
    }
  }, [])

  const handleSubmit = () => {
    if (path.trim()) {
      onSavePathChange(path)
    }
  }

  const handleBrowse = async () => {
    if (window.electronAPI) {
      const selectedPath = await window.electronAPI.selectFile()
      if (selectedPath) {
        setPath(selectedPath)
      }
    }
  }

  const handleToggleManualEdit = async (checked: boolean) => {
    setAllowManualEdit(checked)
    if (window.electronAPI) {
      const config = await window.electronAPI.getConfig()
      const newConfig = {
        ...config,
        allowManualEditAutoDetected: checked,
      }
      await window.electronAPI.saveConfig(newConfig)

      // Notifier App.tsx du changement immédiatement
      onConfigChange?.(newConfig)
    }
  }

  const handleToggleBossEditing = async (checked: boolean) => {
    setAllowBossEditing(checked)
    if (window.electronAPI) {
      const config = await window.electronAPI.getConfig()
      const newConfig = {
        ...config,
        allowBossEditing: checked,
      }
      await window.electronAPI.saveConfig(newConfig)

      // Notifier App.tsx du changement immédiatement
      onConfigChange?.(newConfig)
    }
  }

  const handleClearManualStates = async () => {
    if (!currentPath) {
      alert('Aucun fichier de sauvegarde sélectionné')
      return
    }

    const confirmed = confirm(
      'Voulez-vous vraiment réinitialiser les modifications manuelles de cette sauvegarde ?\n\n' +
        'Cela réinitialisera :\n' +
        '- Les modifications de statut que vous avez faites manuellement\n\n' +
        'Les boss ajoutés via le formulaire resteront dans la base de données.\n' +
        'Cette action est irréversible.',
    )

    if (!confirmed) return

    setIsClearing(true)
    try {
      if (window.electronAPI) {
        const result = await window.electronAPI.clearManualStates(currentPath)
        if (result.success) {
          alert('✅ Modifications manuelles réinitialisées avec succès!')
          // Recharger la page pour rafraîchir l'état
          window.location.reload()
        } else {
          alert(`❌ Erreur: ${result.error}`)
        }
      }
    } catch (error) {
      alert(`❌ Erreur: ${error}`)
    } finally {
      setIsClearing(false)
    }
  }

  return (
    <div className="settings">
      <h3>Paramètres</h3>

      <div className="setting-group">
        <label>Chemin du fichier de sauvegarde :</label>
        <div style={{ display: 'flex', gap: '8px' }}>
          <input
            type="text"
            value={path}
            onChange={(e) => setPath(e.target.value)}
            placeholder="C:\Users\...\AppData\Local\Sandfall\Saved\SaveGames\...\Expedition_x.sav"
            style={{ flex: 1 }}
          />
          <button
            onClick={handleBrowse}
            style={{ width: 'auto', height: '36px' }}
          >
            📁 Parcourir
          </button>
        </div>
        <button onClick={handleSubmit}>Démarrer la surveillance</button>
      </div>

      <div
        className="setting-group"
        style={{
          marginTop: '20px',
          borderTop: '1px solid rgba(255,255,255,0.1)',
          paddingTop: '20px',
        }}
      >
        <label
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            cursor: 'pointer',
          }}
        >
          <input
            type="checkbox"
            checked={allowManualEdit}
            onChange={(e) => handleToggleManualEdit(e.target.checked)}
            style={{ cursor: 'pointer', width: '18px', height: '18px' }}
          />
          <span>
            Autoriser la modification manuelle des boss détectés automatiquement
          </span>
        </label>
        <p
          style={{
            fontSize: '12px',
            color: '#95a5a6',
            marginTop: '8px',
            marginLeft: '28px',
          }}
        >
          Par défaut, seuls les boss ajoutés manuellement peuvent être modifiés.
          Activez cette option pour pouvoir corriger les boss détectés
          automatiquement depuis la sauvegarde.
        </p>

        <label
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            cursor: 'pointer',
            marginTop: '16px',
          }}
        >
          <input
            type="checkbox"
            checked={allowBossEditing}
            onChange={(e) => handleToggleBossEditing(e.target.checked)}
            style={{ cursor: 'pointer', width: '18px', height: '18px' }}
          />
          <span>Autoriser l'édition des informations des boss</span>
        </label>
        <p
          style={{
            fontSize: '12px',
            color: '#95a5a6',
            marginTop: '8px',
            marginLeft: '28px',
          }}
        >
          Affiche le bouton ✏️ pour modifier le nom, la zone et la catégorie des
          boss.
        </p>
      </div>

      {currentPath && (
        <div
          className="setting-group"
          style={{
            marginTop: '20px',
            borderTop: '1px solid rgba(255,255,255,0.1)',
            paddingTop: '20px',
          }}
        >
          <label style={{ color: '#e74c3c' }}>⚠️ Zone dangereuse :</label>
          <button
            onClick={handleClearManualStates}
            disabled={isClearing}
            style={{
              backgroundColor: '#e74c3c',
              color: 'white',
              cursor: isClearing ? 'not-allowed' : 'pointer',
              opacity: isClearing ? 0.6 : 1,
            }}
          >
            {isClearing
              ? '⏳ Suppression...'
              : '🗑️ Réinitialiser les modifications manuelles'}
          </button>
          <p style={{ fontSize: '12px', color: '#95a5a6', marginTop: '8px' }}>
            Supprime uniquement les changements de statut effectués manuellement
          </p>
        </div>
      )}

      <div className="info">
        <p>Entrez le chemin complet vers votre fichier de sauvegarde (.sav)</p>
        <p>
          L'overlay se mettra à jour automatiquement quand vous tuez un boss
        </p>
      </div>
    </div>
  )
}

export default Settings
