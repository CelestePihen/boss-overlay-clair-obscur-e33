import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'

import {
  extractLostGestrals,
  type LostGestralCatalogFile,
  type LostGestralSaveData,
} from '../electron/lostGestrals.ts'

async function readJson<T>(path: string): Promise<T> {
  return JSON.parse(await readFile(path, 'utf-8')) as T
}

function requireLostGestral(
  entries: ReturnType<typeof extractLostGestrals>,
  id: string,
) {
  const entry = entries.find((item) => item.id === id)
  assert.ok(entry, `Expected lost gestral ${id} to exist`)
  return entry
}

const catalogPath = resolve(process.cwd(), 'data', 'lost_gestrals.json')
const savePath = resolve(process.cwd(), 'test_save', 'expedition_0.json')
const catalog = await readJson<LostGestralCatalogFile>(catalogPath)
const saveData = await readJson<LostGestralSaveData>(savePath)

const lostGestrals = extractLostGestrals(saveData, catalog.LostGestrals)
assert.equal(lostGestrals.length, 9)
assert.equal(lostGestrals.filter((entry) => entry.found).length, 4)

assert.equal(requireLostGestral(lostGestrals, 'FindLostGestral_1').found, true)
assert.equal(requireLostGestral(lostGestrals, 'FindLostGestral_3').found, false)
assert.equal(requireLostGestral(lostGestrals, 'FindLostGestral_6').found, true)
assert.equal(requireLostGestral(lostGestrals, 'FindLostGestral_9').found, false)

const mixedStatuses = extractLostGestrals(
  {
    root: {
      properties: {
        QuestStatuses_0: {
          Map: [
            {
              key: { Name: 'Bonus_LostGestrals' },
              value: {
                Struct: {
                  Struct: {
                    ObjectivesStatus_8_EA1232C14DA1F6DDA84EBA9185000F56_0: {
                      Map: [
                        {
                          key: { Name: 'FindLostGestral_1' },
                          value: { Byte: { Label: 'E_QuestStatus::NewEnumerator0' } },
                        },
                        {
                          key: { Name: 'FindLostGestral_2' },
                          value: { Byte: { Label: 'E_QuestStatus::NewEnumerator1' } },
                        },
                        {
                          key: { Name: 'FindLostGestral_3' },
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
  },
  {
    FindLostGestral_1: {
      id: 'FindLostGestral_1',
      name: 'Lost Gestral 1',
      zoneName: 'the_continent',
      sourceZoneName: 'Continent Map',
      summary: 'First.',
    },
    FindLostGestral_2: {
      id: 'FindLostGestral_2',
      name: 'Lost Gestral 2',
      zoneName: 'the_continent',
      sourceZoneName: 'Continent Map',
      summary: 'Second.',
    },
    FindLostGestral_3: {
      id: 'FindLostGestral_3',
      name: 'Lost Gestral 3',
      zoneName: 'the_continent',
      sourceZoneName: 'Continent Map',
      summary: 'Third.',
    },
  },
)

assert.deepEqual(mixedStatuses, [
  {
    id: 'FindLostGestral_1',
    name: 'Lost Gestral 1',
    found: false,
    zoneName: 'the_continent',
    sourceZoneName: 'Continent Map',
    summary: 'First.',
  },
  {
    id: 'FindLostGestral_2',
    name: 'Lost Gestral 2',
    found: true,
    zoneName: 'the_continent',
    sourceZoneName: 'Continent Map',
    summary: 'Second.',
  },
  {
    id: 'FindLostGestral_3',
    name: 'Lost Gestral 3',
    found: true,
    zoneName: 'the_continent',
    sourceZoneName: 'Continent Map',
    summary: 'Third.',
  },
])

console.log('lostGestralsParser.test.ts passed')
