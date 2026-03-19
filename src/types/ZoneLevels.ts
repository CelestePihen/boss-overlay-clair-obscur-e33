export interface ZoneLevelRange {
  recommendedMinLevel: number
  recommendedMaxLevel: number
  sourceZoneName: string
  sourceAnchorId: string
}

export interface IgnZoneLevelEntry {
  recommendedMinLevel: number
  recommendedMaxLevel: number
  anchorId: string
}

export interface IgnZoneLevelsFile {
  sourceUrl: string
  zones: Record<string, IgnZoneLevelEntry>
}

export interface ZoneLevelCoverageReport {
  aliasMap: Record<string, string[]>
  resolvedZones: Record<string, ZoneLevelRange>
  missingCanonicalZones: string[]
  unmappedIgnZones: string[]
}
