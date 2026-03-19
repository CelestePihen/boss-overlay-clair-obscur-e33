import { useEffect, useState } from 'react'

import { Language, useI18n } from '../i18n'
import {
  DEFAULT_BACKGROUND_OPACITY,
  normalizeBackgroundOpacity,
} from '../utils/backgroundOpacity'

interface Props {
  onSavePathChange: (path: string) => void
  currentPath: string
  onConfigChange?: (config: {
    allowManualEditAutoDetected?: boolean
    backgroundOpacity?: number
  }) => void
}

function Settings({ onSavePathChange, currentPath, onConfigChange }: Props) {
  const { language, setLanguage, t } = useI18n()
  const [path, setPath] = useState(currentPath)
  const [isClearing, setIsClearing] = useState(false)
  const [allowManualEdit, setAllowManualEdit] = useState(false)
  const [backgroundOpacity, setBackgroundOpacity] = useState(
    DEFAULT_BACKGROUND_OPACITY,
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
      onConfigChange?.(newConfig)
    }
  }

  const handleBackgroundOpacityChange = async (value: number) => {
    const normalized = normalizeBackgroundOpacity(value)
    setBackgroundOpacity(normalized)
    if (window.electronAPI) {
      const config = await window.electronAPI.getConfig()
      const newConfig = {
        ...config,
        backgroundOpacity: normalized,
      }
      await window.electronAPI.saveConfig(newConfig)
      onConfigChange?.(newConfig)
    }
  }

  const handleClearManualStates = async () => {
    if (!currentPath) {
      alert(t('settings.noSaveSelected'))
      return
    }

    const confirmed = confirm(t('settings.confirmClear'))

    if (!confirmed) return

    setIsClearing(true)
    try {
      if (window.electronAPI) {
        const result = await window.electronAPI.clearManualStates(currentPath)
        if (result.success) {
          alert(t('settings.clearSuccess'))
          window.location.reload()
        } else {
          alert(
            t('settings.clearError', {
              error: result.error || 'Unknown error',
            }),
          )
        }
      }
    } catch (error) {
      alert(t('settings.clearError', { error: String(error) }))
    } finally {
      setIsClearing(false)
    }
  }

  return (
    <div className="settings">
      <h3>{t('settings.title')}</h3>

      <div className="setting-group">
        <label>{t('settings.saveFilePath')}</label>
        <div style={{ display: 'flex', gap: '8px' }}>
          <input
            type="text"
            value={path}
            onChange={(e) => setPath(e.target.value)}
            placeholder={t('settings.saveFilePathPlaceholder')}
            style={{ flex: 1 }}
          />
          <button
            onClick={handleBrowse}
            style={{ width: 'auto', height: '36px' }}
          >
            {t('settings.browse')}
          </button>
        </div>
        <button onClick={handleSubmit}>{t('settings.startWatching')}</button>
      </div>

      <div
        className="setting-group"
        style={{
          marginTop: '20px',
          borderTop: '1px solid rgba(255,255,255,0.1)',
          paddingTop: '20px',
        }}
      >
        <label>{t('settings.backgroundOpacity')}</label>
        <input
          type="range"
          min="0"
          max="100"
          step="1"
          value={backgroundOpacity}
          onChange={(e) =>
            handleBackgroundOpacityChange(Number.parseInt(e.target.value, 10))
          }
          style={{ width: '100%', marginBottom: '8px' }}
        />
        <p style={{ fontSize: '12px', color: '#95a5a6' }}>
          {t('settings.backgroundOpacityValue', {
            value: backgroundOpacity.toString(),
          })}
        </p>
      </div>

      <div
        className="setting-group"
        style={{
          marginTop: '20px',
          borderTop: '1px solid rgba(255,255,255,0.1)',
          paddingTop: '20px',
        }}
      >
        <label>{t('settings.language')}</label>
        <select
          value={language}
          onChange={(e) => setLanguage(e.target.value as Language)}
          style={{
            width: '100%',
            padding: '10px',
            backgroundColor: '#2a2a2a',
            border: '2px solid #3498db',
            borderRadius: '6px',
            color: '#fff',
            fontSize: '16px',
            cursor: 'pointer',
          }}
        >
          <option value="fr">Français</option>
          <option value="en">English</option>
          <option value="ru">Русский</option>
        </select>
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
          <span>{t('settings.allowManualEdit')}</span>
        </label>
        <p
          style={{
            fontSize: '12px',
            color: '#95a5a6',
            marginTop: '8px',
            marginLeft: '28px',
          }}
        >
          {t('settings.allowManualEditDesc')}
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
          <label style={{ color: '#e74c3c' }}>{t('settings.dangerZone')}</label>
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
              ? t('settings.clearing')
              : t('settings.clearManualStates')}
          </button>
          <p style={{ fontSize: '12px', color: '#95a5a6', marginTop: '8px' }}>
            {t('settings.clearManualStatesDesc')}
          </p>
        </div>
      )}

      <div className="info">
        <p>{t('settings.info1')}</p>
        <p>{t('settings.info2')}</p>
      </div>
    </div>
  )
}

export default Settings
