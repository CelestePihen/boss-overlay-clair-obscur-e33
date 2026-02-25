import { useState } from 'react'

import { useI18n } from '../i18n'

interface BossInfoFormProps {
  boss: {
    name: string
    originalName: string
    category?: string
    zone?: string
    killed?: boolean
    encountered?: boolean
  }
  onSubmit: (info: {
    originalName: string
    displayName: string
    category: string
    zone: string
  }) => void
  onCancel: () => void
  isEditMode?: boolean
}

export function BossInfoForm({
  boss,
  onSubmit,
  onCancel,
  isEditMode = false,
}: BossInfoFormProps) {
  const { t, translateCategory } = useI18n()
  const [displayName, setDisplayName] = useState(boss.name)
  const [zone, setZone] = useState(boss.zone || '')
  const [category, setCategory] = useState(boss.category || 'Boss')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (displayName && zone) {
      onSubmit({
        originalName: boss.originalName,
        displayName,
        category,
        zone,
      })
    }
  }

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.9)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: '20px',
      }}
    >
      <div
        style={{
          backgroundColor: '#1a1a1a',
          borderRadius: '12px',
          padding: '30px',
          maxWidth: '500px',
          width: '100%',
          border: '2px solid #3498db',
          position: 'relative',
        }}
      >
        <h2
          style={{
            color: '#3498db',
            marginBottom: '20px',
            fontSize: '24px',
            textAlign: 'center',
          }}
        >
          {isEditMode ? t('bossForm.editTitle') : t('bossForm.addTitle')}
        </h2>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '20px' }}>
            <label
              style={{
                display: 'block',
                color: '#ccc',
                marginBottom: '8px',
                fontSize: '14px',
              }}
            >
              {t('bossForm.technicalName')}
            </label>
            <input
              type="text"
              value={boss.originalName}
              readOnly
              style={{
                width: '100%',
                padding: '10px',
                backgroundColor: '#2a2a2a',
                border: '1px solid #444',
                borderRadius: '6px',
                color: '#888',
                fontSize: '12px',
                fontFamily: 'monospace',
              }}
            />
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label
              style={{
                display: 'block',
                color: '#ccc',
                marginBottom: '8px',
                fontSize: '14px',
              }}
            >
              {t('bossForm.displayName')}
            </label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder={t('bossForm.displayNamePlaceholder')}
              required
              style={{
                width: '100%',
                padding: '10px',
                backgroundColor: '#2a2a2a',
                border: '2px solid #3498db',
                borderRadius: '6px',
                color: '#fff',
                fontSize: '16px',
              }}
            />
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label
              style={{
                display: 'block',
                color: '#ccc',
                marginBottom: '8px',
                fontSize: '14px',
              }}
            >
              {t('bossForm.zone')}
            </label>
            <input
              type="text"
              value={zone}
              onChange={(e) => setZone(e.target.value)}
              placeholder={t('bossForm.zonePlaceholder')}
              required
              style={{
                width: '100%',
                padding: '10px',
                backgroundColor: '#2a2a2a',
                border: '2px solid #3498db',
                borderRadius: '6px',
                color: '#fff',
                fontSize: '16px',
              }}
            />
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label
              style={{
                display: 'block',
                color: '#ccc',
                marginBottom: '8px',
                fontSize: '14px',
              }}
            >
              {t('bossForm.category')}
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              style={{
                width: '100%',
                padding: '10px',
                backgroundColor: '#2a2a2a',
                border: '1px solid #444',
                borderRadius: '6px',
                color: '#fff',
                fontSize: '16px',
              }}
            >
              <option value="Boss">{translateCategory('Boss')}</option>
              <option value="Mini-Boss">
                {translateCategory('Mini-Boss')}
              </option>
              <option value="Chromatic">
                {translateCategory('Chromatic')}
              </option>
              <option value="Mime">{translateCategory('Mime')}</option>
              <option value="Petank">{translateCategory('Petank')}</option>
              <option value="Merchant">{translateCategory('Merchant')}</option>
            </select>
          </div>

          <div
            style={{
              display: 'flex',
              gap: '10px',
              marginTop: '30px',
            }}
          >
            <button
              type="button"
              onClick={onCancel}
              style={{
                flex: 1,
                padding: '12px',
                backgroundColor: '#333',
                color: '#fff',
                border: 'none',
                borderRadius: '6px',
                fontSize: '16px',
                cursor: 'pointer',
                transition: 'background-color 0.2s',
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.backgroundColor = '#444')
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.backgroundColor = '#333')
              }
            >
              {t('bossForm.cancelButton')}
            </button>
            <button
              type="submit"
              style={{
                flex: 1,
                padding: '12px',
                backgroundColor: '#3498db',
                color: '#fff',
                border: 'none',
                borderRadius: '6px',
                fontSize: '16px',
                fontWeight: 'bold',
                cursor: 'pointer',
                transition: 'background-color 0.2s',
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.backgroundColor = '#5dade2')
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.backgroundColor = '#3498db')
              }
            >
              {t('bossForm.saveButton')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
