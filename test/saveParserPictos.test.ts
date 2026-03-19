import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'

import {
  buildPictoCatalogFromCompositeData,
  extractPictos,
  parsePictoAcquireTsv,
  type PictoCatalogFile,
  type PictoSaveData,
  validatePictoAcquireData,
} from '../electron/pictos.ts'

async function readJson<T>(path: string): Promise<T> {
  return JSON.parse(await readFile(path, 'utf-8')) as T
}

function requirePicto(pictos: ReturnType<typeof extractPictos>, id: string) {
  const picto = pictos.find((entry) => entry.id === id)
  assert.ok(picto, `Expected picto ${id} to exist in extracted snapshot`)
  return picto
}

const rootDir = process.cwd()
const compositeDataPath = resolve(
  rootDir,
  'originalGameMapping',
  'DT_jRPG_Items_Composite.json',
)
const committedCatalogPath = resolve(rootDir, 'data', 'pictos.json')
const acquireTsvPath = resolve(rootDir, 'data', 'pictos_acquire.tsv')
const exportedSavePath = resolve(rootDir, 'test_save', 'expedition_0.json')

const generatedCatalog = buildPictoCatalogFromCompositeData(
  await readJson(compositeDataPath),
)
const committedCatalog = await readJson<PictoCatalogFile>(committedCatalogPath)
const acquireTsv = await readFile(acquireTsvPath, 'utf-8')
const exportedSave = await readJson<PictoSaveData>(exportedSavePath)
const pictoAcquireInfo = parsePictoAcquireTsv(acquireTsv)

validatePictoAcquireData(committedCatalog.Pictos, pictoAcquireInfo)

assert.deepEqual(
  committedCatalog,
  generatedCatalog,
  'Checked-in picto catalog should match the generator output',
)

assert.equal(
  Object.keys(committedCatalog.Pictos).length,
  210,
  'Expected the picto catalog to contain only obtainable pictos',
)
assert.equal(committedCatalog.Pictos['AP+1TurnStart'], 'Energising Turn')
assert.equal(committedCatalog.Pictos.DoubleAP, 'Energy Master')
assert.equal(committedCatalog.Pictos.BestDefense, undefined)
assert.equal(committedCatalog.Pictos['02_ArmPicto_Placeholder'], undefined)

const extractedPictos = extractPictos(
  exportedSave,
  committedCatalog.Pictos,
  pictoAcquireInfo,
)
assert.equal(
  extractedPictos.length,
  Object.keys(committedCatalog.Pictos).length,
  'Expected every catalog picto to be represented in the save snapshot',
)

const energisingTurn = requirePicto(extractedPictos, 'AP+1TurnStart')
assert.equal(energisingTurn.found, true)
assert.equal(energisingTurn.mastered, true)
assert.equal(energisingTurn.level, 14)
assert.equal(energisingTurn.mapName.length > 0, true)
assert.equal(energisingTurn.howToGet.length > 0, true)

const dodger = requirePicto(extractedPictos, 'Dodger')
assert.equal(dodger.found, true)
assert.equal(dodger.mastered, true)
assert.equal(dodger.level, 1)
assert.equal(dodger.effect, 'Gain 1 AP after Perfect Dodge. Once per turn.')
assert.equal(dodger.speed, '12')
assert.equal(dodger.criticalRate, '3%')
assert.equal(dodger.mapName, 'Spring Meadows')
assert.equal(dodger.nearestFlag, 'Meadows Corridor')
assert.equal(dodger.howToGet, 'Defeat the Portier after Lune joins the party.')

const doubleAp = requirePicto(extractedPictos, 'DoubleAP')
assert.equal(doubleAp.found, false)
assert.equal(doubleAp.mastered, false)
assert.equal(doubleAp.level, 1)
assert.equal(doubleAp.mapName.length > 0, true)
assert.equal(doubleAp.howToGet.length > 0, true)

const caseInsensitivePictos = extractPictos(
  {
    root: {
      properties: {
        InventoryItems_0: {
          Map: [{ key: { Name: 'doubleap' }, value: { Int: 1 } }],
        },
        PassiveEffectsProgressions_0: {
          Array: {
            Struct: {
              value: [
                {
                  Struct: {
                    PassiveEffectName_3_A92DB6CC4549450728A867A714ADF6C5_0: {
                      Name: 'doubleap',
                    },
                    IsLearnt_9_2561000E49D90653437DE9A45BE2A86D_0: {
                      Bool: true,
                    },
                  },
                },
              ],
            },
          },
        },
        WeaponProgressions_0: {
          Array: {
            Struct: {
              value: [
                {
                  Struct: {
                    DefinitionID_3_60EB24664894755B19F4EBA18A21AF1A_0: {
                      Name: 'doubleap',
                    },
                    CurrentLevel_6_227A00644D035BDD595B2D86C8455B71_0: {
                      Int: 7,
                    },
                  },
                },
              ],
            },
          },
        },
      },
    },
  },
  { DoubleAP: 'Energy Master' },
  new Map([
    [
      'Energy Master',
      {
        pictoName: 'Energy Master',
        effect: 'Every AP gain is increased by 1.',
        health: '117',
        defense: '',
        speed: '54',
        criticalRate: '',
        mapName: 'Spring Meadows',
        nearestFlag: 'Meadows Corridor',
        mapAndNearestFlag: 'Spring Meadows (Meadows Corridor)',
        howToGet: 'Win the fight.',
      },
    ],
  ]),
)

assert.deepEqual(caseInsensitivePictos, [
  {
    id: 'DoubleAP',
    friendlyName: 'Energy Master',
    found: true,
    mastered: true,
    level: 7,
    effect: 'Every AP gain is increased by 1.',
    health: '117',
    defense: '',
    speed: '54',
    criticalRate: '',
    mapName: 'Spring Meadows',
    nearestFlag: 'Meadows Corridor',
    mapAndNearestFlag: 'Spring Meadows (Meadows Corridor)',
    howToGet: 'Win the fight.',
  },
])

console.log('saveParserPictos.test.ts passed')
