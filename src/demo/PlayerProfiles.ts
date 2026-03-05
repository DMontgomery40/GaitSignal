// ============================================================
// PlayerProfiles — Pre-defined biomechanical baselines per player
// ============================================================

import type { PlayerProfileJSON } from '../types/index.ts';

import sakaProfile from './data/player-saka.json';
import pedriProfile from './data/player-pedri.json';
import musialaProfile from './data/player-musiala.json';

// Feature vector order (all 20 elements):
//  0: L knee flexion peak (deg)
//  1: R knee flexion peak (deg)
//  2: Knee flexion asymmetry (%)
//  3: L hip flexion peak (deg)
//  4: R hip flexion peak (deg)
//  5: Hip flexion asymmetry (%)
//  6: L ankle dorsiflexion peak (deg)
//  7: R ankle dorsiflexion peak (deg)
//  8: Ankle asymmetry (%)
//  9: Stride length L (normalized)
// 10: Stride length R (normalized)
// 11: Stride length asymmetry (%)
// 12: Stride time L (ms)
// 13: Stride time R (ms)
// 14: Stride time asymmetry (%)
// 15: Ground contact L (ms)
// 16: Ground contact R (ms)
// 17: Ground contact asymmetry (%)
// 18: Trunk lean (deg)
// 19: Lateral trunk tilt (deg)

export const SAKA_PROFILE: PlayerProfileJSON = sakaProfile as PlayerProfileJSON;
export const PEDRI_PROFILE: PlayerProfileJSON = pedriProfile as PlayerProfileJSON;
export const MUSIALA_PROFILE: PlayerProfileJSON = musialaProfile as PlayerProfileJSON;

const PROFILES: Record<string, PlayerProfileJSON> = {
  saka: SAKA_PROFILE,
  pedri: PEDRI_PROFILE,
  musiala: MUSIALA_PROFILE,
};

export function getProfile(playerId: string): PlayerProfileJSON {
  const profile = PROFILES[playerId];
  if (!profile) {
    throw new Error(`Unknown player profile: ${playerId}`);
  }
  return profile;
}

export function getAllProfiles(): PlayerProfileJSON[] {
  return Object.values(PROFILES);
}

export function getProfileIds(): string[] {
  return Object.keys(PROFILES);
}
