import assert from 'node:assert/strict'

import type { FilteredChecklistZoneGroup } from '../src/components/checklistModel.ts'
import {
  applyChecklistFeatureVisibility,
  buildZoneRemainingSummaryParts,
  DEFAULT_CHECKLIST_FEATURE_VISIBILITY,
  toggleChecklistFeatureVisibility,
  zoneHasVisibleContent,
} from '../src/components/checklistVisibility.ts'

const sampleZone = {
  zoneName: 'spring_meadows',
  bosses: [],
  pictos: [],
  monocoFeet: [],
  journals: [],
  lostGestrals: [],
  friendlyNevrons: [],
  weapons: [],
  musicRecords: [],
  killed: 1,
  encountered: 1,
  totalBosses: 2,
  foundPictos: 3,
  totalPictos: 5,
  foundFeet: 1,
  totalFeet: 2,
  foundJournals: 1,
  totalJournals: 4,
  foundLostGestrals: 0,
  totalLostGestrals: 1,
  peacefulFriendlyNevrons: 0,
  killedFriendlyNevrons: 0,
  totalFriendlyNevrons: 1,
  foundWeapons: 1,
  totalWeapons: 3,
  foundMusicRecords: 0,
  totalMusicRecords: 1,
  unmatchedEntries: [],
  visibleBosses: [{ name: 'goblu' }],
  visiblePictos: [{ id: 'Dodger' }],
  visibleMonocoFeet: [{ id: 'AbbestFoot' }],
  visibleJournals: [{ id: 'Journal_Exp81' }],
  visibleLostGestrals: [{ id: 'FindLostGestral_1' }],
  visibleFriendlyNevrons: [{ id: 'Nevron_JarNeedLight' }],
  visibleWeapons: [{ id: 'PracticeBlade' }],
  visibleMusicRecords: [{ id: 'MusicRecord_2' }],
} as unknown as FilteredChecklistZoneGroup

const visibility = toggleChecklistFeatureVisibility(
  DEFAULT_CHECKLIST_FEATURE_VISIBILITY,
  'bosses',
)
assert.equal(visibility.bosses, false)
assert.equal(visibility.pictos, true)

const hiddenGroups = applyChecklistFeatureVisibility([sampleZone], {
  ...DEFAULT_CHECKLIST_FEATURE_VISIBILITY,
  bosses: false,
  pictos: false,
  journals: false,
  lostGestrals: false,
})
assert.equal(hiddenGroups[0].visibleBosses.length, 0)
assert.equal(hiddenGroups[0].visiblePictos.length, 0)
assert.equal(hiddenGroups[0].visibleJournals.length, 0)
assert.equal(hiddenGroups[0].visibleLostGestrals.length, 0)
assert.equal(hiddenGroups[0].visibleMonocoFeet.length, 1)
assert.equal(hiddenGroups[0].visibleWeapons.length, 1)
assert.equal(hiddenGroups[0].visibleMusicRecords.length, 1)
assert.equal(zoneHasVisibleContent(hiddenGroups[0]), true)

const emptyGroups = applyChecklistFeatureVisibility([sampleZone], {
  bosses: false,
  pictos: false,
  feet: false,
  journals: false,
  lostGestrals: false,
  friendlyNevrons: false,
  weapons: false,
  musicRecords: false,
})
assert.equal(zoneHasVisibleContent(emptyGroups[0]), false)

assert.deepEqual(
  buildZoneRemainingSummaryParts(sampleZone, {
    bosses: true,
    pictos: true,
    feet: true,
    journals: true,
    lostGestrals: true,
    friendlyNevrons: true,
    weapons: true,
    musicRecords: true,
  }).map((part) => part.label),
  ['1\ud83c\udfc6', '2\u2728', '1\ud83e\uddb6', '3\ud83d\udcd6', '1\ud83d\udc76', '1\ud83d\udc7e', '2\ud83d\udde1\ufe0f', '1\ud83d\udcbf'],
)

assert.deepEqual(
  buildZoneRemainingSummaryParts(sampleZone, {
    bosses: false,
    pictos: true,
    feet: false,
    journals: false,
    lostGestrals: false,
    friendlyNevrons: false,
    weapons: false,
    musicRecords: false,
  }).map((part) => part.label),
  ['2\u2728'],
)

console.log('checklistVisibility tests passed')
