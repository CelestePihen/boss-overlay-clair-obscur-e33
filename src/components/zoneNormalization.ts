export const DEFAULT_ZONE_NAME = 'uncategorized'

export const ZONE_ALIASES: Record<string, string[]> = {
  abbest_cave: ['abbest_cave', 'Abbest Cave'],
  crimson_forest: ['crimson_forest', 'Crimson Forest'],
  crushing_cavern: ['crushing_cavern', 'Crushing Cavern'],
  dark_shores_bloodied_beach: [
    'dark_shores_bloodied_beach',
    'Dark Shores - Bloodied Beach',
  ],
  ancient_sanctuary: ['ancient_sanctuary', 'Ancient Sanctuary'],
  ancient_gestral_city: ['ancient_gestral_city', 'Ancient Gestral City'],
  blades_graveyard: ['blades_graveyard', "Blades' Graveyard"],
  boat_graveyard: ['boat_graveyard', 'Boat Graveyard'],
  camp: ['camp', 'Camp'],
  coastal_cave: ['coastal_cave', 'Coastal Cave'],
  dark_gestral_arena: ['dark_gestral_arena', 'Dark Gestral Arena'],
  endless_night_sanctuary: [
    'endless_night_sanctuary',
    'Endless Night Sanctuary',
  ],
  endless_tower: ['endless_tower', 'Endless Tower'],
  esoteric_ruins_continent: [
    'esoteric_ruins_continent',
    'Esoteric Ruins',
    'Esoteric Ruins/Continent',
  ],
  esquie_nest: ['esquie_nest', "Esquie's Nest"],
  falling_leaves: [
    'falling_leaves',
    'Falling Leaves',
    'Falling Leaves - Resinveil Groove',
  ],
  floating_cemetery: ['floating_cemetery', 'Floating Cemetery'],
  lost_woods: ['lost_woods', 'Lost Woods'],
  flying_casino: ['flying_casino', 'Flying Casino'],
  flying_manor: [
    'flying_manor',
    'Flying Manor',
    'Flying Manor - Central Plaza',
  ],
  flying_waters: ['flying_waters', 'Flying Waters'],
  forgotten_battlefield: [
    'forgotten_battlefield',
    'Forgotten Battlefield',
  ],
  frozen_hearts: [
    'frozen_hearts',
    'Frozen Hearts',
    'Frozen Hearts - Glacial Falls',
  ],
  gestral_beach: ['gestral_beach', 'Gestral Beach'],
  gestral_village: ['gestral_village', 'Gestral Village'],
  hidden_gestral_arena: ['hidden_gestral_arena', 'Hidden Gestral Arena'],
  isle_of_eyes: ['isle_of_eyes', 'Isle of Eyes', 'Isle of the Eyes'],
  lumiere: ['lumiere', 'Lumiere', 'Lumi\u00e8re'],
  lumiere_prologue: ['lumiere_prologue', 'Lumiere - Prologue', 'Lumiere ACT I'],
  monoco_station: ['monoco_station', "Monoco's Station"],
  old_lumiere: ['old_lumiere', 'Old Lumiere', 'Old Lumi\u00e8re'],
  painting_workshop: ['painting_workshop', 'Painting Workshop'],
  red_woods: ['red_woods', 'Red Woods'],
  renoir_drafts: [
    'renoir_drafts',
    "Renoir's Drafts",
    "Renoir's Drafts - Entrance",
  ],
  sacred_river: ['sacred_river', 'Sacred River'],
  sinister_cave: ['sinister_cave', 'Sinister Cave'],
  sirene: ['sirene', 'Sirene', 'Sir\u00e8ne'],
  sirene_dress: ['sirene_dress', "Sirene's Dress", "Sir\u00e8ne's Dress"],
  sky_island: ['sky_island', 'Sky Island', 'Sky Island - Entrance'],
  spring_meadows: ['spring_meadows', 'Spring Meadows', 'The Meadows'],
  stone_quarry: ['stone_quarry', 'Stone Quarry'],
  stone_wave_cliffs: [
    'stone_wave_cliffs',
    'Stone Wave Cliffs',
    'Stone Wave Cliffs - Flooded Buildings',
  ],
  stone_wave_cliffs_cave: [
    'stone_wave_cliffs_cave',
    'Stone Wave Cliffs Cave',
  ],
  sunless_cliffs: ['sunless_cliffs', 'Sunless Cliffs'],
  the_carousel: ['the_carousel', 'The Carousel'],
  the_chosen_path: ['the_chosen_path', 'The Chosen Path'],
  the_manor: ['the_manor', 'The Manor'],
  the_fountain: ['the_fountain', 'The Fountain'],
  the_continent: ['the_continent', 'The Continent'],
  the_crows: ['the_crows', 'The Crows'],
  the_monolith: [
    'the_monolith',
    'The Monolith',
    'Inside the Monolith',
    'Monolith Peak',
  ],
  the_reacher: ['the_reacher', 'The Reacher'],
  the_small_bourgeon: ['the_small_bourgeon', 'The Small Bourgeon', 'Small Bourgeon'],
  twilight_quarry: ['twilight_quarry', 'Twilight Quarry'],
  verso_drafts: ['verso_drafts', "Verso's Draft", "Verso's Drafts"],
  visages: ['visages', 'Visages'],
  white_sands: ['white_sands', 'White Sands'],
  white_tree: ['white_tree', 'White Tree'],
  yellow_harvest: [
    'yellow_harvest',
    'Yellow Harvest',
    "Yellow Harvest - Harvester's Hollow",
  ],
}

export function toZoneLookupKey(value: string): string {
  return value
    .trim()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[\u2019\uFFFD]/g, "'")
    .replace(/[_-]+/g, ' ')
    .replace(/[^a-zA-Z0-9' ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .toLowerCase()
}


