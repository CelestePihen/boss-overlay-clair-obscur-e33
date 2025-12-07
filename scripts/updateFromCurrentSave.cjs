const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Configuration
const SAVE_PATH = process.argv[2]; // Chemin de votre sauvegarde passé en argument
const UESAVE_PATH = path.join(__dirname, '../tools/uesave.exe');
const DB_PATH = path.join(__dirname, '../data/bossDatabase.json');
const TEMP_JSON = path.join(__dirname, '../data/temp_current_save.json');

if (!SAVE_PATH) {
  console.error('❌ Usage: node updateFromCurrentSave.cjs <chemin_vers_votre_save.sav>');
  console.error('   Exemple: node updateFromCurrentSave.cjs "C:/Users/.../EXPEDITION_0.sav"');
  process.exit(1);
}

console.log('🔄 Mise à jour de la base de données depuis votre sauvegarde...\n');

// Étape 1: Convertir la sauvegarde en JSON
console.log('📂 Conversion de la sauvegarde en JSON...');
try {
  execSync(`"${UESAVE_PATH}" to-json --input "${SAVE_PATH}" --output "${TEMP_JSON}"`, { 
    stdio: 'inherit' 
  });
  console.log('✅ Conversion réussie\n');
} catch (error) {
  console.error('❌ Erreur lors de la conversion:', error.message);
  process.exit(1);
}

// Étape 2: Lire les données
const saveData = JSON.parse(fs.readFileSync(TEMP_JSON, 'utf-8'));
const existingDB = JSON.parse(fs.readFileSync(DB_PATH, 'utf-8'));

// Étape 3: Extraire tous les ennemis de la sauvegarde
const battledEnemies = saveData?.root?.properties?.BattledEnemies_0?.Map || [];
const encounteredEnemies = saveData?.root?.properties?.EncounteredEnemies_0?.Map || [];
const transientEnemies = saveData?.root?.properties?.TransientBattledEnemies_0?.Map || [];

const allSaveEnemies = new Set();
[...battledEnemies, ...encounteredEnemies, ...transientEnemies].forEach(enemy => {
  allSaveEnemies.add(enemy.key.Name);
});

console.log(`📊 ${allSaveEnemies.size} ennemis trouvés dans votre sauvegarde\n`);

// Étape 4: Créer un index des boss existants (normalisés et exacts)
const existingBosses = new Map(); // originalName -> { zone, displayName, category }
const normalizedIndex = new Map(); // nom normalisé -> { zone, displayName, category, originalName }

for (const [zoneName, bosses] of Object.entries(existingDB)) {
  for (const boss of bosses) {
    // Index exact
    existingBosses.set(boss.originalName, {
      zone: zoneName,
      displayName: boss.displayName,
      category: boss.category
    });
    
    // Index normalisé (sans hash)
    const normalized = normalizeEnemyName(boss.originalName);
    if (!normalizedIndex.has(normalized)) {
      normalizedIndex.set(normalized, {
        zone: zoneName,
        displayName: boss.displayName,
        category: boss.category,
        originalName: boss.originalName
      });
    }
  }
}

// Étape 5: Traiter chaque ennemi de la sauvegarde
let added = 0;
let matched = 0;
let skipped = 0;

for (const enemyName of allSaveEnemies) {
  // Vérifier si existe déjà (match exact)
  if (existingBosses.has(enemyName)) {
    matched++;
    continue;
  }
  
  // Vérifier si existe avec un hash différent (match normalisé)
  const normalized = normalizeEnemyName(enemyName);
  const normalizedMatch = normalizedIndex.get(normalized);
  
  if (normalizedMatch) {
    // Mettre à jour le hash dans la zone existante
    const zone = normalizedMatch.zone;
    const oldName = normalizedMatch.originalName;
    
    // Trouver et remplacer
    const bossIndex = existingDB[zone].findIndex(b => b.originalName === oldName);
    if (bossIndex >= 0) {
      existingDB[zone][bossIndex].originalName = enemyName;
      console.log(`🔄 Mise à jour du hash: ${normalizedMatch.displayName}`);
      console.log(`   Ancien: ...${oldName.slice(-40)}`);
      console.log(`   Nouveau: ...${enemyName.slice(-40)}\n`);
      matched++;
    }
    continue;
  }
  
  // Boss vraiment nouveau -> ajouter dans "Sans zone"
  if (!existingDB['Sans zone']) {
    existingDB['Sans zone'] = [];
  }
  
  const prettyName = prettifyEnemyName(enemyName);
  const category = categorizeBoss(enemyName);
  
  existingDB['Sans zone'].push({
    originalName: enemyName,
    displayName: prettyName,
    category: category
  });
  
  console.log(`➕ Nouveau boss ajouté: ${prettyName}`);
  added++;
}

// Étape 6: Sauvegarder
fs.writeFileSync(DB_PATH, JSON.stringify(existingDB, null, 2), 'utf-8');

// Nettoyer
fs.unlinkSync(TEMP_JSON);

// Résumé
console.log('\n' + '='.repeat(50));
console.log('✅ Mise à jour terminée !');
console.log('='.repeat(50));
console.log(`📊 Boss correspondants: ${matched}`);
console.log(`➕ Nouveaux boss ajoutés: ${added}`);
console.log(`📁 Base de données sauvegardée: ${DB_PATH}`);
console.log('='.repeat(50));

// Fonctions helper
function normalizeEnemyName(name) {
  const parts = name.split('_');
  const lastPart = parts[parts.length - 1];
  
  if (lastPart && (lastPart.length === 32 || lastPart.length === 33)) {
    return parts.slice(0, -1).join('_');
  }
  
  return name;
}

function prettifyEnemyName(name) {
  if (name.startsWith('Merchant') && name.split('_').length === 2) {
    return name.replace('_', ' ');
  }
  
  if (name.includes('Petank')) {
    if (name.includes('_BP_EnemyWorld_')) {
      name = name.replace('_BP_EnemyWorld_', ' ');
    }
    name = name.replace('Petank_', 'Petank ');
  }
  
  const lastPart = name.split('_').slice(-1)[0];
  if (lastPart && (lastPart.length === 32 || lastPart.length === 33)) {
    name = name.split('_').slice(0, -1).join('_');
  }
  
  if (name.endsWith('_C')) {
    name = name.slice(0, -2);
  }
  
  name = name.replace('_BP_EnemyWorld_', ' ');
  name = name.replace('_BP_Enemy_World_', ' ');
  
  if (name.startsWith('BP_EnemyWorld_')) {
    name = name.replace(/^BP_EnemyWorld_/, '');
  }
  
  if (name.startsWith('ObjectID_Enemy_Level_') || name.startsWith('ObjectID_Enemy_SmallLevel_')) {
    name = name.replace(/^ObjectID_Enemy_Level_/, '');
    name = name.replace(/^ObjectID_Enemy_SmallLevel_/, '');
    
    if (name.includes('_BP_jRPG_EnemyWorld_')) {
      name = name.replace('_BP_jRPG_EnemyWorld_', ' ');
    }
    
    if (name.endsWith('_BP_EnemyGroup')) {
      name = name.replace('_BP_EnemyGroup', ' EnemyGroup');
    }
  } else if (name.startsWith('ObjectID_Enemy_')) {
    name = name.replace(/^ObjectID_Enemy_/, '');
  } else if (name.startsWith('LD_')) {
    name = name.replace(/^LD_/, '');
  }
  
  return name.length > 5 ? name : name;
}

function categorizeBoss(name) {
  if (name.includes('Mime')) return 'Mime';
  if (name.includes('Petank')) return 'Petank';
  if (name.includes('Merchant')) return 'Merchant';
  if (name.includes('ALPHA') || name.toLowerCase().includes('chromatic')) return 'Chromatic';
  if (name.includes('Boss')) return 'Boss';
  return 'Other';
}
