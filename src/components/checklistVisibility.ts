import type { ChecklistZoneGroup, FilteredChecklistZoneGroup } from './checklistModel'

export type ChecklistFeatureKey =
  | 'bosses'
  | 'pictos'
  | 'feet'
  | 'journals'
  | 'lostGestrals'
  | 'friendlyNevrons'
  | 'weapons'
  | 'musicRecords'

export interface ChecklistFeatureVisibility {
  bosses: boolean
  pictos: boolean
  feet: boolean
  journals: boolean
  lostGestrals: boolean
  friendlyNevrons: boolean
  weapons: boolean
  musicRecords: boolean
}

export const DEFAULT_CHECKLIST_FEATURE_VISIBILITY: ChecklistFeatureVisibility = {
  bosses: true,
  pictos: true,
  feet: true,
  journals: true,
  lostGestrals: true,
  friendlyNevrons: true,
  weapons: true,
  musicRecords: true,
}

export function toggleChecklistFeatureVisibility(
  visibility: ChecklistFeatureVisibility,
  key: ChecklistFeatureKey,
): ChecklistFeatureVisibility {
  return {
    ...visibility,
    [key]: !visibility[key],
  }
}

export function applyChecklistFeatureVisibility(
  zoneGroups: FilteredChecklistZoneGroup[],
  visibility: ChecklistFeatureVisibility,
): FilteredChecklistZoneGroup[] {
  return zoneGroups.map((zone) => ({
    ...zone,
    visibleBosses: visibility.bosses ? zone.visibleBosses : [],
    visiblePictos: visibility.pictos ? zone.visiblePictos : [],
    visibleMonocoFeet: visibility.feet ? zone.visibleMonocoFeet : [],
    visibleJournals: visibility.journals ? zone.visibleJournals : [],
    visibleLostGestrals: visibility.lostGestrals ? zone.visibleLostGestrals : [],
    visibleFriendlyNevrons: visibility.friendlyNevrons
      ? zone.visibleFriendlyNevrons
      : [],
    visibleWeapons: visibility.weapons ? zone.visibleWeapons : [],
    visibleMusicRecords: visibility.musicRecords ? zone.visibleMusicRecords : [],
  }))
}

export function zoneHasVisibleContent(zone: FilteredChecklistZoneGroup): boolean {
  return (
    zone.visibleBosses.length > 0 ||
    zone.visiblePictos.length > 0 ||
    zone.visibleMonocoFeet.length > 0 ||
    zone.visibleJournals.length > 0 ||
    zone.visibleLostGestrals.length > 0 ||
    zone.visibleFriendlyNevrons.length > 0 ||
    zone.visibleWeapons.length > 0 ||
    zone.visibleMusicRecords.length > 0
  )
}

export interface ZoneRemainingSummaryPart {
  key: ChecklistFeatureKey
  count: number
  label: string
}

const ZONE_SUMMARY_ICONS: Record<ChecklistFeatureKey, string> = {
  bosses: '\u{1F3C6}',
  pictos: '\u2728',
  feet: '\u{1F9B6}',
  journals: '\u{1F4D6}',
  lostGestrals: '\u{1F476}',
  friendlyNevrons: '\u{1F47E}',
  weapons: '\u{1F5E1}\uFE0F',
  musicRecords: '\u{1F4BF}',
}

export function buildZoneRemainingSummaryParts(
  zone: ChecklistZoneGroup,
  visibility: ChecklistFeatureVisibility,
): ZoneRemainingSummaryPart[] {
  const parts: ZoneRemainingSummaryPart[] = []

  const pushPart = (key: ChecklistFeatureKey, count: number) => {
    if (!visibility[key] || count <= 0) {
      return
    }

    parts.push({
      key,
      count,
      label: `${count}${ZONE_SUMMARY_ICONS[key]}`,
    })
  }

  pushPart('bosses', zone.totalBosses - zone.killed)
  pushPart('pictos', zone.totalPictos - zone.foundPictos)
  pushPart('feet', zone.totalFeet - zone.foundFeet)
  pushPart('journals', zone.totalJournals - zone.foundJournals)
  pushPart('lostGestrals', zone.totalLostGestrals - zone.foundLostGestrals)
  pushPart(
    'friendlyNevrons',
    zone.totalFriendlyNevrons - zone.peacefulFriendlyNevrons - zone.killedFriendlyNevrons,
  )
  pushPart('weapons', zone.totalWeapons - zone.foundWeapons)
  pushPart('musicRecords', zone.totalMusicRecords - zone.foundMusicRecords)

  return parts
}
