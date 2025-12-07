import { useState, useEffect } from 'react'

interface BossInfoFormProps {
  boss: {
    name: string
    originalName: string
    category?: string
    zone?: string
    killed?: boolean
    encountered?: boolean
  }
  onSubmit: (info: { originalName: string; displayName: string; category: string; zone: string }) => void
  onCancel: () => void
  isEditMode?: boolean
}

export function BossInfoForm({ boss, onSubmit, onCancel, isEditMode = false }: BossInfoFormProps) {
  const [displayName, setDisplayName] = useState(boss.name)
  const [zone, setZone] = useState(boss.zone || '')
  const [category, setCategory] = useState(boss.category || 'Other')
  const [shouldDisplay, setShouldDisplay] = useState(boss.zone !== 'Hidden')
  const [timeLeft, setTimeLeft] = useState(10)
  const [timerActive, setTimerActive] = useState(!isEditMode)

  // Charger les préférences au montage (seulement si pas en mode édition)
  useEffect(() => {
    if (isEditMode) return // En mode édition, on garde les valeurs du boss
    
    const loadPreferences = async () => {
      if (window.electronAPI) {
        const lastZone = await window.electronAPI.getLastZone()
        const lastWasHidden = await window.electronAPI.getLastWasHidden()
        
        if (lastWasHidden) {
          setShouldDisplay(false)
        } else if (lastZone) {
          setZone(lastZone)
        }
      }
    }
    loadPreferences()
  }, [isEditMode])

  // Timer de 10 secondes pour auto-hide
  useEffect(() => {
    if (!timerActive) return
    
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          // Quand le timer arrive à 0 : TOUJOURS mettre dans Hidden
          // Utiliser le nom normalisé (sans hash) pour cacher tous les ennemis du même type
          const normalizedName = normalizeEnemyName(boss.originalName)
          onSubmit({
            originalName: normalizedName, // Stocker le nom normalisé, pas le hash exact
            displayName: displayName || boss.name,
            category: 'Other',
            zone: 'Hidden'
          })
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [boss.originalName, boss.name, displayName, onSubmit, timerActive])

  // Fonction pour normaliser un nom (retirer le hash)
  const normalizeEnemyName = (name: string): string => {
    const parts = name.split('_')
    const lastPart = parts[parts.length - 1]
    
    // Si la dernière partie est un hash (32-33 caractères)
    if (lastPart && (lastPart.length === 32 || lastPart.length === 33)) {
      return parts.slice(0, -1).join('_')
    }
    
    return name
  }

  // Arrêter le timer lors d'une interaction
  const stopTimer = () => {
    setTimerActive(false)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    // Si shouldDisplay est décoché, ça va dans Hidden avec nom normalisé
    // Sinon, il faut une zone et on garde le nom exact
    if (displayName && (!shouldDisplay || zone)) {
      const finalOriginalName = shouldDisplay 
        ? boss.originalName  // Zone normale : garder le nom exact
        : normalizeEnemyName(boss.originalName)  // Hidden : utiliser le nom normalisé
      
      onSubmit({
        originalName: finalOriginalName,
        displayName,
        category,
        zone: shouldDisplay ? zone : 'Hidden'
      })
    }
  }

  return (
    <>
      <style>
        {`
          @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.5; }
          }
        `}
      </style>
      <div style={{
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
        padding: '20px'
      }}>
        <div style={{
        backgroundColor: '#1a1a1a',
        borderRadius: '12px',
        padding: '30px',
        maxWidth: '500px',
        width: '100%',
        border: '2px solid #ffd700',
        position: 'relative'
      }}>
        {/* Timer en haut à droite */}
        {timerActive && (
          <div style={{
            position: 'absolute',
            top: '15px',
            right: '15px',
            backgroundColor: timeLeft <= 3 ? '#ff4444' : '#ffd700',
            color: '#000',
            padding: '8px 12px',
            borderRadius: '20px',
            fontWeight: 'bold',
            fontSize: '14px',
            animation: timeLeft <= 3 ? 'pulse 0.5s infinite' : 'none'
          }}>
            ⏱️ {timeLeft}s
          </div>
        )}

        <h2 style={{ 
          color: '#ffd700', 
          marginBottom: '20px',
          fontSize: '24px',
          textAlign: 'center'
        }}>
          {isEditMode ? '✏️ Modifier le boss' : '🎯 Boss inconnu vaincu !'}
        </h2>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '20px' }}>
            <label style={{ 
              display: 'block', 
              color: '#ccc', 
              marginBottom: '8px',
              fontSize: '14px'
            }}>
              Nom technique :
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
                fontFamily: 'monospace'
              }}
            />
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ 
              display: 'block', 
              color: '#ccc', 
              marginBottom: '8px',
              fontSize: '14px'
            }}>
              Nom à afficher * :
            </label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => {
                setDisplayName(e.target.value)
                stopTimer()
              }}
              onFocus={stopTimer}
              placeholder="Ex: Mime du Bois Sacré"
              required
              style={{
                width: '100%',
                padding: '10px',
                backgroundColor: '#2a2a2a',
                border: '2px solid #ffd700',
                borderRadius: '6px',
                color: '#fff',
                fontSize: '16px'
              }}
            />
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ 
              display: 'block', 
              color: '#ccc', 
              marginBottom: '8px',
              fontSize: '14px'
            }}>
              Zone {shouldDisplay && '* '}: 
            </label>
            <input
              type="text"
              value={zone}
              onChange={(e) => {
                setZone(e.target.value)
                stopTimer()
              }}
              onFocus={stopTimer}
              placeholder="Ex: Lumiere - Prologue"
              required={shouldDisplay}
              style={{
                width: '100%',
                padding: '10px',
                backgroundColor: '#2a2a2a',
                border: '2px solid #ffd700',
                borderRadius: '6px',
                color: '#fff',
                fontSize: '16px'
              }}
            />
            {!shouldDisplay && (
              <small style={{ color: '#888', display: 'block', marginTop: '5px' }}>
                ℹ️ Optionnel quand "Afficher" est décoché (ira dans Hidden)
              </small>
            )}
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ 
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              color: '#ccc',
              fontSize: '14px',
              cursor: 'pointer',
              padding: '10px',
              backgroundColor: '#2a2a2a',
              borderRadius: '6px',
              border: '1px solid #444'
            }}>
              <input
                type="checkbox"
                checked={shouldDisplay}
                onChange={(e) => {
                  setShouldDisplay(e.target.checked)
                  stopTimer()
                }}
                style={{
                  width: '18px',
                  height: '18px',
                  cursor: 'pointer'
                }}
              />
              <span>
                ✅ Afficher dans la liste (décochez si c'est juste un ennemi normal)
              </span>
            </label>
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ 
              display: 'block', 
              color: '#ccc', 
              marginBottom: '8px',
              fontSize: '14px'
            }}>
              Catégorie :
            </label>
            <select
              value={category}
              onChange={(e) => {
                setCategory(e.target.value)
                stopTimer()
              }}
              onFocus={stopTimer}
              style={{
                width: '100%',
                padding: '10px',
                backgroundColor: '#2a2a2a',
                border: '1px solid #444',
                borderRadius: '6px',
                color: '#fff',
                fontSize: '16px'
              }}
            >
              <option value="Boss">Boss</option>
              <option value="Mini-Boss">Mini-Boss</option>
              <option value="Chromatic">Chromatic</option>
              <option value="Mime">Mime</option>
              <option value="Petank">Petank</option>
              <option value="Merchant">Merchant</option>
              <option value="Other">Other</option>
            </select>
          </div>

          <div style={{ 
            display: 'flex', 
            gap: '10px', 
            marginTop: '30px' 
          }}>
            <button
              type="button"
              onClick={() => {
                stopTimer()
                onCancel()
              }}
              style={{
                flex: 1,
                padding: '12px',
                backgroundColor: '#333',
                color: '#fff',
                border: 'none',
                borderRadius: '6px',
                fontSize: '16px',
                cursor: 'pointer',
                transition: 'background-color 0.2s'
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#444'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#333'}
            >
              Plus tard
            </button>
            <button
              type="submit"
              style={{
                flex: 1,
                padding: '12px',
                backgroundColor: '#ffd700',
                color: '#000',
                border: 'none',
                borderRadius: '6px',
                fontSize: '16px',
                fontWeight: 'bold',
                cursor: 'pointer',
                transition: 'background-color 0.2s'
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#ffed4e'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#ffd700'}
            >
              ✅ Enregistrer
            </button>
          </div>
        </form>
      </div>
    </div>
    </>
  )
}
