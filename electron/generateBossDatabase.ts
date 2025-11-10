// Script pour extraire tous les boss d'une sauvegarde 100%
// Exécuter ce script une seule fois pour générer bossDatabase.json

import { parseSaveFile } from './saveParser.js'
import { writeFile } from 'fs/promises'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

async function generateBossDatabase() {
  // REMPLACER CE CHEMIN par votre sauvegarde 100%
  const save100Path = 'C:\\Users\\celcr\\AppData\\Local\\Sandfall\\Saved\\SaveGames\\76561198280522606\\EXPEDITION_0.sav'
  
  console.log('Parsing 100% save...')
  const allBosses = await parseSaveFile(save100Path)
  
  console.log(`Found ${allBosses.length} bosses in 100% save`)
  
  // Créer la base de données
  const database = allBosses.map(boss => ({
    name: boss.name,
    category: categorizeBoss(boss.name)
  }))
  
  // Sauvegarder
  const outputPath = join(__dirname, '../data/bossDatabase.json')
  await writeFile(outputPath, JSON.stringify(database, null, 2))
  
  console.log(`Boss database saved to ${outputPath}`)
  console.log(`Total bosses: ${database.length}`)
}

function categorizeBoss(name: string): string {
  if (name.includes('Mime')) return 'Mime'
  if (name.includes('Petank')) return 'Petank'
  if (name.includes('Merchant')) return 'Merchant'
  if (name.includes('Alpha')) return 'Alpha'
  if (name.includes('Boss')) return 'Boss'
  return 'Other'
}

// Exécuter
generateBossDatabase().catch(console.error)
