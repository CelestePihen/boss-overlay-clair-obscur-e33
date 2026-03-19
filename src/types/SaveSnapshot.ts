import type { Boss } from './Boss'
import type { CurrentLocation } from './CurrentLocation'
import type { FriendlyNevronEntry } from './FriendlyNevronEntry'
import type { JournalEntry } from './JournalEntry'
import type { LostGestralEntry } from './LostGestralEntry'
import type { MonocoFoot } from './MonocoFoot'
import type { MusicRecordEntry } from './MusicRecordEntry'
import type { Picto } from './Picto'
import type { WeaponEntry } from './WeaponEntry'

export interface SaveSnapshot {
  bosses: Boss[]
  pictos: Picto[]
  monocoFeet: MonocoFoot[]
  journals: JournalEntry[]
  lostGestrals: LostGestralEntry[]
  friendlyNevrons: FriendlyNevronEntry[]
  weapons: WeaponEntry[]
  musicRecords: MusicRecordEntry[]
  location: CurrentLocation | null
}
