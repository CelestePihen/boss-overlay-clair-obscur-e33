import type { Boss } from '../types/Boss'
import type { CurrentLocation } from '../types/CurrentLocation'
import type { FriendlyNevronEntry } from '../types/FriendlyNevronEntry'
import type { JournalEntry } from '../types/JournalEntry'
import type { LostGestralEntry } from '../types/LostGestralEntry'
import type { MonocoFoot } from '../types/MonocoFoot'
import type { MusicRecordEntry } from '../types/MusicRecordEntry'
import type { Picto } from '../types/Picto'
import type { WeaponEntry } from '../types/WeaponEntry'
import { zoneLevelsByZoneName } from './zoneLevels.ts'
import { DEFAULT_ZONE_NAME, toZoneLookupKey, ZONE_ALIASES } from './zoneNormalization.ts'

export type ZoneSource = 'boss' | 'picto' | 'foot' | 'journal' | 'lost_gestral' | 'friendly_nevron' | 'weapon' | 'music' | 'location'
export type ChecklistFilterMode = 'all' | 'found' | 'remaining' | 'current_zone'

export interface NormalizedZoneMatch {
  zoneName: string
  matched: boolean
}

export interface UnmatchedZoneName {
  source: ZoneSource
  rawName: string
  fallbackZoneName: string
}

export interface ChecklistZoneGroup {
  zoneName: string
  bosses: Boss[]
  pictos: Picto[]
  monocoFeet: MonocoFoot[]
  journals: JournalEntry[]
  lostGestrals: LostGestralEntry[]
  friendlyNevrons: FriendlyNevronEntry[]
  weapons: WeaponEntry[]
  musicRecords: MusicRecordEntry[]
  killed: number
  encountered: number
  totalBosses: number
  foundPictos: number
  totalPictos: number
  foundFeet: number
  totalFeet: number
  foundJournals: number
  totalJournals: number
  foundLostGestrals: number
  totalLostGestrals: number
  peacefulFriendlyNevrons: number
  killedFriendlyNevrons: number
  totalFriendlyNevrons: number
  foundWeapons: number
  totalWeapons: number
  foundMusicRecords: number
  totalMusicRecords: number
  recommendedMinLevel?: number
  recommendedMaxLevel?: number
  unmatchedEntries: UnmatchedZoneName[]
}

export interface FilteredChecklistZoneGroup extends ChecklistZoneGroup {
  visibleBosses: Boss[]
  visiblePictos: Picto[]
  visibleMonocoFeet: MonocoFoot[]
  visibleJournals: JournalEntry[]
  visibleLostGestrals: LostGestralEntry[]
  visibleFriendlyNevrons: FriendlyNevronEntry[]
  visibleWeapons: WeaponEntry[]
  visibleMusicRecords: MusicRecordEntry[]
}

export interface ChecklistModel {
  zoneGroups: ChecklistZoneGroup[]
  unmatchedZoneNames: UnmatchedZoneName[]
  currentZoneName: string | null
  monocoFeet: MonocoFoot[]
  journals: JournalEntry[]
  lostGestrals: LostGestralEntry[]
  friendlyNevrons: FriendlyNevronEntry[]
  weapons: WeaponEntry[]
  musicRecords: MusicRecordEntry[]
}

export interface ChecklistSummary {
  killedBosses: number
  totalBosses: number
  remainingBosses: number
  foundPictos: number
  totalPictos: number
  remainingPictos: number
  foundFeet: number
  totalFeet: number
  remainingFeet: number
  foundJournals: number
  totalJournals: number
  remainingJournals: number
  foundLostGestrals: number
  totalLostGestrals: number
  remainingLostGestrals: number
  peacefulFriendlyNevrons: number
  killedFriendlyNevrons: number
  totalFriendlyNevrons: number
  remainingFriendlyNevrons: number
  foundWeapons: number
  totalWeapons: number
  remainingWeapons: number
  foundMusicRecords: number
  totalMusicRecords: number
  remainingMusicRecords: number
  currentZoneRemainingBosses: number
  currentZoneRemainingPictos: number
  currentZoneRemainingFeet: number
  currentZoneRemainingJournals: number
  currentZoneRemainingLostGestrals: number
  currentZoneRemainingFriendlyNevrons: number
  currentZoneRemainingWeapons: number
  currentZoneRemainingMusicRecords: number
}

export interface ChecklistFilterOptions {
  filterMode: ChecklistFilterMode
  searchTerm: string
  translateBossName?: (bossName: string) => string
}

const zoneAliasLookup = new Map<string, string>()
const reportedUnmatchedZoneNames = new Set<string>()

for (const [zoneName, aliases] of Object.entries(ZONE_ALIASES)) {
  for (const alias of aliases) {
    zoneAliasLookup.set(toZoneLookupKey(alias), zoneName)
  }
}

function bossMatchesSearch(
  boss: Boss,
  term: string,
  translateBossName: (bossName: string) => string,
): boolean {
  return (
    boss.name.toLowerCase().includes(term) ||
    translateBossName(boss.name).toLowerCase().includes(term)
  )
}

function pictoMatchesSearch(picto: Picto, term: string): boolean {
  return [
    picto.friendlyName,
    picto.effect,
    picto.mapName,
    picto.nearestFlag,
    picto.howToGet,
  ].some((value) => value.toLowerCase().includes(term))
}

function monocoFootMatchesSearch(foot: MonocoFoot, term: string): boolean {
  return [foot.skillName, foot.footName, foot.monsterName, ...foot.locations].some(
    (value) => value.toLowerCase().includes(term),
  )
}

function journalMatchesSearch(journal: JournalEntry, term: string): boolean {
  return [journal.name, journal.sourceZoneName, journal.summary].some((value) =>
    value.toLowerCase().includes(term),
  )
}

function lostGestralMatchesSearch(
  lostGestral: LostGestralEntry,
  term: string,
): boolean {
  return [lostGestral.name, lostGestral.sourceZoneName, lostGestral.summary].some(
    (value) => value.toLowerCase().includes(term),
  )
}

function friendlyNevronMatchesSearch(
  friendlyNevron: FriendlyNevronEntry,
  term: string,
): boolean {
  return [
    friendlyNevron.name,
    friendlyNevron.sourceZoneName,
    friendlyNevron.summary,
  ].some((value) => value.toLowerCase().includes(term))
}

function weaponMatchesSearch(weapon: WeaponEntry, term: string): boolean {
  return [weapon.name, weapon.owner, weapon.sourceZoneName, weapon.summary].some(
    (value) => value.toLowerCase().includes(term),
  )
}

function musicRecordMatchesSearch(musicRecord: MusicRecordEntry, term: string): boolean {
  return [musicRecord.name, musicRecord.sourceZoneName, musicRecord.summary].some(
    (value) => value.toLowerCase().includes(term),
  )
}
function bossMatchesFilter(boss: Boss, filterMode: ChecklistFilterMode): boolean {
  if (filterMode === 'found') {
    return boss.encountered && boss.killed
  }

  if (filterMode === 'remaining' || filterMode === 'current_zone') {
    return !boss.killed
  }

  return true
}

function pictoMatchesFilter(
  picto: Picto,
  filterMode: ChecklistFilterMode,
): boolean {
  if (filterMode === 'found') {
    return picto.found
  }

  if (filterMode === 'remaining' || filterMode === 'current_zone') {
    return !picto.found
  }

  return true
}

function monocoFootMatchesFilter(
  foot: MonocoFoot,
  filterMode: ChecklistFilterMode,
): boolean {
  if (filterMode === 'found') {
    return foot.found
  }

  if (filterMode === 'remaining' || filterMode === 'current_zone') {
    return !foot.found
  }

  return true
}

function journalMatchesFilter(
  journal: JournalEntry,
  filterMode: ChecklistFilterMode,
): boolean {
  if (filterMode === 'found') {
    return journal.found
  }

  if (filterMode === 'remaining' || filterMode === 'current_zone') {
    return !journal.found
  }

  return true
}

function lostGestralMatchesFilter(
  lostGestral: LostGestralEntry,
  filterMode: ChecklistFilterMode,
): boolean {
  if (filterMode === 'found') {
    return lostGestral.found
  }

  if (filterMode === 'remaining' || filterMode === 'current_zone') {
    return !lostGestral.found
  }

  return true
}

function friendlyNevronMatchesFilter(
  friendlyNevron: FriendlyNevronEntry,
  filterMode: ChecklistFilterMode,
): boolean {
  if (filterMode === 'found') {
    return friendlyNevron.isResolved
  }

  if (filterMode === 'remaining' || filterMode === 'current_zone') {
    return !friendlyNevron.isResolved
  }

  return true
}

function weaponMatchesFilter(
  weapon: WeaponEntry,
  filterMode: ChecklistFilterMode,
): boolean {
  if (filterMode === 'found') {
    return weapon.found
  }

  if (filterMode === 'remaining' || filterMode === 'current_zone') {
    return !weapon.found
  }

  return true
}

function musicRecordMatchesFilter(
  musicRecord: MusicRecordEntry,
  filterMode: ChecklistFilterMode,
): boolean {
  if (filterMode === 'found') {
    return musicRecord.found
  }

  if (filterMode === 'remaining' || filterMode === 'current_zone') {
    return !musicRecord.found
  }

  return true
}
export function normalizeZoneName(
  rawName: string | undefined,
  _source: ZoneSource,
): NormalizedZoneMatch {
  const trimmed = rawName?.trim() ?? ''
  if (trimmed.length === 0) {
    return { zoneName: DEFAULT_ZONE_NAME, matched: true }
  }

  const zoneName = zoneAliasLookup.get(toZoneLookupKey(trimmed))
  if (zoneName) {
    return { zoneName, matched: true }
  }

  return {
    zoneName: trimmed,
    matched: false,
  }
}

function normalizeCurrentLocation(
  currentLocation: CurrentLocation | null | undefined,
): {
  currentZoneName: string | null
  unmatchedLocation: UnmatchedZoneName[]
} {
  if (!currentLocation) {
    return { currentZoneName: null, unmatchedLocation: [] }
  }

  const rawName = currentLocation.areaName ?? currentLocation.displayName
  if (!rawName) {
    return { currentZoneName: null, unmatchedLocation: [] }
  }

  const normalized = normalizeZoneName(rawName, 'location')
  if (normalized.matched) {
    return { currentZoneName: normalized.zoneName, unmatchedLocation: [] }
  }

  return {
    currentZoneName: normalized.zoneName,
    unmatchedLocation: [
      {
        source: 'location',
        rawName,
        fallbackZoneName: normalized.zoneName,
      },
    ],
  }
}

function compareChecklistZoneGroups(
  left: ChecklistZoneGroup,
  right: ChecklistZoneGroup,
): number {
  if (left.zoneName === 'the_continent') {
    return right.zoneName === 'the_continent' ? 0 : 1
  }
  if (right.zoneName === 'the_continent') {
    return -1
  }

  const leftHasLevelData = left.recommendedMinLevel !== undefined
  const rightHasLevelData = right.recommendedMinLevel !== undefined

  if (leftHasLevelData && rightHasLevelData) {
    if (left.recommendedMinLevel !== right.recommendedMinLevel) {
      return left.recommendedMinLevel! - right.recommendedMinLevel!
    }
    if (left.recommendedMaxLevel !== right.recommendedMaxLevel) {
      return (left.recommendedMaxLevel ?? 0) - (right.recommendedMaxLevel ?? 0)
    }
    return left.zoneName.localeCompare(right.zoneName)
  }

  if (leftHasLevelData) {
    return -1
  }
  if (rightHasLevelData) {
    return 1
  }

  return left.zoneName.localeCompare(right.zoneName)
}

export function buildChecklistModel(
  bosses: Boss[],
  pictos: Picto[],
  monocoFeet: MonocoFoot[],
  journals: JournalEntry[],
  lostGestrals: LostGestralEntry[],
  friendlyNevrons: FriendlyNevronEntry[],
  weapons: WeaponEntry[],
  musicRecords: MusicRecordEntry[],
  currentLocation?: CurrentLocation | null,
): ChecklistModel {
  const groups = new Map<string, ChecklistZoneGroup>()
  const unmatchedZoneNames: UnmatchedZoneName[] = []

  const getOrCreateGroup = (zoneName: string): ChecklistZoneGroup => {
    const existing = groups.get(zoneName)
    if (existing) {
      return existing
    }

    const created: ChecklistZoneGroup = {
      zoneName,
      bosses: [],
      pictos: [],
      monocoFeet: [],
      journals: [],
      lostGestrals: [],
      friendlyNevrons: [],
      weapons: [],
      musicRecords: [],
      killed: 0,
      encountered: 0,
      totalBosses: 0,
      foundPictos: 0,
      totalPictos: 0,
      foundFeet: 0,
      totalFeet: 0,
      foundJournals: 0,
      totalJournals: 0,
      foundLostGestrals: 0,
      totalLostGestrals: 0,
      peacefulFriendlyNevrons: 0,
      killedFriendlyNevrons: 0,
      totalFriendlyNevrons: 0,
      foundWeapons: 0,
      totalWeapons: 0,
      foundMusicRecords: 0,
      totalMusicRecords: 0,
      recommendedMinLevel: zoneLevelsByZoneName[zoneName]?.recommendedMinLevel,
      recommendedMaxLevel: zoneLevelsByZoneName[zoneName]?.recommendedMaxLevel,
      unmatchedEntries: [],
    }
    groups.set(zoneName, created)
    return created
  }

  for (const boss of bosses) {
    const normalized = normalizeZoneName(boss.zone, 'boss')
    const group = getOrCreateGroup(normalized.zoneName)
    group.bosses.push(boss)
    group.totalBosses += 1
    if (boss.encountered) {
      group.encountered += 1
    }
    if (boss.killed) {
      group.killed += 1
    }

    if (!normalized.matched && (boss.zone?.trim() ?? '').length > 0) {
      const unmatched = {
        source: 'boss' as const,
        rawName: boss.zone!.trim(),
        fallbackZoneName: normalized.zoneName,
      }
      unmatchedZoneNames.push(unmatched)
      group.unmatchedEntries.push(unmatched)
    }
  }

  for (const picto of pictos) {
    const normalized = normalizeZoneName(picto.mapName, 'picto')
    const group = getOrCreateGroup(normalized.zoneName)
    group.pictos.push(picto)
    group.totalPictos += 1
    if (picto.found) {
      group.foundPictos += 1
    }

    if (!normalized.matched && picto.mapName.trim().length > 0) {
      const unmatched = {
        source: 'picto' as const,
        rawName: picto.mapName.trim(),
        fallbackZoneName: normalized.zoneName,
      }
      unmatchedZoneNames.push(unmatched)
      group.unmatchedEntries.push(unmatched)
    }
  }

  for (const foot of monocoFeet) {
    const rawLocations = foot.locations.length > 0 ? foot.locations : ['']
    const processedZones = new Set<string>()

    for (const rawLocation of rawLocations) {
      const normalized = normalizeZoneName(rawLocation, 'foot')
      if (processedZones.has(normalized.zoneName)) {
        continue
      }
      processedZones.add(normalized.zoneName)

      const group = getOrCreateGroup(normalized.zoneName)
      group.monocoFeet.push(foot)
      group.totalFeet += 1
      if (foot.found) {
        group.foundFeet += 1
      }

      if (!normalized.matched && rawLocation.trim().length > 0) {
        const unmatched = {
          source: 'foot' as const,
          rawName: rawLocation.trim(),
          fallbackZoneName: normalized.zoneName,
        }
        unmatchedZoneNames.push(unmatched)
        group.unmatchedEntries.push(unmatched)
      }
    }
  }

  for (const journal of journals) {
    const normalized = normalizeZoneName(journal.zoneName, 'journal')
    const group = getOrCreateGroup(normalized.zoneName)
    group.journals.push(journal)
    group.totalJournals += 1
    if (journal.found) {
      group.foundJournals += 1
    }

    if (!normalized.matched && journal.zoneName.trim().length > 0) {
      const unmatched = {
        source: 'journal' as const,
        rawName: journal.zoneName.trim(),
        fallbackZoneName: normalized.zoneName,
      }
      unmatchedZoneNames.push(unmatched)
      group.unmatchedEntries.push(unmatched)
    }
  }

  for (const lostGestral of lostGestrals) {
    const normalized = normalizeZoneName(lostGestral.zoneName, 'lost_gestral')
    const group = getOrCreateGroup(normalized.zoneName)
    group.lostGestrals.push(lostGestral)
    group.totalLostGestrals += 1
    if (lostGestral.found) {
      group.foundLostGestrals += 1
    }

    if (!normalized.matched && lostGestral.zoneName.trim().length > 0) {
      const unmatched = {
        source: 'lost_gestral' as const,
        rawName: lostGestral.zoneName.trim(),
        fallbackZoneName: normalized.zoneName,
      }
      unmatchedZoneNames.push(unmatched)
      group.unmatchedEntries.push(unmatched)
    }
  }


  for (const friendlyNevron of friendlyNevrons) {
    const normalized = normalizeZoneName(
      friendlyNevron.zoneName,
      'friendly_nevron',
    )
    const group = getOrCreateGroup(normalized.zoneName)
    group.friendlyNevrons.push(friendlyNevron)
    group.totalFriendlyNevrons += 1
    if (friendlyNevron.isPeaceful) {
      group.peacefulFriendlyNevrons += 1
    }
    if (friendlyNevron.isKilled) {
      group.killedFriendlyNevrons += 1
    }

    if (!normalized.matched && friendlyNevron.zoneName.trim().length > 0) {
      const unmatched = {
        source: 'friendly_nevron' as const,
        rawName: friendlyNevron.zoneName.trim(),
        fallbackZoneName: normalized.zoneName,
      }
      unmatchedZoneNames.push(unmatched)
      group.unmatchedEntries.push(unmatched)
    }
  }

  for (const weapon of weapons) {
    const normalized = normalizeZoneName(weapon.zoneName, 'weapon')
    const group = getOrCreateGroup(normalized.zoneName)
    group.weapons.push(weapon)
    group.totalWeapons += 1
    if (weapon.found) {
      group.foundWeapons += 1
    }

    if (!normalized.matched && weapon.zoneName.trim().length > 0) {
      const unmatched = {
        source: 'weapon' as const,
        rawName: weapon.zoneName.trim(),
        fallbackZoneName: normalized.zoneName,
      }
      unmatchedZoneNames.push(unmatched)
      group.unmatchedEntries.push(unmatched)
    }
  }

  for (const musicRecord of musicRecords) {
    const normalized = normalizeZoneName(musicRecord.zoneName, 'music')
    const group = getOrCreateGroup(normalized.zoneName)
    group.musicRecords.push(musicRecord)
    group.totalMusicRecords += 1
    if (musicRecord.found) {
      group.foundMusicRecords += 1
    }

    if (!normalized.matched && musicRecord.zoneName.trim().length > 0) {
      const unmatched = {
        source: 'music' as const,
        rawName: musicRecord.zoneName.trim(),
        fallbackZoneName: normalized.zoneName,
      }
      unmatchedZoneNames.push(unmatched)
      group.unmatchedEntries.push(unmatched)
    }
  }
  const normalizedLocation = normalizeCurrentLocation(currentLocation)
  unmatchedZoneNames.push(...normalizedLocation.unmatchedLocation)

  return {
    zoneGroups: Array.from(groups.values()).sort(compareChecklistZoneGroups),
    unmatchedZoneNames,
    currentZoneName: normalizedLocation.currentZoneName,
    monocoFeet,
    journals,
    lostGestrals,
    friendlyNevrons,
    weapons,
    musicRecords,
  }
}

export function summarizeChecklist(model: ChecklistModel): ChecklistSummary {
  const totalBosses = model.zoneGroups.reduce(
    (sum, zone) => sum + zone.totalBosses,
    0,
  )
  const killedBosses = model.zoneGroups.reduce((sum, zone) => sum + zone.killed, 0)
  const totalPictos = model.zoneGroups.reduce(
    (sum, zone) => sum + zone.totalPictos,
    0,
  )
  const foundPictos = model.zoneGroups.reduce(
    (sum, zone) => sum + zone.foundPictos,
    0,
  )
  const totalFeet = model.monocoFeet.length
  const foundFeet = model.monocoFeet.filter((foot) => foot.found).length
  const totalJournals = model.journals.length
  const foundJournals = model.journals.filter((journal) => journal.found).length
  const totalLostGestrals = model.lostGestrals.length
  const foundLostGestrals = model.lostGestrals.filter((lostGestral) => lostGestral.found).length
  const totalFriendlyNevrons = model.friendlyNevrons.length
  const peacefulFriendlyNevrons = model.friendlyNevrons.filter((friendlyNevron) => friendlyNevron.isPeaceful).length
  const killedFriendlyNevrons = model.friendlyNevrons.filter((friendlyNevron) => friendlyNevron.isKilled).length
  const totalWeapons = model.weapons.length
  const foundWeapons = model.weapons.filter((weapon) => weapon.found).length
  const totalMusicRecords = model.musicRecords.length
  const foundMusicRecords = model.musicRecords.filter((musicRecord) => musicRecord.found).length
  const currentZone = model.currentZoneName
    ? model.zoneGroups.find((zone) => zone.zoneName === model.currentZoneName) ?? null
    : null

  return {
    killedBosses,
    totalBosses,
    remainingBosses: totalBosses - killedBosses,
    foundPictos,
    totalPictos,
    remainingPictos: totalPictos - foundPictos,
    foundFeet,
    totalFeet,
    remainingFeet: totalFeet - foundFeet,
    foundJournals,
    totalJournals,
    remainingJournals: totalJournals - foundJournals,
    foundLostGestrals,
    totalLostGestrals,
    remainingLostGestrals: totalLostGestrals - foundLostGestrals,
    peacefulFriendlyNevrons,
    killedFriendlyNevrons,
    totalFriendlyNevrons,
    remainingFriendlyNevrons: totalFriendlyNevrons - peacefulFriendlyNevrons - killedFriendlyNevrons,
    foundWeapons,
    totalWeapons,
    remainingWeapons: totalWeapons - foundWeapons,
    foundMusicRecords,
    totalMusicRecords,
    remainingMusicRecords: totalMusicRecords - foundMusicRecords,
    currentZoneRemainingBosses: currentZone
      ? currentZone.totalBosses - currentZone.killed
      : 0,
    currentZoneRemainingPictos: currentZone
      ? currentZone.totalPictos - currentZone.foundPictos
      : 0,
    currentZoneRemainingFeet: currentZone
      ? currentZone.totalFeet - currentZone.foundFeet
      : 0,
    currentZoneRemainingJournals: currentZone
      ? currentZone.totalJournals - currentZone.foundJournals
      : 0,
    currentZoneRemainingLostGestrals: currentZone
      ? currentZone.totalLostGestrals - currentZone.foundLostGestrals
      : 0,
    currentZoneRemainingFriendlyNevrons: currentZone
      ? currentZone.totalFriendlyNevrons - currentZone.peacefulFriendlyNevrons - currentZone.killedFriendlyNevrons
      : 0,
    currentZoneRemainingWeapons: currentZone
      ? currentZone.totalWeapons - currentZone.foundWeapons
      : 0,
    currentZoneRemainingMusicRecords: currentZone
      ? currentZone.totalMusicRecords - currentZone.foundMusicRecords
      : 0,
  }
}

export function filterChecklistGroups(
  model: ChecklistModel,
  options: ChecklistFilterOptions,
): FilteredChecklistZoneGroup[] {
  const searchTerm = options.searchTerm.trim().toLowerCase()
  const translateBossName = options.translateBossName ?? ((value: string) => value)

  let zoneGroups = model.zoneGroups
  if (options.filterMode === 'current_zone') {
    if (!model.currentZoneName) {
      return []
    }

    zoneGroups = zoneGroups.filter((zone) => zone.zoneName === model.currentZoneName)
  }

  return zoneGroups
    .map((zone) => {
      const visibleBosses = zone.bosses.filter(
        (boss) =>
          bossMatchesFilter(boss, options.filterMode) &&
          (searchTerm.length === 0 ||
            bossMatchesSearch(boss, searchTerm, translateBossName)),
      )

      const visiblePictos = zone.pictos.filter(
        (picto) =>
          pictoMatchesFilter(picto, options.filterMode) &&
          (searchTerm.length === 0 || pictoMatchesSearch(picto, searchTerm)),
      )

      const visibleMonocoFeet = zone.monocoFeet.filter(
        (foot) =>
          monocoFootMatchesFilter(foot, options.filterMode) &&
          (searchTerm.length === 0 || monocoFootMatchesSearch(foot, searchTerm)),
      )

      const visibleJournals = zone.journals.filter(
        (journal) =>
          journalMatchesFilter(journal, options.filterMode) &&
          (searchTerm.length === 0 || journalMatchesSearch(journal, searchTerm)),
      )

      const visibleLostGestrals = zone.lostGestrals.filter(
        (lostGestral) =>
          lostGestralMatchesFilter(lostGestral, options.filterMode) &&
          (searchTerm.length === 0 ||
            lostGestralMatchesSearch(lostGestral, searchTerm)),
      )
      const visibleFriendlyNevrons = zone.friendlyNevrons.filter(
        (friendlyNevron) =>
          friendlyNevronMatchesFilter(friendlyNevron, options.filterMode) &&
          (searchTerm.length === 0 ||
            friendlyNevronMatchesSearch(friendlyNevron, searchTerm)),
      )

      const visibleWeapons = zone.weapons.filter(
        (weapon) =>
          weaponMatchesFilter(weapon, options.filterMode) &&
          (searchTerm.length === 0 || weaponMatchesSearch(weapon, searchTerm)),
      )

      const visibleMusicRecords = zone.musicRecords.filter(
        (musicRecord) =>
          musicRecordMatchesFilter(musicRecord, options.filterMode) &&
          (searchTerm.length === 0 || musicRecordMatchesSearch(musicRecord, searchTerm)),
      )

      return {
        ...zone,
        visibleBosses,
        visiblePictos,
        visibleMonocoFeet,
        visibleJournals,
        visibleLostGestrals,
        visibleFriendlyNevrons,
        visibleWeapons,
        visibleMusicRecords,
      }
    })
    .filter(
      (zone) =>
        zone.visibleBosses.length > 0 ||
        zone.visiblePictos.length > 0 ||
        zone.visibleMonocoFeet.length > 0 ||
        zone.visibleJournals.length > 0 ||
        zone.visibleLostGestrals.length > 0 ||
        zone.visibleFriendlyNevrons.length > 0 ||
        zone.visibleWeapons.length > 0 ||
        zone.visibleMusicRecords.length > 0,
    )
}

export function reportUnmatchedZoneNames(
  unmatchedZoneNames: UnmatchedZoneName[],
  log: (message: string) => void = console.warn,
): void {
  for (const unmatched of unmatchedZoneNames) {
    const dedupeKey = `${unmatched.source}:${unmatched.rawName}`
    if (reportedUnmatchedZoneNames.has(dedupeKey)) {
      continue
    }

    reportedUnmatchedZoneNames.add(dedupeKey)
    log(
      `[zone-normalization] Unmatched ${unmatched.source} zone "${unmatched.rawName}" is using fallback group "${unmatched.fallbackZoneName}".`,
    )
  }
}









