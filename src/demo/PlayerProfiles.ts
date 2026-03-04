// ============================================================
// PlayerProfiles — Pre-defined biomechanical baselines per player
// ============================================================

import type { PlayerProfileJSON } from '../types/index.ts';

import sgaProfile from './data/player-sga.json';
import jokicProfile from './data/player-jokic.json';
import tatumProfile from './data/player-tatum.json';

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

export const SGA_PROFILE: PlayerProfileJSON = sgaProfile as PlayerProfileJSON;
export const JOKIC_PROFILE: PlayerProfileJSON = jokicProfile as PlayerProfileJSON;
export const TATUM_PROFILE: PlayerProfileJSON = tatumProfile as PlayerProfileJSON;

const PROFILES: Record<string, PlayerProfileJSON> = {
  sga: SGA_PROFILE,
  jokic: JOKIC_PROFILE,
  tatum: TATUM_PROFILE,
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
