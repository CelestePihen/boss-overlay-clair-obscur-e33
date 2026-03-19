import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'

import { normalizeZoneName } from '../src/components/checklistModel.ts'

interface FriendlyNevronCatalogItem {
  questId: string
  objectiveId: string
  name: string
  zoneName: string
  sourceZoneName: string
  summary: string
}

interface FriendlyNevronCatalogFile {
  FriendlyNevrons: Record<string, FriendlyNevronCatalogItem>
}

async function readJson<T>(path: string): Promise<T> {
  return JSON.parse(await readFile(path, 'utf-8')) as T
}

const catalogPath = resolve(process.cwd(), 'data', 'friendly_nevrons.json')
const catalog = await readJson<FriendlyNevronCatalogFile>(catalogPath)
const entries = Object.entries(catalog.FriendlyNevrons)

assert.equal(entries.length, 10)

const expectedObjectives: Record<string, string> = {
  Nevron_JarNeedLight: 'KilledJar',
  Nevron_DemineurMissingMine: 'KillDemineur',
  Nevron_SmallBourgeon: 'KillCompletedBourgeon',
  Nevron_PortierDoorMaze: 'KillCompletedPortier',
  Nevron_WeaponlessChalier: 'KillChalier',
  Nevron_Benisseur: 'KillCompletedBenisseur',
  Nevron_Hexga: 'KillCompletedHexga',
  Nevron_Troubadour: 'KillCompletedTroubadour',
  Nevron_DanseuseDanceClass: 'KillDanseuseDanceTeacher',
  Nevron_JudgeOfMercy: 'KillJudgeOfMercy',
}

for (const [questId, entry] of entries) {
  assert.ok(questId.startsWith('Nevron_'))
  assert.equal(entry.questId, questId)
  assert.equal(entry.objectiveId, expectedObjectives[questId])
  assert.equal(entry.name.length > 0, true)
  assert.equal(entry.summary.length > 0, true)

  const normalizedSourceZone = normalizeZoneName(entry.sourceZoneName, 'journal')
  assert.equal(
    normalizedSourceZone.zoneName,
    entry.zoneName,
    `Expected ${entry.sourceZoneName} to normalize to ${entry.zoneName}`,
  )
  assert.equal(
    normalizedSourceZone.matched,
    true,
    `Expected ${entry.sourceZoneName} to match a canonical zone`,
  )
}

console.log('friendlyNevronsCatalog.test.ts passed')
