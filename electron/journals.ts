import type { JournalEntry } from '../src/types/JournalEntry.js'

export interface JournalCatalogEntry {
  id: string
  name: string
}

export interface JournalCatalogFile {
  Journals: Record<string, JournalCatalogEntry>
}

export interface JournalLocationEntry {
  journalName: string
  zoneName: string
  sourceZoneName: string
  summary: string
}

export interface JournalLocationFile {
  Journals: Record<string, JournalLocationEntry>
}

export interface JournalSaveData {
  root?: {
    properties?: {
      InventoryItems_0?: {
        Map?: Array<{
          key?: { Name?: string }
          value?: { Int?: number }
        }>
      }
    }
  }
}

function createDefaultLocation(entry: JournalCatalogEntry): JournalLocationEntry {
  return {
    journalName: entry.name,
    zoneName: 'uncategorized',
    sourceZoneName: '',
    summary: '',
  }
}

export function extractJournals(
  saveData: JournalSaveData,
  catalog: Record<string, JournalCatalogEntry>,
  locations: Record<string, JournalLocationEntry>,
): JournalEntry[] {
  const inventoryItems = saveData.root?.properties?.InventoryItems_0?.Map ?? []
  const inventoryCounts = new Map<string, number>()

  for (const entry of inventoryItems) {
    const id = entry.key?.Name
    if (!id) {
      continue
    }

    inventoryCounts.set(id.toLowerCase(), entry.value?.Int ?? 0)
  }

  return Object.entries(catalog).map(([journalId, entry]) => {
    const metadata = locations[journalId] ?? createDefaultLocation(entry)
    const count = inventoryCounts.get(journalId.toLowerCase()) ?? 0

    return {
      id: journalId,
      name: entry.name,
      found: count > 0,
      count,
      zoneName: metadata.zoneName,
      sourceZoneName: metadata.sourceZoneName,
      summary: metadata.summary,
    }
  })
}
