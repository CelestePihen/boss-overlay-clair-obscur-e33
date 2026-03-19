import type { FriendlyNevronEntry } from '../src/types/FriendlyNevronEntry.js'

export interface FriendlyNevronCatalogItem {
  questId: string
  objectiveId: string
  name: string
  zoneName: string
  sourceZoneName: string
  summary: string
}

export interface FriendlyNevronCatalogFile {
  FriendlyNevrons: Record<string, FriendlyNevronCatalogItem>
}

export interface FriendlyNevronSaveData {
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

const MISSING_STATUS_LABEL = 'E_QuestStatus::NewEnumerator0'

function isCompletedStatus(label: string | undefined): boolean {
  return !!label && label !== MISSING_STATUS_LABEL
}

export function extractFriendlyNevrons(
  saveData: FriendlyNevronSaveData,
  catalog: Record<string, FriendlyNevronCatalogItem>,
): FriendlyNevronEntry[] {
  const questEntries = saveData.root?.properties?.QuestStatuses_0?.Map ?? []
  const questMap = new Map<string, (typeof questEntries)[number]>()

  for (const entry of questEntries) {
    const questId = entry.key?.Name
    if (!questId) {
      continue
    }

    questMap.set(questId.toLowerCase(), entry)
  }

  return Object.entries(catalog).map(([questId, entry]) => {
    const questEntry = questMap.get(questId.toLowerCase())
    const objectiveStatuses =
      questEntry?.value?.Struct?.Struct?.ObjectivesStatus_8_EA1232C14DA1F6DDA84EBA9185000F56_0
        ?.Map ?? []

    const objectiveMap = new Map<string, string>()
    for (const objective of objectiveStatuses) {
      const objectiveId = objective.key?.Name
      if (!objectiveId) {
        continue
      }

      objectiveMap.set(objectiveId.toLowerCase(), objective.value?.Byte?.Label ?? '')
    }

    const killStatus = objectiveMap.get(entry.objectiveId.toLowerCase())
    const isKilled = isCompletedStatus(killStatus)

    const nonKillObjectives = objectiveStatuses.filter(
      (objective) =>
        objective.key?.Name && objective.key.Name.toLowerCase() !== entry.objectiveId.toLowerCase(),
    )
    const isPeaceful =
      !isKilled &&
      nonKillObjectives.length > 0 &&
      nonKillObjectives.every((objective) =>
        isCompletedStatus(objective.value?.Byte?.Label),
      )

    const resolution = isKilled ? 'killed' : isPeaceful ? 'peace' : 'unresolved'

    return {
      id: questId,
      objectiveId: entry.objectiveId,
      name: entry.name,
      resolution,
      isKilled,
      isPeaceful,
      isResolved: isKilled || isPeaceful,
      zoneName: entry.zoneName,
      sourceZoneName: entry.sourceZoneName,
      summary: entry.summary,
    }
  })
}
