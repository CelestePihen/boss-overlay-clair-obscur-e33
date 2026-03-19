export function formatZoneLevelLabel(
  recommendedMinLevel?: number,
  recommendedMaxLevel?: number,
): string {
  if (recommendedMinLevel === undefined || recommendedMaxLevel === undefined) {
    return ''
  }

  if (recommendedMinLevel === recommendedMaxLevel) {
    return ` \u2014 ${recommendedMinLevel}`
  }

  return ` \u2014 ${recommendedMinLevel}-${recommendedMaxLevel}`
}
