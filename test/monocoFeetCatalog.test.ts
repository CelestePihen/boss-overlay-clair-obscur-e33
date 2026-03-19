import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'

import {
  buildMonocoFeetCatalog,
  getMonocoSkillAssetFileName,
  type MonocoFeetCatalogFile,
  resolveMonocoSkillAssetPath,
} from '../electron/monocoFeet.ts'

async function readJson<T>(path: string): Promise<T> {
  return JSON.parse(await readFile(path, 'utf-8')) as T
}

const rootDir = process.cwd()
const compositeDataPath = resolve(
  rootDir,
  'originalGameMapping',
  'DT_jRPG_Items_Composite.json',
)
const skillGraphPath = resolve(
  rootDir,
  'originalGameMapping',
  'DA_SkillGraph_Monoco.json',
)
const committedCatalogPath = resolve(rootDir, 'data', 'monoco_feet.json')

const generatedCatalog = buildMonocoFeetCatalog(
  await readJson(compositeDataPath),
  await readJson(skillGraphPath),
  (assetPath) => JSON.parse(readFileSync(resolve(rootDir, assetPath), 'utf-8')),
)
const committedCatalog = await readJson<MonocoFeetCatalogFile>(committedCatalogPath)

assert.deepEqual(
  committedCatalog,
  generatedCatalog,
  'Checked-in Monoco feet catalog should match the generator output',
)

assert.equal(
  Object.keys(committedCatalog.MonocoFeet).length,
  44,
  'Expected only collectible Monoco feet in the catalog',
)

assert.deepEqual(committedCatalog.MonocoFeet.AbbestFoot, {
  skillId: 'AbbestMelee',
  skillName: 'Abbest Wind',
  footName: "Abbest's Foot",
})
assert.deepEqual(committedCatalog.MonocoFeet.GoldChevaliereFoot, {
  skillId: 'ChevaliereCAOECombo',
  skillName: 'Chevalière Ice',
  footName: "Gold Chevalière's Foot",
})
assert.equal(committedCatalog.MonocoFeet.ChalierFoot, undefined)
assert.equal(committedCatalog.MonocoFeet.StalactFoot, undefined)

assert.equal(
  resolveMonocoSkillAssetPath(
    '/Game/Gameplay/SkillTree/Content/Monoco/Skills/DA_Skill_Transfo_AbbestMelee.0',
  ),
  'originalGameMapping/MonocoSkills/DA_Skill_Transfo_AbbestMelee.json',
)
assert.equal(
  getMonocoSkillAssetFileName(
    '/Game/Gameplay/SkillTree/Content/Monoco/Skills/DA_Skill_Transfo_AbbestMelee.0',
  ),
  'DA_Skill_Transfo_AbbestMelee.json',
)

console.log('monocoFeetCatalog.test.ts passed')
