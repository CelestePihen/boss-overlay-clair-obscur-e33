export const DEFAULT_BACKGROUND_OPACITY = 85

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

function formatAlpha(value: number): string {
  return clamp(value, 0, 1).toFixed(3).replace(/0+$/, '').replace(/\.$/, '')
}

function interpolate(min: number, max: number, ratio: number): number {
  return min + (max - min) * ratio
}

export interface OverlayTheme {
  backgroundColor: string
  cssVariables: Record<string, string>
}

export function normalizeBackgroundOpacity(value: unknown): number {
  const parsed =
    typeof value === 'number'
      ? value
      : typeof value === 'string'
        ? Number.parseFloat(value)
        : Number.NaN

  if (!Number.isFinite(parsed)) {
    return DEFAULT_BACKGROUND_OPACITY
  }

  return Math.min(100, Math.max(0, Math.round(parsed)))
}

export function getBackgroundColor(opacity: number): string {
  return `rgba(0, 0, 0, ${normalizeBackgroundOpacity(opacity) / 100})`
}

export function getOverlayTheme(opacity: number): OverlayTheme {
  const normalizedOpacity = normalizeBackgroundOpacity(opacity)
  const ratio = normalizedOpacity / 100

  return {
    backgroundColor: getBackgroundColor(normalizedOpacity),
    cssVariables: {
      '--text-primary': `rgba(255, 255, 255, ${formatAlpha(
        interpolate(0.82, 1, ratio),
      )})`,
      '--text-secondary': `rgba(255, 255, 255, ${formatAlpha(
        interpolate(0.58, 0.82, ratio),
      )})`,
      '--text-muted': `rgba(255, 255, 255, ${formatAlpha(
        interpolate(0.4, 0.68, ratio),
      )})`,
      '--killed-item-opacity': formatAlpha(interpolate(0.58, 0.82, ratio)),
      '--not-encountered-opacity': formatAlpha(
        interpolate(0.42, 0.68, ratio),
      ),
      '--found-picto-opacity': formatAlpha(interpolate(0.72, 0.9, ratio)),
    },
  }
}
