import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'

const requiredHeaders = [
  'Picto Name',
  'Effect',
  'Health',
  'Defense',
  'Speed',
  'Critical Rate',
  'Map and Nearest Flag',
  'How to Get',
]

function parseTsvLine(line) {
  return line.split('\t').map((value) => value.trim())
}

function formatList(title, values) {
  if (values.length === 0) {
    return `${title}: none`
  }

  return `${title}:\n- ${values.join('\n- ')}`
}

const rootDir = process.cwd()
const pictosPath = resolve(rootDir, 'data', 'pictos.json')
const acquirePath = resolve(rootDir, 'data', 'pictos_acquire.tsv')

const catalog = JSON.parse(await readFile(pictosPath, 'utf-8'))
const tsvContent = await readFile(acquirePath, 'utf-8')
const tsvLines = tsvContent
  .split(/\r?\n/)
  .map((line) => line.trimEnd())
  .filter((line) => line.length > 0)

if (tsvLines.length === 0) {
  console.error('pictos_acquire.tsv is empty.')
  process.exit(1)
}

const [headerLine, ...dataLines] = tsvLines
const headers = parseTsvLine(headerLine)
const missingHeaders = requiredHeaders.filter((header) => !headers.includes(header))
const unexpectedHeaders = headers.filter((header) => !requiredHeaders.includes(header))

const nameColumnIndex = headers.indexOf('Picto Name')
if (nameColumnIndex === -1) {
  console.error('pictos_acquire.tsv is missing the "Picto Name" column.')
  process.exit(1)
}

const rowNames = dataLines.map((line) => parseTsvLine(line)[nameColumnIndex] ?? '')
const blankNames = rowNames
  .map((name, index) => ({ name, rowNumber: index + 2 }))
  .filter((entry) => entry.name.length === 0)
  .map((entry) => `row ${entry.rowNumber}`)

const duplicateNames = [...new Set(
  rowNames.filter((name, index) => name.length > 0 && rowNames.indexOf(name) !== index),
)].sort((left, right) => left.localeCompare(right))

const catalogNames = Object.values(catalog.Pictos).map((name) => name.trim())
const acquireNames = [...new Set(rowNames.filter((name) => name.length > 0))]

const missingFromAcquire = catalogNames
  .filter((name) => !acquireNames.includes(name))
  .sort((left, right) => left.localeCompare(right))
const extraInAcquire = acquireNames
  .filter((name) => !catalogNames.includes(name))
  .sort((left, right) => left.localeCompare(right))

const hasErrors =
  missingHeaders.length > 0 ||
  unexpectedHeaders.length > 0 ||
  blankNames.length > 0 ||
  duplicateNames.length > 0 ||
  missingFromAcquire.length > 0 ||
  extraInAcquire.length > 0

if (!hasErrors) {
  console.log(
    `pictos_acquire.tsv is valid: ${acquireNames.length} rows match ${catalogNames.length} obtainable pictos.`,
  )
  process.exit(0)
}

console.error('pictos_acquire.tsv validation failed.')
console.error(formatList('Missing headers', missingHeaders))
console.error(formatList('Unexpected headers', unexpectedHeaders))
console.error(formatList('Blank picto names', blankNames))
console.error(formatList('Duplicate picto names', duplicateNames))
console.error(formatList('Pictos missing from TSV', missingFromAcquire))
console.error(formatList('Names present in TSV but missing from catalog', extraInAcquire))
process.exit(1)
