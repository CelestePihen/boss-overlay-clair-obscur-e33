import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'

import {
  extractMonocoFeet,
  type MonocoFeetCatalogFile,
  type MonocoFeetSaveData,
  parseMonocoFeetMetadata,
} from '../electron/monocoFeet.ts'

async function readJson<T>(path: string): Promise<T> {
  return JSON.parse(await readFile(path, 'utf-8')) as T
}

function requireFoot(
  feet: ReturnType<typeof extractMonocoFeet>,
  footId: string,
) {
  const foot = feet.find((entry) => entry.id === footId)
  assert.ok(foot, `Expected Monoco foot ${footId} to exist in extracted snapshot`)
  return foot
}

const rootDir = process.cwd()
const catalogPath = resolve(rootDir, 'data', 'monoco_feet.json')
const metadataPath = resolve(rootDir, 'data', 'feet_collection_with_locations.json')
const exportedSavePath = resolve(rootDir, 'test_save', 'expedition_0.json')

const catalog = await readJson<MonocoFeetCatalogFile>(catalogPath)
const metadataRows = await readJson(metadataPath)
const exportedSave = await readJson<MonocoFeetSaveData>(exportedSavePath)
const metadata = parseMonocoFeetMetadata(metadataRows)

assert.equal(Object.keys(catalog.MonocoFeet).length, 44)
assert.equal(metadata.size, 46)
assert.equal(metadata.has('chalierrelentlesssword'), true)
assert.equal(metadata.has('stalactcombo'), true)

const extractedFeet = extractMonocoFeet(exportedSave, catalog.MonocoFeet, metadata)
assert.equal(extractedFeet.length, Object.keys(catalog.MonocoFeet).length)

const braseleur = requireFoot(extractedFeet, 'BraseleurFoot')
assert.equal(braseleur.found, true)
assert.equal(braseleur.count, 1)
assert.equal(braseleur.skillUnlocked, true)
assert.equal(braseleur.skillId, 'HammerSmash')
assert.equal(braseleur.skillName, 'Braseleur Smash')
assert.equal(braseleur.footName, "Braseleur's Foot")
assert.equal(braseleur.monsterName, 'Braseleur')
assert.deepEqual(braseleur.locations, ['Frozen Hearts'])

const abbest = requireFoot(extractedFeet, 'AbbestFoot')
assert.equal(abbest.found, false)
assert.equal(abbest.count, 0)
assert.equal(abbest.skillUnlocked, false)
assert.equal(abbest.skillId, 'AbbestMelee')
assert.equal(abbest.skillName, 'Abbest Wind')
assert.equal(abbest.monsterName, 'Abbest')
assert.deepEqual(abbest.locations, ['Spring Meadows', 'The Monolith'])

const caseInsensitiveFeet = extractMonocoFeet(
  {
    root: {
      properties: {
        InventoryItems_0: {
          Map: [{ key: { Name: 'abbestfoot' }, value: { Int: 2 } }],
        },
        CharactersCollection_0: {
          Map: [
            {
              key: { Name: 'Monoco' },
              value: {
                Struct: {
                  Struct: {
                    UnlockedSkills_197_FAA1BD934F68CFC542FB048E3C0F3592_0: {
                      Array: {
                        Base: {
                          Name: ['abbestmelee'],
                        },
                      },
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
    AbbestFoot: {
      skillId: 'AbbestMelee',
      skillName: 'Abbest Wind',
      footName: "Abbest's Foot",
    },
  },
  new Map([
    [
      'abbestmelee',
      {
        skillName: 'Abbest Wind',
        monsterName: 'Abbest',
        monsterUrl: 'https://clair-obscur.fandom.com/wiki/Abbest',
        fextraUrl: 'https://expedition33.wiki.fextralife.com/Abbest',
        locations: ['Spring Meadows'],
      },
    ],
  ]),
)

assert.deepEqual(caseInsensitiveFeet, [
  {
    id: 'AbbestFoot',
    skillId: 'AbbestMelee',
    skillName: 'Abbest Wind',
    footName: "Abbest's Foot",
    found: true,
    count: 2,
    skillUnlocked: true,
    monsterName: 'Abbest',
    monsterUrl: 'https://clair-obscur.fandom.com/wiki/Abbest',
    fextraUrl: 'https://expedition33.wiki.fextralife.com/Abbest',
    locations: ['Spring Meadows'],
  },
])

console.log('monocoFeetParser.test.ts passed')
