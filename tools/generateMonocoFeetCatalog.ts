import { readFileSync } from 'node:fs'
import { readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'

import { buildMonocoFeetCatalog } from '../electron/monocoFeet.ts'

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
const outputPath = resolve(rootDir, 'data', 'monoco_feet.json')

async function readJson<T>(path: string): Promise<T> {
  return JSON.parse(await readFile(path, 'utf-8')) as T
}

const compositeData = await readJson(compositeDataPath)
const skillGraphData = await readJson(skillGraphPath)
const catalog = buildMonocoFeetCatalog(compositeData, skillGraphData, (assetPath) => {
  return JSON.parse(readFileSync(resolve(rootDir, assetPath), 'utf-8'))
})

await writeFile(outputPath, `${JSON.stringify(catalog, null, 2)}\n`, 'utf-8')
console.log(`Generated ${Object.keys(catalog.MonocoFeet).length} Monoco feet in ${outputPath}`)
