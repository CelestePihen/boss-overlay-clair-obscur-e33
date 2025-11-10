const fs = require('fs');
const path = require('path');

// Lire le JSON de la sauvegarde 100%
const saveData = JSON.parse(fs.readFileSync(path.join(__dirname, '../data/save100.json'), 'utf-8'));

// Extraire tous les ennemis
const battledEnemies = saveData?.root?.properties?.BattledEnemies_0?.Map || [];
const encounteredEnemies = saveData?.root?.properties?.EncounteredEnemies_0?.Map || [];
const transientEnemies = saveData?.root?.properties?.TransientBattledEnemies_0?.Map || [];

// Combiner et dédupliquer
const allEnemies = [...battledEnemies, ...encounteredEnemies, ...transientEnemies];
const uniqueEnemies = new Map();

allEnemies.forEach(enemy => {
  const name = enemy.key.Name;
  if (!uniqueEnemies.has(name)) {
    uniqueEnemies.set(name, name);
  }
});

// Créer la base de données
const database = Array.from(uniqueEnemies.values()).map(name => ({
  originalName: name,
  displayName: prettifyEnemyName(name),
  category: categorizeBoss(name)
}));

// Sauvegarder
fs.writeFileSync(
  path.join(__dirname, '../data/bossDatabase.json'),
  JSON.stringify(database, null, 2)
);

// Fonctions helper
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
  if (name.includes('Chromatic')) return 'Chromatic';
  if (name.includes('Boss')) return 'Boss';
  return 'Other';
}
