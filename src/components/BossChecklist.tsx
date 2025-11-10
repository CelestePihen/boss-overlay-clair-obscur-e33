import { useState, useMemo } from 'react'

interface Boss {
  name: string
  killed: boolean
  encountered: boolean
  category?: string
  zone?: string
}

interface Props {
  bosses: Boss[]
  onEditBoss?: (boss: Boss) => void
  onAddBoss?: () => void
  onToggleBoss?: (boss: Boss, killed: boolean) => void
}

interface ZoneGroup {
  zoneName: string
  bosses: Boss[]
  killed: number
  encountered: number
  total: number
}

function BossChecklist({ bosses, onEditBoss, onAddBoss, onToggleBoss }: Props) {
  const [searchTerm, setSearchTerm] = useState('')
  const [filterMode, setFilterMode] = useState<'all' | 'alive' | 'killed' | 'encountered'>('all')
  const [collapsedZones, setCollapsedZones] = useState<Set<string>>(new Set())

  // Grouper les boss par zone
  const zoneGroups = useMemo(() => {
    const groups = new Map<string, Boss[]>()
    
    bosses.forEach(boss => {
      const zoneName = boss.zone || 'Uncategorized'
      // Ne pas afficher les boss de la zone "Hidden"
      if (zoneName === 'Hidden') return
      
      if (!groups.has(zoneName)) {
        groups.set(zoneName, [])
      }
      groups.get(zoneName)!.push(boss)
    })

    // Convertir en array sans tri (ordre d'insertion)
    // "Sans zone" et "❓ À définir" en dernier
    const groupArray: ZoneGroup[] = Array.from(groups.entries())
      .map(([zoneName, zoneBosses]) => ({
        zoneName,
        bosses: zoneBosses,
        killed: zoneBosses.filter(b => b.killed).length,
        encountered: zoneBosses.filter(b => b.encountered).length,
        total: zoneBosses.length
      }))
      .sort((a, b) => {
        // "Sans zone" toujours en dernier
        if (a.zoneName === 'Sans zone') return 1
        if (b.zoneName === 'Sans zone') return -1
        // "❓ À définir" juste avant "Sans zone"
        if (a.zoneName === '❓ À définir') return 1
        if (b.zoneName === '❓ À définir') return -1
        // Sinon, garder l'ordre d'insertion (pas de tri)
        return 0
      })

    return groupArray
  }, [bosses])

  // Filtrer les boss selon le terme de recherche et le mode
  const filteredZoneGroups = useMemo(() => {
    return zoneGroups.map(zone => {
      let filtered = zone.bosses

      // Filtre par statut
      if (filterMode === 'alive') {
        filtered = filtered.filter(boss => !boss.killed)
      } else if (filterMode === 'killed') {
        filtered = filtered.filter(boss => boss.killed)
      } else if (filterMode === 'encountered') {
        filtered = filtered.filter(boss => boss.encountered)
      }

      // Filtre par recherche
      if (searchTerm.trim()) {
        filtered = filtered.filter(boss =>
          boss.name.toLowerCase().includes(searchTerm.toLowerCase())
        )
      }

      return {
        ...zone,
        bosses: filtered,
        visibleTotal: filtered.length
      }
    }).filter(zone => zone.bosses.length > 0) // Retirer les zones vides après filtrage
  }, [zoneGroups, searchTerm, filterMode])

  const stats = useMemo(() => {
    // Ne compter que les boss rencontrés qui ne sont pas Hidden, Other ou "❓ À définir"
    const validBosses = bosses.filter(b => 
      b.encountered &&
      b.category !== 'Other' && 
      b.zone !== 'Hidden' && 
      b.zone !== '❓ À définir'
    )
    const killed = validBosses.filter(b => b.killed).length
    const total = validBosses.length
    return { killed, total }
  }, [bosses])

  const toggleZone = (zoneName: string) => {
    setCollapsedZones(prev => {
      const newSet = new Set(prev)
      if (newSet.has(zoneName)) {
        newSet.delete(zoneName)
      } else {
        newSet.add(zoneName)
      }
      return newSet
    })
  }

  const toggleAllZones = () => {
    if (collapsedZones.size === zoneGroups.length) {
      setCollapsedZones(new Set())
    } else {
      setCollapsedZones(new Set(zoneGroups.map(z => z.zoneName)))
    }
  }

  return (
    <div className="boss-list">
      {bosses.length === 0 ? (
        <div className="empty">
          <p>No boss data loaded</p>
          <p>Configure save file path in settings</p>
        </div>
      ) : (
        <>
          {/* Stats */}
          <div className="stats">
            <span className="stat-item killed">🏆 {stats.killed} / {stats.total} boss vaincus</span>
            {onAddBoss && (
              <button 
                onClick={onAddBoss}
                style={{
                  padding: '6px 12px',
                  background: '#3498db',
                  border: 'none',
                  borderRadius: '4px',
                  color: '#fff',
                  fontSize: '12px',
                  cursor: 'pointer',
                  fontWeight: '600'
                }}
              >
                ➕ Ajouter un boss
              </button>
            )}
          </div>

          {/* Barre de recherche */}
          <input
            type="text"
            className="search-input"
            placeholder="Search boss..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />

          {/* Filtres */}
          <div className="filters">
            <button
              className={`filter-btn ${filterMode === 'all' ? 'active' : ''}`}
              onClick={() => setFilterMode('all')}
            >
              Tous ({bosses.filter(b => b.encountered && b.category !== 'Other' && b.zone !== 'Hidden' && b.zone !== '❓ À définir').length})
            </button>
            <button
              className={`filter-btn ${filterMode === 'killed' ? 'active' : ''}`}
              onClick={() => setFilterMode('killed')}
            >
              Vaincus ({stats.killed})
            </button>
            <button
              className={`filter-btn ${filterMode === 'alive' ? 'active' : ''}`}
              onClick={() => setFilterMode('alive')}
            >
              Restants ({stats.total - stats.killed})
            </button>
            <button
              className="filter-btn"
              onClick={toggleAllZones}
              title={collapsedZones.size === zoneGroups.length ? 'Expand all zones' : 'Collapse all zones'}
            >
              {collapsedZones.size === zoneGroups.length ? '📂' : '📁'}
            </button>
          </div>

          {/* Liste des boss groupés par zone */}
          <div className="boss-items">
            {filteredZoneGroups.length === 0 ? (
              <div className="empty">
                <p>No results found</p>
              </div>
            ) : (
              filteredZoneGroups.map((zone) => {
                const isCollapsed = collapsedZones.has(zone.zoneName)
                return (
                  <div key={zone.zoneName} className="zone-group">
                    <div 
                      className="zone-header"
                      onClick={() => toggleZone(zone.zoneName)}
                    >
                      <span className="zone-toggle">{isCollapsed ? '▶' : '▼'}</span>
                      <span className="zone-name">{zone.zoneName}</span>
                      <span className="zone-stats">
                        ({zone.killed}/{zone.total})
                      </span>
                    </div>
                    {!isCollapsed && (
                      <div className="zone-bosses">
                        {zone.bosses.map((boss, index) => (
                          <div 
                            key={`${zone.zoneName}-${index}`}
                            className={`boss-item ${boss.killed ? 'killed' : ''} ${!boss.encountered ? 'not-encountered' : ''}`}
                          >
                            <span 
                              className="checkbox"
                              onClick={() => onToggleBoss?.(boss, !boss.killed)}
                              style={{ cursor: onToggleBoss ? 'pointer' : 'default' }}
                              title={onToggleBoss ? (boss.killed ? 'Marquer comme vivant' : 'Marquer comme vaincu') : ''}
                            >
                              {boss.killed ? '☑' : boss.encountered ? '☐' : '⬜'}
                            </span>
                            <span className="name">{boss.name}</span>
                            {onEditBoss && (
                              <button
                                onClick={() => onEditBoss(boss)}
                                style={{
                                  marginLeft: 'auto',
                                  padding: '4px 8px',
                                  background: 'rgba(255, 255, 255, 0.1)',
                                  border: '1px solid rgba(255, 255, 255, 0.2)',
                                  borderRadius: '4px',
                                  color: '#fff',
                                  fontSize: '11px',
                                  cursor: 'pointer'
                                }}
                                title="Modifier ce boss"
                              >
                                ✏️
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })
            )}
          </div>
        </>
      )}
    </div>
  )
}

export default BossChecklist