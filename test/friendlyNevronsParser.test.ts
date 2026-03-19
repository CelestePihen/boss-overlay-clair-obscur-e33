import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'

import {
  extractFriendlyNevrons,
  type FriendlyNevronCatalogFile,
  type FriendlyNevronSaveData,
} from '../electron/friendlyNevrons.ts'

async function readJson<T>(path: string): Promise<T> {
  return JSON.parse(await readFile(path, 'utf-8')) as T
}

function requireEntry(
  entries: ReturnType<typeof extractFriendlyNevrons>,
  id: string,
) {
  const entry = entries.find((item) => item.id === id)
  assert.ok(entry, `Expected Friendly Nevron ${id} to exist`)
  return entry
}

const rootDir = process.cwd()
const catalogPath = resolve(rootDir, 'data', 'friendly_nevrons.json')
const savePath = resolve(rootDir, 'test_save', 'expedition_0.json')
const catalog = await readJson<FriendlyNevronCatalogFile>(catalogPath)
const saveData = await readJson<FriendlyNevronSaveData>(savePath)

const extracted = extractFriendlyNevrons(saveData, catalog.FriendlyNevrons)
assert.equal(extracted.length, 10)
assert.equal(extracted.filter((entry) => entry.resolution === 'peace').length, 5)
assert.equal(extracted.filter((entry) => entry.resolution === 'killed').length, 0)
assert.equal(extracted.filter((entry) => entry.resolution === 'unresolved').length, 5)

assert.equal(requireEntry(extracted, 'Nevron_JarNeedLight').resolution, 'peace')
assert.equal(requireEntry(extracted, 'Nevron_DemineurMissingMine').resolution, 'peace')
assert.equal(requireEntry(extracted, 'Nevron_DanseuseDanceClass').resolution, 'peace')
assert.equal(requireEntry(extracted, 'Nevron_PortierDoorMaze').resolution, 'peace')
assert.equal(requireEntry(extracted, 'Nevron_Hexga').resolution, 'peace')
assert.equal(requireEntry(extracted, 'Nevron_JudgeOfMercy').resolution, 'unresolved')
assert.equal(requireEntry(extracted, 'Nevron_Troubadour').resolution, 'unresolved')

const syntheticCatalog = {
  Nevron_Test: {
    questId: 'Nevron_Test',
    objectiveId: 'KillTest',
    name: 'Test Nevron',
    zoneName: 'spring_meadows',
    sourceZoneName: 'Spring Meadows',
    summary: 'Test.',
  },
}

const syntheticSave: FriendlyNevronSaveData = {
  root: {
    properties: {
      QuestStatuses_0: {
        Map: [
          {
            key: { Name: 'Nevron_Test' },
            value: {
              Struct: {
                Struct: {
                  ObjectivesStatus_8_EA1232C14DA1F6DDA84EBA9185000F56_0: {
                    Map: [
                      {
                        key: { Name: 'HelpTest' },
                        value: { Byte: { Label: 'E_QuestStatus::NewEnumerator1' } },
                      },
                      {
                        key: { Name: 'KillTest' },
                        value: { Byte: { Label: 'E_QuestStatus::NewEnumerator0' } },
                      },
                    ],
                  },
                },
              },
            },
          },
        ],
      },
    },
  },
}

assert.equal(
  extractFriendlyNevrons(syntheticSave, syntheticCatalog).at(0)?.resolution,
  'peace',
)

const killedSave: FriendlyNevronSaveData = {
  root: {
    properties: {
      QuestStatuses_0: {
        Map: [
          {
            key: { Name: 'Nevron_Test' },
            value: {
              Struct: {
                Struct: {
                  ObjectivesStatus_8_EA1232C14DA1F6DDA84EBA9185000F56_0: {
                    Map: [
                      {
                        key: { Name: 'HelpTest' },
                        value: { Byte: { Label: 'E_QuestStatus::NewEnumerator2' } },
                      },
                      {
                        key: { Name: 'KillTest' },
                        value: { Byte: { Label: 'E_QuestStatus::NewEnumerator2' } },
                      },
                    ],
                  },
                },
              },
            },
          },
        ],
      },
    },
  },
}

const killedEntry = extractFriendlyNevrons(killedSave, syntheticCatalog).at(0)
assert.equal(killedEntry?.resolution, 'killed')
assert.equal(killedEntry?.isKilled, true)
assert.equal(killedEntry?.isPeaceful, false)

const unresolvedEntry = extractFriendlyNevrons({}, syntheticCatalog).at(0)
assert.equal(unresolvedEntry?.resolution, 'unresolved')
assert.equal(unresolvedEntry?.isResolved, false)

console.log('friendlyNevronsParser.test.ts passed')
