import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'

import { buildWeaponCatalog, type WeaponCatalogFile } from '../electron/weapons.ts'
import type { WeaponLocationRow } from '../src/utils/weaponLocations.ts'

async function readJson<T>(path: string): Promise<T> {
  return JSON.parse(await readFile(path, 'utf-8')) as T
}

const root = process.cwd()
const compositePath = resolve(root, 'originalGameMapping', 'DT_jRPG_Items_Composite.json')
const locationsPath = resolve(root, 'data', 'weapons_locations.json')
const catalogPath = resolve(root, 'data', 'weapons.json')

const composite = await readJson<unknown[]>(compositePath)
const locations = await readJson<WeaponLocationRow[]>(locationsPath)
const checkedInCatalog = await readJson<WeaponCatalogFile>(catalogPath)
const generatedCatalog = buildWeaponCatalog(composite, locations)

assert.deepEqual(generatedCatalog, checkedInCatalog)
assert.equal(Object.keys(checkedInCatalog.Weapons).length, 116)
assert.equal(checkedInCatalog.Weapons.Deminerim.owner, 'Lune')
assert.equal(checkedInCatalog.Weapons.Deminerim.zoneName, 'flying_waters')
assert.equal(checkedInCatalog.Weapons.Seashelum.name, 'Seashelum')
assert.equal(checkedInCatalog.Weapons.Seashelum.zoneName, 'flying_manor')
assert.equal(checkedInCatalog.Weapons.Reacheso_2.name, 'Liteso')
assert.equal(checkedInCatalog.Weapons.Reacheso_2.owner, 'Verso')
assert.equal(checkedInCatalog.Weapons.VD_Lune_1.name, 'Bonbim')

console.log('weaponCatalog.test.ts passed')

