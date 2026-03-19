import assert from 'node:assert/strict'

import {
  buildChecklistModel,
  filterChecklistGroups,
  normalizeZoneName,
  reportUnmatchedZoneNames,
  summarizeChecklist,
} from '../src/components/checklistModel.ts'
import type { Boss } from '../src/types/Boss.ts'
import type { CurrentLocation } from '../src/types/CurrentLocation.ts'
import type { FriendlyNevronEntry } from '../src/types/FriendlyNevronEntry.ts'
import type { JournalEntry } from '../src/types/JournalEntry.ts'
import type { LostGestralEntry } from '../src/types/LostGestralEntry.ts'
import type { MonocoFoot } from '../src/types/MonocoFoot.ts'
import type { Picto } from '../src/types/Picto.ts'
import type { WeaponEntry } from '../src/types/WeaponEntry.ts'

const bosses: Boss[] = [
  {
    name: 'eveque',
    killed: true,
    encountered: true,
    zone: 'spring_meadows',
  },
  {
    name: 'scavenger',
    killed: false,
    encountered: true,
    zone: 'mystery_woods',
  },
  {
    name: 'goblu',
    killed: false,
    encountered: false,
    zone: 'the_continent',
  },
]

const pictos: Picto[] = [
  {
    id: 'Dodger',
    friendlyName: 'Dodger',
    found: true,
    mastered: true,
    level: 3,
    effect: 'Gain 1 AP after Perfect Dodge. Once per turn.',
    health: '',
    defense: '',
    speed: '12',
    criticalRate: '3%',
    mapName: 'Spring Meadows',
    nearestFlag: 'Meadows Corridor',
    mapAndNearestFlag: 'Spring Meadows (Meadows Corridor)',
    howToGet: 'Defeat the Portier after Lune joins the party.',
  },
  {
    id: 'AcceleratorHeal',
    friendlyName: 'Accelerating Heal',
    found: false,
    mastered: false,
    level: 1,
    effect: 'Gain Rush after healing.',
    health: '',
    defense: '',
    speed: '',
    criticalRate: '',
    mapName: 'Verso’s Drafts',
    nearestFlag: 'Open Playground',
    mapAndNearestFlag: 'Verso’s Drafts (Open Playground)',
    howToGet: 'Follow the right tunnel from the open playground.',
  },
  {
    id: 'CriticalBreak',
    friendlyName: 'Critical Break',
    found: false,
    mastered: false,
    level: 1,
    effect: '',
    health: '',
    defense: '',
    speed: '',
    criticalRate: '',
    mapName: 'Floating Cemetery',
    nearestFlag: '',
    mapAndNearestFlag: 'Floating Cemetery ()',
    howToGet: '',
  },
]

const monocoFeet: MonocoFoot[] = [
  {
    id: 'AbbestFoot',
    skillId: 'AbbestMelee',
    skillName: 'Abbest Wind',
    footName: "Abbest's Foot",
    found: false,
    count: 0,
    skillUnlocked: false,
    monsterName: 'Abbest',
    monsterUrl: 'https://clair-obscur.fandom.com/wiki/Abbest',
    fextraUrl: 'https://expedition33.wiki.fextralife.com/Abbest',
    locations: ['Spring Meadows', 'The Monolith'],
  },
  {
    id: 'RamasseurFoot',
    skillId: 'RamasseurBonk',
    skillName: 'Ramasseur Bonk',
    footName: "Ramasseur's Foot",
    found: true,
    count: 1,
    skillUnlocked: true,
    monsterName: 'Ramasseur',
    monsterUrl: 'https://clair-obscur.fandom.com/wiki/Ramasseur',
    fextraUrl: 'https://expedition33.wiki.fextralife.com/Ramasseur',
    locations: ['Floating Cemetery'],
  },
  {
    id: 'CultistFoot',
    skillId: 'FlyingCultistSlash',
    skillName: 'Cultist Blood',
    footName: "Cultist's Foot",
    found: false,
    count: 0,
    skillUnlocked: false,
    monsterName: 'Cultist',
    monsterUrl: 'https://clair-obscur.fandom.com/wiki/Cultist',
    fextraUrl: 'https://expedition33.wiki.fextralife.com/Cultist',
    locations: ['Floating Cemetery'],
  },
]

const journals: JournalEntry[] = [
  {
    id: 'Journal_Exp81',
    name: 'Journal - Expedition 81',
    found: true,
    count: 1,
    zoneName: 'spring_meadows',
    sourceZoneName: 'Spring Meadows',
    summary: 'Main story cutscene in Spring Meadows; unmissable.',
  },
  {
    id: 'Journal_Debug_Floating',
    name: 'Journal - Forgotten Notes',
    found: false,
    count: 0,
    zoneName: 'floating_cemetery',
    sourceZoneName: 'Floating Cemetery',
    summary: 'Search the western memorial alcove.',
  },
  {
    id: 'Journal_Exp53',
    name: 'Journal - Expedition 53',
    found: false,
    count: 0,
    zoneName: 'the_small_bourgeon',
    sourceZoneName: 'The Small Bourgeon',
    summary: 'Deep in the Bourgeon cave after the conversation.',
  },
]

const lostGestrals: LostGestralEntry[] = [
  {
    id: 'FindLostGestral_1',
    name: 'Lost Gestral 1',
    found: true,
    zoneName: 'the_continent',
    sourceZoneName: 'Continent Map',
    summary: "Right outside the Esquie's Nest portal.",
  },
  {
    id: 'FindLostGestral_2',
    name: 'Lost Gestral 2',
    found: false,
    zoneName: 'the_continent',
    sourceZoneName: 'Continent Map',
    summary: 'Just east of the ramp leading to the Stone Wave Cliffs portal.',
  },
]


const friendlyNevrons: FriendlyNevronEntry[] = [
  {
    id: 'Nevron_JarNeedLight',
    objectiveId: 'KilledJar',
    name: "Jar's Light",
    resolution: 'peace',
    isKilled: false,
    isPeaceful: true,
    isResolved: true,
    zoneName: 'spring_meadows',
    sourceZoneName: 'Spring Meadows',
    summary: 'Bring Jar some light.',
  },
  {
    id: 'Nevron_Hexga',
    objectiveId: 'KillCompletedHexga',
    name: 'Hexga Crystals',
    resolution: 'killed',
    isKilled: true,
    isPeaceful: false,
    isResolved: true,
    zoneName: 'spring_meadows',
    sourceZoneName: 'Spring Meadows',
    summary: 'You killed Hexga instead of helping.',
  },
  {
    id: 'Nevron_WeaponlessChalier',
    objectiveId: 'KillChalier',
    name: 'Chalier Help',
    resolution: 'unresolved',
    isKilled: false,
    isPeaceful: false,
    isResolved: false,
    zoneName: 'floating_cemetery',
    sourceZoneName: 'Floating Cemetery',
    summary: 'Chalier still needs help choosing a weapon.',
  },
]

const weapons: WeaponEntry[] = [
  {
    id: 'Weapon_SpringFound',
    name: 'Practice Blade',
    owner: 'Gustave',
    found: true,
    level: 2,
    equipped: false,
    zoneName: 'spring_meadows',
    sourceZoneName: 'Spring Meadows',
    locationUrl: '',
    summary: 'Near the first expedition flag.',
  },
  {
    id: 'Weapon_FloatingMissing',
    name: 'Wave Blade',
    owner: 'Verso',
    found: false,
    level: 0,
    equipped: false,
    zoneName: 'floating_cemetery',
    sourceZoneName: 'Floating Cemetery',
    locationUrl: '',
    summary: 'At the collapsed memorial arch.',
  },
  {
    id: 'Weapon_Unmatched',
    name: 'Unknown Relic',
    owner: 'Lune',
    found: false,
    level: 0,
    equipped: false,
    zoneName: 'mystery_woods',
    sourceZoneName: 'Mystery Woods',
    locationUrl: '',
    summary: 'Hidden in the brush.',
  },
]

const musicRecords: MusicRecordEntry[] = [
  {
    id: 'MusicRecord_1',
    name: 'Alicia',
    found: true,
    zoneName: 'the_manor',
    sourceZoneName: 'The Manor',
    locationUrl: '',
    summary: 'Enter The Manor from Falling Leaves.',
  },
  {
    id: 'MusicRecord_2',
    name: 'Lumière',
    found: false,
    zoneName: 'floating_cemetery',
    sourceZoneName: 'Floating Cemetery',
    locationUrl: '',
    summary: 'Near the record player challenge door.',
  },
]

const currentLocation: CurrentLocation = {
  levelKey: 'Level_Sirene_Main_V2',
  spawnTag: 'Level.SpawnPoint.Generic.Dynamic',
  returnSpawnTag: 'Level.SpawnPoint.WorldMap.Dynamic',
  areaName: 'Floating Cemetery',
  subLocationName: null,
  displayName: 'Floating Cemetery',
}

assert.deepEqual(normalizeZoneName('Spring Meadows', 'picto'), {
  zoneName: 'spring_meadows',
  matched: true,
})

assert.deepEqual(normalizeZoneName('Verso’s Drafts', 'picto'), {
  zoneName: 'verso_drafts',
  matched: true,
})

assert.deepEqual(normalizeZoneName('Floating Cemetery', 'picto'), {
  zoneName: 'floating_cemetery',
  matched: true,
})

assert.deepEqual(normalizeZoneName('The Small Bourgeon', 'journal'), {
  zoneName: 'the_small_bourgeon',
  matched: true,
})

assert.deepEqual(normalizeZoneName("Monoco's Station", 'foot'), {
  zoneName: 'monoco_station',
  matched: true,
})

assert.deepEqual(normalizeZoneName('Sirène', 'location'), {
  zoneName: 'sirene',
  matched: true,
})

assert.deepEqual(normalizeZoneName('lumiere_prologue', 'boss'), {
  zoneName: 'lumiere_prologue',
  matched: true,
})

assert.deepEqual(normalizeZoneName('mystery_woods', 'boss'), {
  zoneName: 'mystery_woods',
  matched: false,
})

const model = buildChecklistModel(
  bosses,
  pictos,
  monocoFeet,
  journals,
  lostGestrals,
  friendlyNevrons,
  weapons,
  musicRecords,
  currentLocation,
)
const summary = summarizeChecklist(model)
assert.deepEqual(summary, {
  killedBosses: 1,
  totalBosses: 3,
  remainingBosses: 2,
  foundPictos: 1,
  totalPictos: 3,
  remainingPictos: 2,
  foundFeet: 1,
  totalFeet: 3,
  remainingFeet: 2,
  foundJournals: 1,
  totalJournals: 3,
  remainingJournals: 2,
  foundLostGestrals: 1,
  totalLostGestrals: 2,
  remainingLostGestrals: 1,
  peacefulFriendlyNevrons: 1,
  killedFriendlyNevrons: 1,
  totalFriendlyNevrons: 3,
  remainingFriendlyNevrons: 1,
  foundWeapons: 1,
  totalWeapons: 3,
  remainingWeapons: 2,
  foundMusicRecords: 1,
  totalMusicRecords: 2,
  remainingMusicRecords: 1,
  currentZoneRemainingBosses: 0,
  currentZoneRemainingPictos: 1,
  currentZoneRemainingFeet: 1,
  currentZoneRemainingJournals: 1,
  currentZoneRemainingLostGestrals: 0,
  currentZoneRemainingFriendlyNevrons: 1,
  currentZoneRemainingWeapons: 1,
  currentZoneRemainingMusicRecords: 1,
})
assert.equal(model.currentZoneName, 'floating_cemetery')
assert.deepEqual(
  model.zoneGroups.map((zone) => zone.zoneName),
  [
    'spring_meadows',
    'the_monolith',
    'floating_cemetery',
    'verso_drafts',
    'mystery_woods',
    'the_manor',
    'the_small_bourgeon',
    'the_continent',
  ],
)

const springMeadows = model.zoneGroups.find(
  (zone) => zone.zoneName === 'spring_meadows',
)
assert.ok(springMeadows)
assert.equal(springMeadows.bosses.length, 1)
assert.equal(springMeadows.pictos.length, 1)
assert.equal(springMeadows.monocoFeet.length, 1)
assert.equal(springMeadows.killed, 1)
assert.equal(springMeadows.totalPictos, 1)
assert.equal(springMeadows.totalFeet, 1)
assert.equal(springMeadows.totalJournals, 1)
assert.equal(springMeadows.foundJournals, 1)
assert.equal(springMeadows.totalFriendlyNevrons, 2)
assert.equal(springMeadows.peacefulFriendlyNevrons, 1)
assert.equal(springMeadows.killedFriendlyNevrons, 1)
assert.equal(springMeadows.totalWeapons, 1)
assert.equal(springMeadows.foundWeapons, 1)
assert.equal(springMeadows.unmatchedEntries.length, 0)
assert.equal(springMeadows.recommendedMinLevel, 0)
assert.equal(springMeadows.recommendedMaxLevel, 0)

const theMonolith = model.zoneGroups.find((zone) => zone.zoneName === 'the_monolith')
assert.ok(theMonolith)
assert.equal(theMonolith.monocoFeet.length, 1)
assert.equal(theMonolith.totalFeet, 1)
assert.equal(theMonolith.foundFeet, 0)
assert.equal(theMonolith.recommendedMinLevel, 40)
assert.equal(theMonolith.recommendedMaxLevel, 43)

const floatingCemetery = model.zoneGroups.find(
  (zone) => zone.zoneName === 'floating_cemetery',
)
assert.ok(floatingCemetery)
assert.equal(floatingCemetery.pictos.length, 1)
assert.equal(floatingCemetery.monocoFeet.length, 2)
assert.equal(floatingCemetery.foundFeet, 1)
assert.equal(floatingCemetery.totalFeet, 2)
assert.equal(floatingCemetery.totalJournals, 1)
assert.equal(floatingCemetery.foundJournals, 0)
assert.equal(floatingCemetery.totalFriendlyNevrons, 1)
assert.equal(floatingCemetery.peacefulFriendlyNevrons, 0)
assert.equal(floatingCemetery.killedFriendlyNevrons, 0)
assert.equal(floatingCemetery.totalWeapons, 1)
assert.equal(floatingCemetery.foundWeapons, 0)
assert.equal(floatingCemetery.unmatchedEntries.length, 0)
assert.equal(floatingCemetery.recommendedMinLevel, 60)
assert.equal(floatingCemetery.recommendedMaxLevel, 70)

const theSmallBourgeon = model.zoneGroups.find((zone) => zone.zoneName === 'the_small_bourgeon')
assert.ok(theSmallBourgeon)
assert.equal(theSmallBourgeon.totalJournals, 1)
assert.equal(theSmallBourgeon.foundJournals, 0)

const theContinent = model.zoneGroups.find((zone) => zone.zoneName === 'the_continent')
assert.ok(theContinent)
assert.equal(theContinent.recommendedMinLevel, undefined)
assert.equal(theContinent.recommendedMaxLevel, undefined)
assert.equal(theContinent.totalLostGestrals, 2)
assert.equal(theContinent.foundLostGestrals, 1)

const mysteryWoods = model.zoneGroups.find(
  (zone) => zone.zoneName === 'mystery_woods',
)
assert.ok(mysteryWoods)
assert.deepEqual(mysteryWoods.unmatchedEntries, [
  {
    source: 'boss',
    rawName: 'mystery_woods',
    fallbackZoneName: 'mystery_woods',
  },
  {
    source: 'weapon',
    rawName: 'mystery_woods',
    fallbackZoneName: 'mystery_woods',
  },
])
assert.equal(mysteryWoods.totalWeapons, 1)
assert.equal(mysteryWoods.foundWeapons, 0)

assert.deepEqual(model.unmatchedZoneNames, [
  {
    source: 'boss',
    rawName: 'mystery_woods',
    fallbackZoneName: 'mystery_woods',
  },
  {
    source: 'weapon',
    rawName: 'mystery_woods',
    fallbackZoneName: 'mystery_woods',
  },
])

const foundGroups = filterChecklistGroups(model, {
  filterMode: 'found',
  searchTerm: '',
  translateBossName: (value) => value,
})
assert.equal(foundGroups.length, 4)
assert.equal(foundGroups.reduce((sum, zone) => sum + zone.visibleBosses.length, 0), 1)
assert.equal(foundGroups.reduce((sum, zone) => sum + zone.visiblePictos.length, 0), 1)
assert.equal(
  foundGroups.reduce((sum, zone) => sum + zone.visibleMonocoFeet.length, 0),
  1,
)
assert.equal(
  foundGroups.reduce((sum, zone) => sum + zone.visibleJournals.length, 0),
  1,
)
assert.equal(
  foundGroups.reduce((sum, zone) => sum + zone.visibleLostGestrals.length, 0),
  1,
)
assert.equal(
  foundGroups.reduce((sum, zone) => sum + zone.visibleFriendlyNevrons.length, 0),
  2,
)
assert.equal(foundGroups.reduce((sum, zone) => sum + zone.visibleWeapons.length, 0), 1)
assert.equal(foundGroups.reduce((sum, zone) => sum + zone.visibleMusicRecords.length, 0), 1)

const remainingGroups = filterChecklistGroups(model, {
  filterMode: 'remaining',
  searchTerm: 'abbest wind',
  translateBossName: (value) => value,
})
assert.equal(remainingGroups.length, 2)
assert.equal(remainingGroups[0].visibleBosses.length + remainingGroups[1].visibleBosses.length, 0)
assert.equal(remainingGroups[0].visiblePictos.length + remainingGroups[1].visiblePictos.length, 0)
assert.equal(
  remainingGroups[0].visibleMonocoFeet.length + remainingGroups[1].visibleMonocoFeet.length,
  2,
)

const currentZoneGroups = filterChecklistGroups(model, {
  filterMode: 'current_zone',
  searchTerm: '',
  translateBossName: (value) => value,
})
assert.equal(currentZoneGroups.length, 1)
assert.equal(currentZoneGroups[0].zoneName, 'floating_cemetery')
assert.equal(currentZoneGroups[0].visibleBosses.length, 0)
assert.equal(currentZoneGroups[0].visiblePictos.length, 1)
assert.equal(currentZoneGroups[0].visiblePictos[0].friendlyName, 'Critical Break')
assert.equal(currentZoneGroups[0].visibleMonocoFeet.length, 1)
assert.equal(currentZoneGroups[0].visibleMonocoFeet[0].skillName, 'Cultist Blood')
assert.equal(currentZoneGroups[0].visibleJournals.length, 1)
assert.equal(currentZoneGroups[0].visibleJournals[0].name, 'Journal - Forgotten Notes')
assert.equal(currentZoneGroups[0].visibleLostGestrals.length, 0)
assert.equal(currentZoneGroups[0].visibleFriendlyNevrons.length, 1)
assert.equal(currentZoneGroups[0].visibleFriendlyNevrons[0].name, 'Chalier Help')
assert.equal(currentZoneGroups[0].visibleWeapons.length, 1)
assert.equal(currentZoneGroups[0].visibleWeapons[0].id, 'Weapon_FloatingMissing')

const currentZoneSearchMiss = filterChecklistGroups(model, {
  filterMode: 'current_zone',
  searchTerm: 'open playground',
  translateBossName: (value) => value,
})
assert.equal(currentZoneSearchMiss.length, 0)

const searchByJournalSummary = filterChecklistGroups(model, {
  filterMode: 'all',
  searchTerm: 'bourgeon cave',
  translateBossName: (value) => value,
})
assert.equal(searchByJournalSummary.length, 1)
assert.equal(searchByJournalSummary[0].zoneName, 'the_small_bourgeon')
assert.equal(searchByJournalSummary[0].visibleJournals.length, 1)

const searchByLostGestralSummary = filterChecklistGroups(model, {
  filterMode: 'remaining',
  searchTerm: 'stone wave cliffs portal',
  translateBossName: (value) => value,
})
assert.equal(searchByLostGestralSummary.length, 1)
assert.equal(searchByLostGestralSummary[0].zoneName, 'the_continent')
assert.equal(searchByLostGestralSummary[0].visibleLostGestrals.length, 1)
assert.equal(searchByLostGestralSummary[0].visibleLostGestrals[0].id, 'FindLostGestral_2')


const searchByFriendlyNevronSummary = filterChecklistGroups(model, {
  filterMode: 'remaining',
  searchTerm: 'choosing a weapon',
  translateBossName: (value) => value,
})
assert.equal(searchByFriendlyNevronSummary.length, 1)
assert.equal(searchByFriendlyNevronSummary[0].zoneName, 'floating_cemetery')
assert.equal(searchByFriendlyNevronSummary[0].visibleFriendlyNevrons.length, 1)
const searchByWeaponSummary = filterChecklistGroups(model, {
  filterMode: 'remaining',
  searchTerm: 'collapsed memorial arch',
  translateBossName: (value) => value,
})
assert.equal(searchByWeaponSummary.length, 1)
assert.equal(searchByWeaponSummary[0].zoneName, 'floating_cemetery')
assert.equal(searchByWeaponSummary[0].visibleWeapons.length, 1)

const searchByMonsterName = filterChecklistGroups(model, {
  filterMode: 'all',
  searchTerm: 'abbest',
  translateBossName: (value) => value,
})
assert.equal(searchByMonsterName.length, 2)
assert.equal(
  searchByMonsterName[0].visibleMonocoFeet.length + searchByMonsterName[1].visibleMonocoFeet.length,
  2,
)

const unresolvedCurrentZone = buildChecklistModel(
  bosses,
  pictos,
  monocoFeet,
  journals,
  lostGestrals,
  friendlyNevrons,
  weapons,
  musicRecords,
  {
    levelKey: 'Level_Unknown_Debug',
    spawnTag: 'Level.SpawnPoint.Unknown.Debug',
    areaName: 'Mystery Depths',
    subLocationName: null,
    displayName: 'Mystery Depths',
  },
)
assert.equal(unresolvedCurrentZone.currentZoneName, 'Mystery Depths')
assert.deepEqual(unresolvedCurrentZone.unmatchedZoneNames, [
  {
    source: 'boss',
    rawName: 'mystery_woods',
    fallbackZoneName: 'mystery_woods',
  },
  {
    source: 'weapon',
    rawName: 'mystery_woods',
    fallbackZoneName: 'mystery_woods',
  },
  {
    source: 'location',
    rawName: 'Mystery Depths',
    fallbackZoneName: 'Mystery Depths',
  },
])
assert.equal(
  filterChecklistGroups(unresolvedCurrentZone, {
    filterMode: 'current_zone',
    searchTerm: '',
    translateBossName: (value) => value,
  }).length,
  0,
)

const logged: string[] = []
reportUnmatchedZoneNames(model.unmatchedZoneNames, (message) => {
  logged.push(message)
})
reportUnmatchedZoneNames(model.unmatchedZoneNames, (message) => {
  logged.push(message)
})

assert.equal(logged.length, 2)
assert.match(logged[0], /mystery_woods/)



console.log('checklistModel tests passed')

