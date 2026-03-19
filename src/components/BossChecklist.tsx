import { useEffect, useMemo, useState } from 'react'

import { useI18n } from '../i18n'
import type { Boss } from '../types/Boss'
import type { CurrentLocation } from '../types/CurrentLocation'
import type { FriendlyNevronEntry } from '../types/FriendlyNevronEntry'
import type { JournalEntry } from '../types/JournalEntry'
import type { LostGestralEntry } from '../types/LostGestralEntry'
import type { MonocoFoot } from '../types/MonocoFoot'
import type { MusicRecordEntry } from '../types/MusicRecordEntry'
import type { Picto } from '../types/Picto'
import type { WeaponEntry } from '../types/WeaponEntry'
import { formatZoneLevelLabel } from '../utils/zoneLevelLabel.ts'
import {
  buildChecklistModel,
  type ChecklistFilterMode,
  filterChecklistGroups,
  reportUnmatchedZoneNames,
  summarizeChecklist,
} from './checklistModel'
import {
  applyChecklistFeatureVisibility,
  buildZoneRemainingSummaryParts,
  type ChecklistFeatureKey,
  type ChecklistFeatureVisibility,
  zoneHasVisibleContent,
} from './checklistVisibility'

interface Props {
  bosses: Boss[]
  pictos: Picto[]
  monocoFeet: MonocoFoot[]
  journals: JournalEntry[]
  lostGestrals: LostGestralEntry[]
  friendlyNevrons: FriendlyNevronEntry[]
  weapons: WeaponEntry[]
  musicRecords: MusicRecordEntry[]
  currentLocation?: CurrentLocation | null
  filterMode: ChecklistFilterMode
  onFilterModeChange: (mode: ChecklistFilterMode) => void
  featureVisibility: ChecklistFeatureVisibility
  onToggleFeatureVisibility: (feature: ChecklistFeatureKey) => void
  onToggleBoss?: (boss: Boss, killed: boolean) => void
  allowManualEdit?: boolean
}

interface BossRowProps {
  boss: Boss
  allowManualEdit: boolean
  onToggleBoss?: (boss: Boss, killed: boolean) => void
  translateBossName: (bossName: string) => string
  t: (key: string, params?: Record<string, string | number>) => string
}

interface PictoRowProps {
  picto: Picto
  t: (key: string, params?: Record<string, string | number>) => string
}

interface MonocoFootRowProps {
  foot: MonocoFoot
  t: (key: string, params?: Record<string, string | number>) => string
}

interface JournalRowProps {
  journal: JournalEntry
  t: (key: string, params?: Record<string, string | number>) => string
}

interface LostGestralRowProps {
  lostGestral: LostGestralEntry
  t: (key: string, params?: Record<string, string | number>) => string
}

interface FriendlyNevronRowProps {
  friendlyNevron: FriendlyNevronEntry
  t: (key: string, params?: Record<string, string | number>) => string
}

interface WeaponRowProps {
  weapon: WeaponEntry
  t: (key: string, params?: Record<string, string | number>) => string
}

interface MusicRecordRowProps {
  musicRecord: MusicRecordEntry
  t: (key: string, params?: Record<string, string | number>) => string
}

const CHECKBOX_KILLED = '\u2611'
const CHECKBOX_ENCOUNTERED = '\u2610'
const CHECKBOX_UNKNOWN = '\u2B1C'
const MANUAL_MARKER = '\u{1F527}'
const EXPAND_ALL_ICON = '\u{1F4C2}'
const COLLAPSE_ALL_ICON = '\u{1F4C1}'
const ZONE_EXPANDED_ICON = '\u25BC'
const ZONE_COLLAPSED_ICON = '\u25B6'

function BossRow({
  boss,
  allowManualEdit,
  onToggleBoss,
  translateBossName,
  t,
}: BossRowProps) {
  const isManualBoss = boss.originalName?.startsWith('MANUAL_')
  const canToggle = isManualBoss || allowManualEdit
  const tooltipText = !canToggle
    ? t('bossList.autoDetected')
    : boss.killed
      ? t('bossList.markAsAlive')
      : t('bossList.markAsKilled')

  return (
    <div
      className={`boss-item ${boss.killed ? 'killed' : ''} ${!boss.encountered ? 'not-encountered' : ''}`}
    >
      <span
        className="checkbox"
        onClick={() => canToggle && onToggleBoss?.(boss, !boss.killed)}
        style={{
          cursor: canToggle && onToggleBoss ? 'pointer' : 'not-allowed',
          opacity: canToggle ? 1 : 0.5,
        }}
        title={tooltipText}
      >
        {boss.killed ? CHECKBOX_KILLED : boss.encountered ? CHECKBOX_ENCOUNTERED : CHECKBOX_UNKNOWN}
      </span>
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
            {MANUAL_MARKER}
          </span>
        )}
      </span>
    </div>
  )
}

function PictoRow({ picto, t }: PictoRowProps) {
  const nearestFlag = picto.nearestFlag || t('bossList.noNearestFlag')
  const howToGet = picto.howToGet || t('bossList.noHowToGet')

  return (
    <div className={`picto-item ${picto.found ? 'found' : 'missing'}`}>
      <div className="picto-header">
        <span className="picto-name">{picto.friendlyName}</span>
        <span className={`picto-status ${picto.found ? 'found' : 'missing'}`}>
          {picto.found ? t('bossList.pictoFound') : t('bossList.pictoMissing')}
        </span>
      </div>
      <div className="picto-meta">
        <span className="picto-label">{t('bossList.nearestFlagLabel')}</span>
        <span className="picto-value">{nearestFlag}</span>
      </div>
      <div className="picto-meta picto-description">
        <span className="picto-label">{t('bossList.howToGetLabel')}</span>
        <span className="picto-value">{howToGet}</span>
      </div>
    </div>
  )
}

function MonocoFootRow({ foot, t }: MonocoFootRowProps) {
  const locations = foot.locations.length > 0
    ? foot.locations.join(', ')
    : t('bossList.noFootLocations')
  const droppedBy = foot.monsterName || t('bossList.noFootMonster')

  return (
    <div className={`monoco-foot-item ${foot.found ? 'found' : 'missing'}`}>
      <div className="monoco-foot-header">
        <div className="monoco-foot-title-block">
          <span className="monoco-foot-name">{foot.skillName}</span>
          <span className="monoco-foot-subtitle">{foot.footName}</span>
        </div>
        <span className={`monoco-foot-status ${foot.found ? 'found' : 'missing'}`}>
          {foot.found ? t('bossList.footFound') : t('bossList.footMissing')}
        </span>
      </div>
      <div className="monoco-foot-meta">
        <span className="monoco-foot-label">{t('bossList.footDroppedByLabel')}</span>
        <span className="monoco-foot-value">{droppedBy}</span>
      </div>
      <div className="monoco-foot-meta monoco-foot-description">
        <span className="monoco-foot-label">{t('bossList.footLocationsLabel')}</span>
        <span className="monoco-foot-value">{locations}</span>
      </div>
    </div>
  )
}


function JournalRow({ journal, t }: JournalRowProps) {
  const summary = journal.summary || t('bossList.noJournalSummary')

  return (
    <div className={`journal-item ${journal.found ? 'found' : 'missing'}`}>
      <div className="journal-header">
        <span className="journal-name">{journal.name}</span>
        <span className={`journal-status ${journal.found ? 'found' : 'missing'}`}>
          {journal.found ? t('bossList.journalFound') : t('bossList.journalMissing')}
        </span>
      </div>
      <div className="journal-meta journal-description">
        <span className="journal-label">{t('bossList.journalSummaryLabel')}</span>
        <span className="journal-value">{summary}</span>
      </div>
    </div>
  )
}

function LostGestralRow({ lostGestral, t }: LostGestralRowProps) {
  const summary = lostGestral.summary || t('bossList.noLostGestralSummary')

  return (
    <div className={`lost-gestral-item ${lostGestral.found ? 'found' : 'missing'}`}>
      <div className="lost-gestral-header">
        <span className="lost-gestral-name">{lostGestral.name}</span>
        <span
          className={`lost-gestral-status ${lostGestral.found ? 'found' : 'missing'}`}
        >
          {
            lostGestral.found
              ? t('bossList.lostGestralFound')
              : t('bossList.lostGestralMissing')
          }
        </span>
      </div>
      <div className="lost-gestral-meta lost-gestral-description">
        <span className="lost-gestral-label">{t('bossList.lostGestralLocationLabel')}</span>
        <span className="lost-gestral-value">{summary}</span>
      </div>
    </div>
  )
}


function FriendlyNevronRow({ friendlyNevron, t }: FriendlyNevronRowProps) {
  const summary = friendlyNevron.summary || t('bossList.noFriendlyNevronSummary')

  const statusLabel =
    friendlyNevron.resolution === 'peace'
      ? t('bossList.friendlyNevronPeaceful')
      : friendlyNevron.resolution === 'killed'
        ? t('bossList.friendlyNevronKilled')
        : t('bossList.friendlyNevronUnresolved')

  const statusClass =
    friendlyNevron.resolution === 'peace'
      ? 'peace'
      : friendlyNevron.resolution === 'killed'
        ? 'killed'
        : 'unresolved'

  return (
    <div className={`friendly-nevron-item ${statusClass}`}>
      <div className="friendly-nevron-header">
        <span className="friendly-nevron-name">{friendlyNevron.name}</span>
        <span className={`friendly-nevron-status ${statusClass}`}>{statusLabel}</span>
      </div>
      <div className="friendly-nevron-meta friendly-nevron-description">
        <span className="friendly-nevron-label">{t('bossList.friendlyNevronSummaryLabel')}</span>
        <span className="friendly-nevron-value">{summary}</span>
      </div>
    </div>
  )
}

function WeaponRow({ weapon, t }: WeaponRowProps) {
  const summary = weapon.summary || t('bossList.noWeaponSummary')

  return (
    <div className={`weapon-item ${weapon.found ? 'found' : 'missing'}`}>
      <div className="weapon-header">
        <span className="weapon-name">{weapon.name}</span>
        <span className={`weapon-status ${weapon.found ? 'found' : 'missing'}`}>
          {weapon.found ? t('bossList.weaponFound') : t('bossList.weaponMissing')}
        </span>
      </div>
      <div className="weapon-meta weapon-description">
        <span className="weapon-label">{t('bossList.weaponSummaryLabel')}</span>
        <span className="weapon-value">{summary}</span>
      </div>
    </div>
  )
}

function MusicRecordRow({ musicRecord, t }: MusicRecordRowProps) {
  const summary = musicRecord.summary || t('bossList.noMusicRecordSummary')

  return (
    <div className={`music-record-item ${musicRecord.found ? 'found' : 'missing'}`}>
      <div className="music-record-header">
        <span className="music-record-name">{musicRecord.name}</span>
        <span className={`music-record-status ${musicRecord.found ? 'found' : 'missing'}`}>
          {musicRecord.found ? t('bossList.musicRecordFound') : t('bossList.musicRecordMissing')}
        </span>
      </div>
      <div className="music-record-meta music-record-description">
        <span className="music-record-label">{t('bossList.musicRecordSummaryLabel')}</span>
        <span className="music-record-value">{summary}</span>
      </div>
    </div>
  )
}

function BossChecklist(props: Props) {
  const {
    bosses,
    pictos,
    monocoFeet,
    journals,
    lostGestrals,
    friendlyNevrons,
    weapons,
    musicRecords,
    currentLocation,
    filterMode,
    onFilterModeChange,
    featureVisibility,
    onToggleFeatureVisibility,
    onToggleBoss,
    allowManualEdit = false,
  } = props
  const { t, translateZone, translateBossName } = useI18n()
  const [searchTerm, setSearchTerm] = useState('')
  const [collapsedZones, setCollapsedZones] = useState<Set<string>>(new Set())

  const checklistModel = useMemo(
    () =>
      buildChecklistModel(
        bosses,
        pictos,
        monocoFeet,
        journals,
        lostGestrals,
        friendlyNevrons,
        weapons,
        musicRecords,
        currentLocation,
      ),
    [bosses, pictos, monocoFeet, journals, lostGestrals, friendlyNevrons, weapons, musicRecords, currentLocation],
  )

  useEffect(() => {
    reportUnmatchedZoneNames(checklistModel.unmatchedZoneNames)
  }, [checklistModel.unmatchedZoneNames])

  const filteredZoneGroups = useMemo(
    () =>
      filterChecklistGroups(checklistModel, {
        filterMode,
        searchTerm,
        translateBossName,
      }),
    [checklistModel, filterMode, searchTerm, translateBossName],
  )

  const stats = useMemo(() => summarizeChecklist(checklistModel), [checklistModel])

  const visibleZoneGroups = useMemo(
    () => applyChecklistFeatureVisibility(filteredZoneGroups, featureVisibility),
    [filteredZoneGroups, featureVisibility],
  )

  const renderedZoneGroups = useMemo(
    () => visibleZoneGroups.filter((zone) => zoneHasVisibleContent(zone)),
    [visibleZoneGroups],
  )

  const currentLocationLabel =
    currentLocation?.areaName ??
    currentLocation?.displayName ??
    t('bossList.currentZoneUnknown')

  const toggleZone = (zoneName: string) => {
    setCollapsedZones((prev) => {
      const next = new Set(prev)
      if (next.has(zoneName)) {
        next.delete(zoneName)
      } else {
        next.add(zoneName)
      }
      return next
    })
  }

  const toggleAllZones = () => {
    if (collapsedZones.size === renderedZoneGroups.length) {
      setCollapsedZones(new Set())
      return
    }

    setCollapsedZones(new Set(renderedZoneGroups.map((zone) => zone.zoneName)))
  }

  return (
    <div className="boss-list">
      {bosses.length === 0 && pictos.length === 0 && monocoFeet.length === 0 && journals.length === 0 && lostGestrals.length === 0 && friendlyNevrons.length === 0 && weapons.length === 0 && musicRecords.length === 0 ? (
        <div className="empty">
          <p>{t('bossList.noData')}</p>
          <p>{t('bossList.configurePathInSettings')}</p>
        </div>
      ) : (
        <>
          <div className="stats">
            <div className="stats-summary">
              <button
                type="button"
                className={`stat-item stat-toggle killed ${featureVisibility.bosses ? 'on' : 'off'}`}
                onClick={() => onToggleFeatureVisibility('bosses')}
                aria-pressed={featureVisibility.bosses}
              >
                {t('bossList.bossesKilled', {
                  killed: stats.killedBosses.toString(),
                  total: stats.totalBosses.toString(),
                })}
              </button>
              <button
                type="button"
                className={`stat-item stat-toggle total ${featureVisibility.pictos ? 'on' : 'off'}`}
                onClick={() => onToggleFeatureVisibility('pictos')}
                aria-pressed={featureVisibility.pictos}
              >
                {t('bossList.pictosCollected', {
                  found: stats.foundPictos.toString(),
                  total: stats.totalPictos.toString(),
                })}
              </button>
              <button
                type="button"
                className={`stat-item stat-toggle total ${featureVisibility.feet ? 'on' : 'off'}`}
                onClick={() => onToggleFeatureVisibility('feet')}
                aria-pressed={featureVisibility.feet}
              >
                {t('bossList.feetCollected', {
                  found: stats.foundFeet.toString(),
                  total: stats.totalFeet.toString(),
                })}
              </button>
              <button
                type="button"
                className={`stat-item stat-toggle total ${featureVisibility.journals ? 'on' : 'off'}`}
                onClick={() => onToggleFeatureVisibility('journals')}
                aria-pressed={featureVisibility.journals}
              >
                {t('bossList.journalsCollected', {
                  found: stats.foundJournals.toString(),
                  total: stats.totalJournals.toString(),
                })}
              </button>
              <button
                type="button"
                className={`stat-item stat-toggle total ${featureVisibility.lostGestrals ? 'on' : 'off'}`}
                onClick={() => onToggleFeatureVisibility('lostGestrals')}
                aria-pressed={featureVisibility.lostGestrals}
              >
                {t('bossList.lostGestralsCollected', {
                  found: stats.foundLostGestrals.toString(),
                  total: stats.totalLostGestrals.toString(),
                })}
              </button>
              <button
                type="button"
                className={`stat-item stat-toggle total ${featureVisibility.friendlyNevrons ? 'on' : 'off'}`}
                onClick={() => onToggleFeatureVisibility('friendlyNevrons')}
                aria-pressed={featureVisibility.friendlyNevrons}
              >
                {t('bossList.friendlyNevronsCollected', {
                  peaceful: stats.peacefulFriendlyNevrons.toString(),
                  killed: stats.killedFriendlyNevrons.toString(),
                  total: stats.totalFriendlyNevrons.toString(),
                })}
              </button>
              <button
                type="button"
                className={`stat-item stat-toggle total ${featureVisibility.weapons ? 'on' : 'off'}`}
                onClick={() => onToggleFeatureVisibility('weapons')}
                aria-pressed={featureVisibility.weapons}
              >
                {t('bossList.weaponsCollected', {
                  found: stats.foundWeapons.toString(),
                  total: stats.totalWeapons.toString(),
                })}
              </button>
              <button
                type="button"
                className={`stat-item stat-toggle total ${featureVisibility.musicRecords ? 'on' : 'off'}`}
                onClick={() => onToggleFeatureVisibility('musicRecords')}
                aria-pressed={featureVisibility.musicRecords}
              >
                {t('bossList.musicRecordsCollected', {
                  found: stats.foundMusicRecords.toString(),
                  total: stats.totalMusicRecords.toString(),
                })}
              </button>
            </div>
          </div>

          <div className="current-location-banner">
            <span className="current-location-label">
              {t('bossList.currentZoneLabel')}
            </span>
            <span className="current-location-value">{currentLocationLabel}</span>
          </div>

          <input
            type="text"
            className="search-input"
            placeholder={t('bossList.searchPlaceholder')}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />

          <div className="filters">
            <button
              className={`filter-btn ${filterMode === 'all' ? 'active' : ''}`}
              onClick={() => onFilterModeChange('all')}
            >
              {t('bossList.filterAll')}
            </button>
            <button
              className={`filter-btn ${filterMode === 'found' ? 'active' : ''}`}
              onClick={() => onFilterModeChange('found')}
            >
              {t('bossList.filterFoundLabel')}
            </button>
            <button
              className={`filter-btn ${filterMode === 'remaining' ? 'active' : ''}`}
              onClick={() => onFilterModeChange('remaining')}
            >
              {t('bossList.filterRemainingLabel')}
            </button>
            <button
              className={`filter-btn ${filterMode === 'current_zone' ? 'active' : ''}`}
              onClick={() => onFilterModeChange('current_zone')}
            >
              {t('bossList.filterCurrentZoneLabel')}
            </button>
            <button
              className="filter-btn filter-btn-icon"
              onClick={toggleAllZones}
              title={
                collapsedZones.size === renderedZoneGroups.length
                  ? t('bossList.expandAll')
                  : t('bossList.collapseAll')
              }
            >
              {collapsedZones.size === renderedZoneGroups.length ? EXPAND_ALL_ICON : COLLAPSE_ALL_ICON}
            </button>
          </div>

          <div className="boss-items">
            {renderedZoneGroups.length === 0 ? (
              <div className="empty">
                <p>{t('bossList.noResults')}</p>
              </div>
            ) : (
              renderedZoneGroups.map((zone) => {
                const isCollapsed = collapsedZones.has(zone.zoneName)
                const unmatchedNames = [
                  ...new Set(zone.unmatchedEntries.map((entry) => entry.rawName)),
                ]
                const remainingSummaryParts = buildZoneRemainingSummaryParts(
                  zone,
                  featureVisibility,
                )
                return (
                  <div key={zone.zoneName} className="zone-group">
                    <div
                      className={`zone-header ${unmatchedNames.length > 0 ? 'zone-header-unmapped' : ''}`}
                      onClick={() => toggleZone(zone.zoneName)}
                    >
                      <span className="zone-toggle">
                        {isCollapsed ? ZONE_COLLAPSED_ICON : ZONE_EXPANDED_ICON}
                      </span>
                      <span className="zone-name">
                        {translateZone(zone.zoneName)}
                        {formatZoneLevelLabel(
                          zone.recommendedMinLevel,
                          zone.recommendedMaxLevel,
                        )}
                      </span>
                      {unmatchedNames.length > 0 && (
                        <span className="zone-badge">{t('bossList.unmappedLocationBadge')}</span>
                      )}
                      {remainingSummaryParts.length > 0 && (
                        <span className="zone-stats">
                          {remainingSummaryParts.map((part) => (
                            <span key={`${zone.zoneName}-${part.key}`} className="zone-summary-chip">
                              {part.label}
                            </span>
                          ))}
                        </span>
                      )}
                    </div>
                    {!isCollapsed && (
                      <div className="zone-items">
                        {unmatchedNames.length > 0 && (
                          <div className="zone-audit">
                            <span className="zone-audit-label">
                              {t('bossList.unmappedLocationLabel')}
                            </span>
                            <span className="zone-audit-value">
                              {unmatchedNames.join(', ')}
                            </span>
                          </div>
                        )}
                        {zone.visibleBosses.map((boss) => (
                          <BossRow
                            key={`${zone.zoneName}-${boss.originalName ?? boss.name}`}
                            boss={boss}
                            allowManualEdit={allowManualEdit}
                            onToggleBoss={onToggleBoss}
                            translateBossName={translateBossName}
                            t={t}
                          />
                        ))}
                        {zone.visiblePictos.map((picto) => (
                          <PictoRow key={`${zone.zoneName}-${picto.id}`} picto={picto} t={t} />
                        ))}
                        {zone.visibleMonocoFeet.map((foot) => (
                          <MonocoFootRow key={`${zone.zoneName}-${foot.id}`} foot={foot} t={t} />
                        ))}
                        {zone.visibleJournals.map((journal) => (
                          <JournalRow key={`${zone.zoneName}-${journal.id}`} journal={journal} t={t} />
                        ))}
                        {zone.visibleLostGestrals.map((lostGestral) => (
                          <LostGestralRow
                            key={`${zone.zoneName}-${lostGestral.id}`}
                            lostGestral={lostGestral}
                            t={t}
                          />
                        ))}
                        {zone.visibleFriendlyNevrons.map((friendlyNevron) => (
                          <FriendlyNevronRow
                            key={`${zone.zoneName}-${friendlyNevron.id}`}
                            friendlyNevron={friendlyNevron}
                            t={t}
                          />
                        ))}
                        {zone.visibleWeapons.map((weapon) => (
                          <WeaponRow key={`${zone.zoneName}-${weapon.id}`} weapon={weapon} t={t} />
                        ))}
                        {zone.visibleMusicRecords.map((musicRecord) => (
                          <MusicRecordRow
                            key={`${zone.zoneName}-${musicRecord.id}`}
                            musicRecord={musicRecord}
                            t={t}
                          />
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
