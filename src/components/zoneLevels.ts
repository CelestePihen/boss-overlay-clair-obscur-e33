import ignZoneLevelsJson from '../../data/ign_zone_levels.json' with { type: 'json' }
import type {
  IgnZoneLevelsFile,
  ZoneLevelCoverageReport,
  ZoneLevelRange,
} from '../types/ZoneLevels.ts'
import { toZoneLookupKey, ZONE_ALIASES } from './zoneNormalization.ts'

export const IGN_ZONE_LEVEL_ALIASES: Record<string, string[]> = {
  abbest_cave: ['Abbest Cave'],
  crimson_forest: ['Crimson Forest'],
  dark_gestral_arena: ['Dark Gestral Arena'],
  dark_shores_bloodied_beach: ['Dark Shores'],
  endless_night_sanctuary: ['Endless Night Sanctuary'],
  endless_tower: ['Endless Tower'],
  esoteric_ruins_continent: ['Esoteric Ruins'],
  falling_leaves: ['Falling Leaves'],
  flying_manor: ['Flying Manor'],
  frozen_hearts: ['Frozen Hearts'],
  hidden_gestral_arena: ['Hidden Gestral Arena'],
  isle_of_eyes: ['Isle of the Eyes'],
  painting_workshop: ['Painting Workshop'],
  red_woods: ['Red Woods'],
  renoir_drafts: ["Renoir's Drafts"],
  sacred_river: ['Sacred River'],
  sirene_dress: ["Sirene's Dress"],
  sky_island: ['Sky Island'],
  spring_meadows: ['The Meadows'],
  stone_wave_cliffs_cave: ['Stone Wave Cliffs Cave'],
  sunless_cliffs: ['Sunless Cliffs'],
  the_chosen_path: ['The Chosen Path'],
  the_crows: ['The Crows'],
  the_reacher: ['The Reacher'],
  verso_drafts: ["Verso's Drafts"],
  yellow_harvest: ['Yellow Harvest'],
}

function buildIgnZoneLookup(
  ignZoneLevels: IgnZoneLevelsFile,
): Map<string, { zoneName: string; levelRange: ZoneLevelRange }> {
  const lookup = new Map<string, { zoneName: string; levelRange: ZoneLevelRange }>()

  for (const [zoneName, levelEntry] of Object.entries(ignZoneLevels.zones)) {
    lookup.set(toZoneLookupKey(zoneName), {
      zoneName,
      levelRange: {
        recommendedMinLevel: levelEntry.recommendedMinLevel,
        recommendedMaxLevel: levelEntry.recommendedMaxLevel,
        sourceZoneName: zoneName,
        sourceAnchorId: levelEntry.anchorId,
      },
    })
  }

  return lookup
}

function resolveZoneLevelRange(
  canonicalZoneName: string,
  ignLookup: Map<string, { zoneName: string; levelRange: ZoneLevelRange }>,
): ZoneLevelRange | null {
  const candidates = [
    ...(IGN_ZONE_LEVEL_ALIASES[canonicalZoneName] ?? []),
    ...(ZONE_ALIASES[canonicalZoneName] ?? []),
  ]

  const seen = new Set<string>()
  for (const candidate of candidates) {
    const key = toZoneLookupKey(candidate)
    if (seen.has(key)) {
      continue
    }
    seen.add(key)

    const match = ignLookup.get(key)
    if (match) {
      return match.levelRange
    }
  }

  return null
}

export function buildZoneLevelCoverageReport(
  ignZoneLevels: IgnZoneLevelsFile,
  canonicalZoneNames: string[] = Object.keys(ZONE_ALIASES),
): ZoneLevelCoverageReport {
  const ignLookup = buildIgnZoneLookup(ignZoneLevels)
  const resolvedZones: Record<string, ZoneLevelRange> = {}
  const matchedIgnKeys = new Set<string>()

  for (const zoneName of canonicalZoneNames) {
    const resolved = resolveZoneLevelRange(zoneName, ignLookup)
    if (!resolved) {
      continue
    }

    resolvedZones[zoneName] = resolved
    matchedIgnKeys.add(toZoneLookupKey(resolved.sourceZoneName))
  }

  const missingCanonicalZones = canonicalZoneNames.filter(
    (zoneName) => !resolvedZones[zoneName],
  )

  const unmappedIgnZones = Object.keys(ignZoneLevels.zones).filter(
    (zoneName) => !matchedIgnKeys.has(toZoneLookupKey(zoneName)),
  )

  return {
    aliasMap: IGN_ZONE_LEVEL_ALIASES,
    resolvedZones,
    missingCanonicalZones,
    unmappedIgnZones,
  }
}

const defaultCoverageReport = buildZoneLevelCoverageReport(
  ignZoneLevelsJson as IgnZoneLevelsFile,
)

export const zoneLevelCoverageReport = defaultCoverageReport
export const zoneLevelsByZoneName = defaultCoverageReport.resolvedZones
