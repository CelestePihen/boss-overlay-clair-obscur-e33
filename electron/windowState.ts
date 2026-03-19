export interface WindowPosition {
  x: number
  y: number
}

export interface DisplayWorkArea {
  x: number
  y: number
  width: number
  height: number
}

export function getRestoredWindowPosition(
  position: Partial<WindowPosition> | undefined,
  displays: DisplayWorkArea[],
): WindowPosition | undefined {
  if (
    typeof position?.x !== 'number' ||
    Number.isNaN(position.x) ||
    typeof position?.y !== 'number' ||
    Number.isNaN(position.y)
  ) {
    return undefined
  }

  const x = position.x
  const y = position.y

  const isVisible = displays.some((display) => {
    return (
      x >= display.x &&
      x < display.x + display.width &&
      y >= display.y &&
      y < display.y + display.height
    )
  })

  if (!isVisible) {
    return undefined
  }

  return { x, y }
}
