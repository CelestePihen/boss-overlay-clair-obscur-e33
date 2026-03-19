import type { LostGestralEntry } from '../src/types/LostGestralEntry.js'

export interface LostGestralCatalogItem {
  id: string
  name: string
  zoneName: string
  sourceZoneName: string
  summary: string
}

export interface LostGestralCatalogFile {
  LostGestrals: Record<string, LostGestralCatalogItem>
}

export interface LostGestralSaveData {
  root?: {
    properties?: {
      QuestStatuses_0?: {
        Map?: Array<{
          key?: { Name?: string }
          value?: {
            Struct?: {
              Struct?: {
                ObjectivesStatus_8_EA1232C14DA1F6DDA84EBA9185000F56_0?: {
                  Map?: Array<{
                    key?: { Name?: string }
                    value?: {
                      Byte?: {
                        Label?: string
                      }
                    }
                  }>
                }
              }
            }
          }
        }>
      }
    }
  }
}

const LOST_GESTRALS_QUEST_NAME = 'Bonus_LostGestrals'
const MISSING_STATUS_LABEL = 'E_QuestStatus::NewEnumerator0'

export function extractLostGestrals(
  saveData: LostGestralSaveData,
  catalog: Record<string, LostGestralCatalogItem>,
): LostGestralEntry[] {
  const questEntries = saveData.root?.properties?.QuestStatuses_0?.Map ?? []
  const questEntry = questEntries.find(
    (entry) => entry.key?.Name === LOST_GESTRALS_QUEST_NAME,
  )
  const objectiveStatuses =
    questEntry?.value?.Struct?.Struct?.ObjectivesStatus_8_EA1232C14DA1F6DDA84EBA9185000F56_0
      ?.Map ?? []

  const foundObjectives = new Set<string>()
  for (const objective of objectiveStatuses) {
    const objectiveId = objective.key?.Name
    const statusLabel = objective.value?.Byte?.Label
    if (!objectiveId || !statusLabel) {
      continue
    }

    if (statusLabel !== MISSING_STATUS_LABEL) {
      foundObjectives.add(objectiveId.toLowerCase())
    }
  }

  return Object.entries(catalog).map(([objectiveId, entry]) => ({
    id: objectiveId,
    name: entry.name,
    found: foundObjectives.has(objectiveId.toLowerCase()),
    zoneName: entry.zoneName,
    sourceZoneName: entry.sourceZoneName,
    summary: entry.summary,
  }))
}
