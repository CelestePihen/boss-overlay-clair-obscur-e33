import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'

import {
  extractWeapons,
  type WeaponCatalogFile,
  type WeaponSaveData,
} from '../electron/weapons.ts'

async function readJson<T>(path: string): Promise<T> {
  return JSON.parse(await readFile(path, 'utf-8')) as T
}

function requireEntry(entries: ReturnType<typeof extractWeapons>, id: string) {
  const entry = entries.find((item) => item.id === id)
  assert.ok(entry, `Expected weapon ${id} to exist`)
  return entry
}

const root = process.cwd()
const catalogPath = resolve(root, 'data', 'weapons.json')
const savePath = resolve(root, 'test_save', 'expedition_0.json')

const catalog = await readJson<WeaponCatalogFile>(catalogPath)
const saveData = await readJson<WeaponSaveData>(savePath)
const extracted = extractWeapons(saveData, catalog.Weapons)

assert.equal(extracted.length, 116)

const deminerim = requireEntry(extracted, 'Deminerim')
assert.equal(deminerim.found, true)
assert.equal(deminerim.equipped, true)
assert.equal(deminerim.level, 18)
assert.equal(deminerim.zoneName, 'flying_waters')

const noahram = requireEntry(extracted, 'Noahram')
assert.equal(noahram.found, true)
assert.equal(noahram.equipped, false)
assert.equal(noahram.level, 3)

const bonbim = requireEntry(extracted, 'VD_Lune_1')
assert.equal(bonbim.name, 'Bonbim')
assert.equal(bonbim.found, false)
assert.equal(bonbim.equipped, false)
assert.equal(bonbim.level, 0)

const syntheticCatalog: WeaponCatalogFile = {
  Weapons: {
    SyntheticWeapon: {
      id: 'SyntheticWeapon',
      name: 'Synthetic Weapon',
      owner: 'Lune',
      zoneName: 'spring_meadows',
      sourceZoneName: 'Spring Meadows',
      locationUrl: '',
      summary: 'Synthetic test weapon.',
    },
  },
}

const equippedOnlySave: WeaponSaveData = {
  root: {
    properties: {
      CharactersCollection_0: {
        Map: [
          {
            value: {
              Struct: {
                Struct: {
                  EquippedItemsPerSlot_183_3B9D37B549426C770DB5E5BE821896E9_0: {
                    Map: [
                      {
                        value: {
                          Name: 'SyntheticWeapon',
                        },
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

const equippedOnly = extractWeapons(equippedOnlySave, syntheticCatalog.Weapons).at(0)
assert.equal(equippedOnly?.found, true)
assert.equal(equippedOnly?.equipped, true)
assert.equal(equippedOnly?.level, 1)

console.log('weaponParser.test.ts passed')
