export type FriendlyNevronResolution = 'unresolved' | 'peace' | 'killed'

export interface FriendlyNevronEntry {
  id: string
  objectiveId: string
  name: string
  resolution: FriendlyNevronResolution
  isKilled: boolean
  isPeaceful: boolean
  isResolved: boolean
  zoneName: string
  sourceZoneName: string
  summary: string
}
