import { useMemo, useState } from 'react'

import { useI18n } from '../i18n'
import { Boss } from '../types/Boss'

interface Props {
  bosses: Boss[]
  onEditBoss?: (boss: Boss) => void
  onAddBoss?: () => void
  onToggleBoss?: (boss: Boss, killed: boolean) => void
  allowManualEdit?: boolean
}

interface ZoneGroup {
  zoneName: string
  bosses: Boss[]
  killed: number
  encountered: number
  total: number
}

function BossChecklist({
  bosses,
  onEditBoss,
  onAddBoss,
  onToggleBoss,
  allowManualEdit = false,
}: Props) {
  const { t, translateZone, translateBossName } = useI18n()
  const [searchTerm, setSearchTerm] = useState('')
  const [filterMode, setFilterMode] = useState<
    'all' | 'alive' | 'killed' | 'encountered'
  >('all')
  const [collapsedZones, setCollapsedZones] = useState<Set<string>>(new Set())

  // Grouper les boss par zone
  const zoneGroups = useMemo(() => {
    const groups = new Map<string, Boss[]>()

    bosses.forEach((boss) => {
      const zoneName = boss.zone || 'Uncategorized'

      if (!groups.has(zoneName)) {
        groups.set(zoneName, [])
      }
      groups.get(zoneName)!.push(boss)
    })

    // Convertir en array (ordre d'insertion naturel)
    const groupArray: ZoneGroup[] = Array.from(groups.entries()).map(
      ([zoneName, zoneBosses]) => ({
        zoneName,
        bosses: zoneBosses,
        killed: zoneBosses.filter((b) => b.killed).length,
        encountered: zoneBosses.filter((b) => b.encountered).length,
        total: zoneBosses.length,
      }),
    )

    return groupArray
  }, [bosses])

  // Filtrer les boss selon le terme de recherche et le mode
  const filteredZoneGroups = useMemo(() => {
    return zoneGroups
      .map((zone) => {
        let filtered = zone.bosses

        // Filtre par statut
        if (filterMode === 'alive') {
          filtered = filtered.filter((boss) => !boss.killed)
        } else if (filterMode === 'killed') {
          filtered = filtered.filter((boss) => boss.killed)
        } else if (filterMode === 'encountered') {
          filtered = filtered.filter((boss) => boss.encountered)
        }

        // Filtre par recherche
        if (searchTerm.trim()) {
          filtered = filtered.filter((boss) =>
            boss.name.toLowerCase().includes(searchTerm.toLowerCase()),
          )
        }

        return {
          ...zone,
          bosses: filtered,
          visibleTotal: filtered.length,
        }
      })
      .filter((zone) => zone.bosses.length > 0) // Retirer les zones vides après filtrage
  }, [zoneGroups, searchTerm, filterMode])

  const stats = useMemo(() => {
    // Compter uniquement les boss rencontrés et vaincus pour le killed
    const killed = bosses.filter((b) => b.encountered && b.killed).length
    const total = bosses.length
    return { killed, total }
  }, [bosses])

  const toggleZone = (zoneName: string) => {
    setCollapsedZones((prev) => {
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
      setCollapsedZones(new Set(zoneGroups.map((z) => z.zoneName)))
    }
  }

  return (
    <div className="boss-list">
      {bosses.length === 0 ? (
        <div className="empty">
          <p>{t('bossList.noData')}</p>
          <p>{t('bossList.configurePathInSettings')}</p>
        </div>
      ) : (
        <>
          {/* Stats */}
          <div className="stats">
            <span className="stat-item killed">
              {t('bossList.bossesKilled', {
                killed: stats.killed.toString(),
                total: stats.total.toString(),
              })}
            </span>
            {onAddBoss && (
              <button
                onClick={onAddBoss}
                style={{
                  padding: '6px 12px',
                  background: '#2ecc71',
                  border: 'none',
                  borderRadius: '4px',
                  color: '#fff',
                  fontSize: '12px',
                  cursor: 'pointer',
                  fontWeight: '600',
                }}
              >
                {t('bossList.addBossManually')}
              </button>
            )}
          </div>

          {/* Barre de recherche */}
          <input
            type="text"
            className="search-input"
            placeholder={t('bossList.searchPlaceholder')}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />

          {/* Filtres */}
          <div className="filters">
            <button
              className={`filter-btn ${filterMode === 'all' ? 'active' : ''}`}
              onClick={() => setFilterMode('all')}
            >
              {t('bossList.filterAll', {
                count: bosses.filter((b) => b.encountered).length.toString(),
              })}
            </button>
            <button
              className={`filter-btn ${filterMode === 'killed' ? 'active' : ''}`}
              onClick={() => setFilterMode('killed')}
            >
              {t('bossList.filterKilled', {
                count: stats.killed.toString(),
              })}
            </button>
            <button
              className={`filter-btn ${filterMode === 'alive' ? 'active' : ''}`}
              onClick={() => setFilterMode('alive')}
            >
              {t('bossList.filterAlive', {
                count: (stats.total - stats.killed).toString(),
              })}
            </button>
            <button
              className="filter-btn"
              onClick={toggleAllZones}
              title={
                collapsedZones.size === zoneGroups.length
                  ? t('bossList.expandAll')
                  : t('bossList.collapseAll')
              }
            >
              {collapsedZones.size === zoneGroups.length ? '📂' : '📁'}
            </button>
          </div>

          {/* Liste des boss groupés par zone */}
          <div className="boss-items">
            {filteredZoneGroups.length === 0 ? (
              <div className="empty">
                <p>{t('bossList.noResults')}</p>
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
                      <span className="zone-toggle">
                        {isCollapsed ? '▶' : '▼'}
                      </span>
                      <span className="zone-name">
                        {translateZone(zone.zoneName)}
                      </span>
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
                            {(() => {
                              const isManualBoss =
                                boss.originalName?.startsWith('MANUAL_')
                              const canToggle = isManualBoss || allowManualEdit
                              const tooltipText = !canToggle
                                ? t('bossList.autoDetected')
                                : boss.killed
                                  ? t('bossList.markAsAlive')
                                  : t('bossList.markAsKilled')

                              return (
                                <span
                                  className="checkbox"
                                  onClick={() =>
                                    canToggle &&
                                    onToggleBoss?.(boss, !boss.killed)
                                  }
                                  style={{
                                    cursor:
                                      canToggle && onToggleBoss
                                        ? 'pointer'
                                        : 'not-allowed',
                                    opacity: canToggle ? 1 : 0.5,
                                  }}
                                  title={tooltipText}
                                >
                                  {boss.killed
                                    ? '☑'
                                    : boss.encountered
                                      ? '☐'
                                      : '⬜'}
                                </span>
                              )
                            })()}
                            <span className="name">
                              {translateBossName(boss.name)}
                              {boss.originalName?.startsWith('MANUAL_') && (
                                <span
                                  style={{
                                    marginLeft: '6px',
                                    fontSize: '11px',
                                    opacity: 0.7,
                                  }}
                                  title={t('bossList.manuallyAdded')}
                                >
                                  🔧
                                </span>
                              )}
                            </span>
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
                                  cursor: 'pointer',
                                }}
                                title={t('bossList.editBoss')}
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
