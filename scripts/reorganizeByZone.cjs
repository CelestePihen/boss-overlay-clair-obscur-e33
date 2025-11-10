const fs = require('fs');
const path = require('path');

const inputPath = path.join(__dirname, '../data/bossDatabase.json');
const outputPath = path.join(__dirname, '../data/bossDatabase-by-zone.json');

// Lire le fichier actuel
const bosses = JSON.parse(fs.readFileSync(inputPath, 'utf-8'));

// Créer un objet organisé par zone
const bossByZone = {};

// Grouper par zone
bosses.forEach(boss => {
  const zone = boss.zone || 'Sans zone';
  
  if (!bossByZone[zone]) {
    bossByZone[zone] = [];
  }
  
  // Retirer la propriété zone puisqu'elle sera dans la clé
  const { zone: _, ...bossData } = boss;
  bossByZone[zone].push(bossData);
});

// Afficher les statistiques
console.log('\n📊 Statistiques:');
console.log(`Total de boss: ${bosses.length}`);
console.log(`Nombre de zones: ${Object.keys(bossByZone).length}\n`);

console.log('🗺️  Zones trouvées:');
Object.keys(bossByZone).sort().forEach(zone => {
  console.log(`  - ${zone}: ${bossByZone[zone].length} boss`);
});

// Sauvegarder le nouveau fichier
fs.writeFileSync(outputPath, JSON.stringify(bossByZone, null, 2), 'utf-8');

console.log(`\n✅ Fichier créé: ${outputPath}`);
console.log('\n💡 Instructions:');
console.log('1. Vérifiez le fichier bossDatabase-by-zone.json');
console.log('2. Organisez manuellement les boss dans l\'ordre de rencontre dans chaque zone');
console.log('3. Quand vous êtes prêt, renommez-le en bossDatabase.json');
