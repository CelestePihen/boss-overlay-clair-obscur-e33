import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { buildPictoCatalogFromCompositeData } from '../electron/pictos.ts'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const compositeDataPath = resolve(
  __dirname,
  '../originalGameMapping/DT_jRPG_Items_Composite.json',
)
const outputPath = resolve(__dirname, '../data/pictos.json')

const compositeData = JSON.parse(await readFile(compositeDataPath, 'utf-8'))
const catalog = buildPictoCatalogFromCompositeData(compositeData)

await mkdir(dirname(outputPath), { recursive: true })
await writeFile(outputPath, `${JSON.stringify(catalog, null, 2)}\n`, 'utf-8')

console.log(`Generated ${Object.keys(catalog.Pictos).length} pictos at ${outputPath}`)
