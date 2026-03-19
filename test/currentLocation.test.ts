import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'

import {
  buildLocationCatalogFromLevelData,
  extractCurrentLocation,
  type LocationCatalogFile,
  type LocationSaveData,
} from '../electron/locations.ts'

async function readJson<T>(path: string): Promise<T> {
  return JSON.parse(await readFile(path, 'utf-8')) as T
}

const rootDir = process.cwd()
const levelDataPath = resolve(rootDir, 'originalGameMapping', 'DT_LevelData.json')
const locationFixturesDir = resolve(rootDir, 'test_save', 'location')

const locationCatalog = buildLocationCatalogFromLevelData(
  await readJson(levelDataPath),
)

const catalogEntry = (locationCatalog as LocationCatalogFile).levels.Level_Goblu_Main_V5
assert.ok(catalogEntry, 'Expected Flying Waters level to exist in location catalog')
assert.equal(catalogEntry.areaName, 'Flying Waters')
assert.equal(catalogEntry.levelKey, 'Level_Goblu_Main_V5')

const samples = [
  ['continent.json', 'Level_WorldMap_Main_V2'],
  ['sirene.json', 'Level_Sirene_Main_V2'],
  ['flying_waters.json', 'Level_Goblu_Main_V5'],
  ['frozen_hearts.json', 'Level_Side_FrozenHeart'],
] as const

for (const [fileName, levelKey] of samples) {
  const saveData = await readJson<LocationSaveData>(
    resolve(locationFixturesDir, fileName),
  )
  const location = extractCurrentLocation(saveData, locationCatalog)
  const expectedAreaName = locationCatalog.levels[levelKey]?.areaName

  assert.ok(location, `Expected ${fileName} to resolve a current location`)
  assert.equal(location.levelKey, levelKey)
  assert.equal(location.areaName, expectedAreaName)
  assert.equal(location.displayName, expectedAreaName)
  assert.equal(location.spawnTag, 'Level.SpawnPoint.Generic.Dynamic')
  assert.equal(location.returnSpawnTag, 'Level.SpawnPoint.WorldMap.Dynamic')
}

const unknownLocation = extractCurrentLocation(
  {
    root: {
      properties: {
        MapToLoad_0: { Name: 'Level_Unknown_Debug' },
        SpawnPointTagToLoadAt_0: {
          Struct: {
            Struct: {
              TagName_0: {
                Name: 'Level.SpawnPoint.Unknown.Debug',
              },
            },
          },
        },
      },
    },
  },
  locationCatalog,
)

assert.deepEqual(unknownLocation, {
  levelKey: 'Level_Unknown_Debug',
  spawnTag: 'Level.SpawnPoint.Unknown.Debug',
  returnSpawnTag: undefined,
  areaName: null,
  subLocationName: null,
  displayName: 'Level.SpawnPoint.Unknown.Debug',
})

console.log('currentLocation.test.ts passed')
