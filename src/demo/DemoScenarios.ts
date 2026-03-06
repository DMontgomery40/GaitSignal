// ============================================================
// DemoScenarios - Three football-native pricing edge scenarios
// ============================================================

import type {
  ScenarioInfo,
  AnomalyConfig,
  NarrativeOverlay,
  DemoFrame,
  FootballContextKeyframe,
  ScenarioPoseCue,
} from '../types/index.ts';
import { SAKA_PROFILE, PEDRI_PROFILE, MUSIALA_PROFILE } from './PlayerProfiles.ts';
import {
  generateScenarioFrames,
  generateTransientSpikeFrames,
} from './SyntheticGaitData.ts';
import type { GeneratedScenarioData } from './SyntheticGaitData.ts';

const sakaNarratives: NarrativeOverlay[] = [
  {
    timestampMs: 0,
    durationMs: 6000,
    text: 'Contracted in-stadium tracking shows Saka in defensive recovery. The player-specific movement model is quiet and no pricing edge is open.',
    type: 'context',
  },
  {
    timestampMs: 40000,
    durationMs: 7000,
    text: 'A long recovery sprint and hard touchline deceleration lift the movement-surprise proxy. Arsenal are still out of possession, so the edge stays suppressed.',
    type: 'detection',
  },
  {
    timestampMs: 60000,
    durationMs: 7000,
    text: 'WARMING state. The model keeps seeing right-side drift, but the football context gate is still too weak to price aggressively.',
    type: 'detection',
  },
  {
    timestampMs: 76000,
    durationMs: 7000,
    text: 'Arsenal threaten the turnover. Saka becomes the immediate wide outlet and the context gate starts to agree with the movement surprise.',
    type: 'context',
  },
  {
    timestampMs: 92000,
    durationMs: 7000,
    text: 'PRICEABLE edge. Same movement issue, different football meaning: now it sits on a live attacking responsibility window.',
    type: 'result',
  },
  {
    timestampMs: 126000,
    durationMs: 8000,
    text: 'Arsenal keep Saka wider and reduce repeat recovery demands. The model stays elevated, but the pricing edge compresses with the role change.',
    type: 'result',
  },
];

const sakaAnomalyConfig: AnomalyConfig = {
  type: 'hip_compensation',
  onsetTimestampMs: 38000,
  rampDurationMs: 14000,
  peakSeverity: 1.0,
  affectedSide: 'right',
  affectedFeatures: [1, 2, 4, 5, 10, 11, 15, 16, 17, 18],
};

const sakaContextTimeline: FootballContextKeyframe[] = [
  {
    startTimestampMs: 0,
    playerPosition: { x: 34, y: 8 },
    ballPosition: { x: 58, y: 31 },
    possession: 'opponent',
    ballAccess: 'far',
    pitchZone: 'defensive-third',
    phaseOfPlay: 'defensive-recovery',
    roleDemand: 'high',
    sourceConfidence: 0.93,
    marketUrgency: 'watch',
    marketFamily: ['Saka shots', 'Arsenal team total', 'Next Arsenal attack'],
    feedLabel: 'TRACAB + synced event feed',
    note: 'Out of possession recovery run.',
  },
  {
    startTimestampMs: 40000,
    playerPosition: { x: 42, y: 6 },
    ballPosition: { x: 61, y: 24 },
    possession: 'opponent',
    ballAccess: 'far',
    pitchZone: 'left-wing',
    phaseOfPlay: 'defensive-recovery',
    roleDemand: 'high',
    sourceConfidence: 0.92,
    marketUrgency: 'watch',
    marketFamily: ['Saka shots', 'Arsenal team total', 'Next Arsenal attack'],
    feedLabel: 'TRACAB + synced event feed',
    note: 'Drift appears but Arsenal are still chasing the phase.',
  },
  {
    startTimestampMs: 76000,
    playerPosition: { x: 59, y: 10 },
    ballPosition: { x: 56, y: 16 },
    possession: 'contested',
    ballAccess: 'support',
    pitchZone: 'half-space',
    phaseOfPlay: 'transition-attack',
    roleDemand: 'high',
    sourceConfidence: 0.94,
    marketUrgency: 'active',
    marketFamily: ['Saka shots', 'Arsenal team total', 'Next Arsenal attack'],
    feedLabel: 'TRACAB + synced event feed',
    note: 'Turnover threat raises the value of any movement drop-off.',
  },
  {
    startTimestampMs: 92000,
    playerPosition: { x: 74, y: 12 },
    ballPosition: { x: 77, y: 14 },
    possession: 'player_team',
    ballAccess: 'involved',
    pitchZone: 'final-third',
    phaseOfPlay: 'settled-attack',
    roleDemand: 'extreme',
    sourceConfidence: 0.95,
    marketUrgency: 'immediate',
    marketFamily: ['Saka shots', 'Arsenal team total', 'Anytime involvement'],
    feedLabel: 'TRACAB + synced event feed',
    note: 'Attacking responsibility is now live on the same degraded movement pattern.',
  },
  {
    startTimestampMs: 126000,
    playerPosition: { x: 78, y: 5 },
    ballPosition: { x: 63, y: 28 },
    possession: 'player_team',
    ballAccess: 'far',
    pitchZone: 'left-wing',
    phaseOfPlay: 'settled-attack',
    roleDemand: 'moderate',
    sourceConfidence: 0.94,
    marketUrgency: 'active',
    marketFamily: ['Arsenal team total', 'Next Arsenal attack'],
    feedLabel: 'TRACAB + synced event feed',
    note: 'Role adjustment cools the edge even before the model fully normalizes.',
  },
];

const sakaPoseTimeline: ScenarioPoseCue[] = [
  { startTimestampMs: 0, segmentId: 'steadyCarry', playbackRate: 1.02, strideScale: 1.0 },
  { startTimestampMs: 38000, segmentId: 'hardPlant', playbackRate: 0.96, strideScale: 0.98, leanBias: 0.01 },
  { startTimestampMs: 60000, segmentId: 'guardedRecovery', playbackRate: 0.9, strideScale: 0.9, leanBias: 0.02 },
  { startTimestampMs: 126000, segmentId: 'steadyCarry', playbackRate: 0.92, strideScale: 0.94, leanBias: 0.012 },
];

const sakaScenarioInfo: ScenarioInfo = {
  id: 'saka-touchline-guarding',
  name: 'Saka Recovery-Run Reprice',
  description:
    'Movement drift is only priceable once Saka becomes the live wide outlet in an Arsenal attack.',
  playerProfile: SAKA_PROFILE,
  durationMs: 150000,
  anomalyConfig: sakaAnomalyConfig,
  narrativeOverlays: sakaNarratives,
  contextTimeline: sakaContextTimeline,
  poseTimeline: sakaPoseTimeline,
};

const pedriNarratives: NarrativeOverlay[] = [
  {
    timestampMs: 0,
    durationMs: 6000,
    text: 'Pedri starts in a high-press phase. The feed stack is stable, role demand is heavy, and the edge engine is monitoring for sustained surprise.',
    type: 'context',
  },
  {
    timestampMs: 36000,
    durationMs: 7000,
    text: 'Movement surprise climbs gradually: shorter repeat accelerations, longer contact, more forward lean. That alone is not enough.',
    type: 'detection',
  },
  {
    timestampMs: 65000,
    durationMs: 7000,
    text: 'WARMING state. Barcelona keep asking Pedri to counterpress and recycle, so the football context gate stays high instead of cooling the edge.',
    type: 'detection',
  },
  {
    timestampMs: 90000,
    durationMs: 8000,
    text: 'CONFIRMED edge. This is not an injury claim. It is a player-specific decay pattern during a role that still matters to live pricing.',
    type: 'result',
  },
  {
    timestampMs: 108000,
    durationMs: 7000,
    text: 'PRICEABLE edge. If the tactical demand dropped here, the edge would compress. It stays open because Barcelona keep the same workload on him.',
    type: 'result',
  },
];

const pedriAnomalyConfig: AnomalyConfig = {
  type: 'fatigue_drift',
  onsetTimestampMs: 18000,
  rampDurationMs: 65000,
  peakSeverity: 1.18,
  affectedSide: 'bilateral',
  affectedFeatures: [0, 1, 9, 10, 12, 13, 15, 16, 18],
};

const pedriContextTimeline: FootballContextKeyframe[] = [
  {
    startTimestampMs: 0,
    playerPosition: { x: 50, y: 31 },
    ballPosition: { x: 59, y: 26 },
    possession: 'opponent',
    ballAccess: 'support',
    pitchZone: 'middle-third',
    phaseOfPlay: 'high-press',
    roleDemand: 'high',
    sourceConfidence: 0.94,
    marketUrgency: 'active',
    marketFamily: ['Next goal', 'Barcelona team total', 'Pedri involvement'],
    feedLabel: 'Opta Vision sync + venue tracking',
    note: 'Pressing load makes movement drift more commercially relevant.',
  },
  {
    startTimestampMs: 36000,
    playerPosition: { x: 56, y: 28 },
    ballPosition: { x: 63, y: 24 },
    possession: 'contested',
    ballAccess: 'support',
    pitchZone: 'half-space',
    phaseOfPlay: 'counterpress',
    roleDemand: 'extreme',
    sourceConfidence: 0.95,
    marketUrgency: 'active',
    marketFamily: ['Next goal', 'Barcelona team total', 'Pedri involvement'],
    feedLabel: 'Opta Vision sync + venue tracking',
    note: 'Counterpressing keeps the context gate elevated as drift accumulates.',
  },
  {
    startTimestampMs: 76000,
    playerPosition: { x: 64, y: 26 },
    ballPosition: { x: 67, y: 22 },
    possession: 'player_team',
    ballAccess: 'involved',
    pitchZone: 'final-third',
    phaseOfPlay: 'settled-attack',
    roleDemand: 'high',
    sourceConfidence: 0.95,
    marketUrgency: 'immediate',
    marketFamily: ['Next goal', 'Barcelona team total', 'Pedri involvement'],
    feedLabel: 'Opta Vision sync + venue tracking',
    note: 'The same fatigue pattern now sits inside an active attacking phase.',
  },
  {
    startTimestampMs: 108000,
    playerPosition: { x: 62, y: 24 },
    ballPosition: { x: 70, y: 18 },
    possession: 'player_team',
    ballAccess: 'involved',
    pitchZone: 'final-third',
    phaseOfPlay: 'settled-attack',
    roleDemand: 'high',
    sourceConfidence: 0.94,
    marketUrgency: 'immediate',
    marketFamily: ['Barcelona team total', 'Pedri involvement', 'Next goal'],
    feedLabel: 'Opta Vision sync + venue tracking',
    note: 'Role demand remains high long enough for the edge to stay live.',
  },
];

const pedriPoseTimeline: ScenarioPoseCue[] = [
  { startTimestampMs: 0, segmentId: 'steadyCarry', playbackRate: 1.0, strideScale: 1.0 },
  { startTimestampMs: 36000, segmentId: 'hardPlant', playbackRate: 0.92, strideScale: 0.96, leanBias: 0.012 },
  { startTimestampMs: 65000, segmentId: 'guardedRecovery', playbackRate: 0.86, strideScale: 0.88, leanBias: 0.02 },
  { startTimestampMs: 108000, segmentId: 'guardedRecovery', playbackRate: 0.82, strideScale: 0.84, leanBias: 0.025 },
];

const pedriScenarioInfo: ScenarioInfo = {
  id: 'pedri-pressing-drift',
  name: 'Pedri Press-Decay Edge',
  description:
    'Sustained fatigue only becomes commercially relevant because the same high-demand role keeps repeating.',
  playerProfile: PEDRI_PROFILE,
  durationMs: 120000,
  anomalyConfig: pedriAnomalyConfig,
  narrativeOverlays: pedriNarratives,
  contextTimeline: pedriContextTimeline,
  poseTimeline: pedriPoseTimeline,
};

const musialaNarratives: NarrativeOverlay[] = [
  {
    timestampMs: 0,
    durationMs: 6000,
    text: 'Musiala is carrying near the box. This is the most dangerous context in the set, so any real sustained movement break would matter quickly.',
    type: 'context',
  },
  {
    timestampMs: 26000,
    durationMs: 7000,
    text: 'Heavy contact. The surprise proxy jumps, but only for a handful of strides and with a small dip in source confidence during the collision.',
    type: 'detection',
  },
  {
    timestampMs: 42000,
    durationMs: 7000,
    text: 'The movement proxy collapses back toward baseline before the pricing workflow can confirm. High game context alone is not enough.',
    type: 'result',
  },
  {
    timestampMs: 62000,
    durationMs: 7000,
    text: 'Edge closed. This is the anti-slop case: the system refuses to convert a brief contact scare into a live market opinion.',
    type: 'result',
  },
];

const musialaContextTimeline: FootballContextKeyframe[] = [
  {
    startTimestampMs: 0,
    playerPosition: { x: 77, y: 29 },
    ballPosition: { x: 79, y: 30 },
    possession: 'player_team',
    ballAccess: 'on_ball',
    pitchZone: 'box-edge',
    phaseOfPlay: 'ball-carry',
    roleDemand: 'extreme',
    sourceConfidence: 0.95,
    marketUrgency: 'immediate',
    marketFamily: ['Next goal', 'Musiala shots', 'Bayern team total'],
    feedLabel: 'Venue tracking + event sync',
    note: 'Musiala is in the exact context where a real movement break would matter.',
  },
  {
    startTimestampMs: 26000,
    playerPosition: { x: 81, y: 28 },
    ballPosition: { x: 82, y: 29 },
    possession: 'contested',
    ballAccess: 'involved',
    pitchZone: 'box-edge',
    phaseOfPlay: 'ball-carry',
    roleDemand: 'extreme',
    sourceConfidence: 0.84,
    marketUrgency: 'immediate',
    marketFamily: ['Next goal', 'Musiala shots', 'Bayern team total'],
    feedLabel: 'Venue tracking + event sync',
    note: 'Collision creates noise right when the context is hottest.',
  },
  {
    startTimestampMs: 42000,
    playerPosition: { x: 74, y: 24 },
    ballPosition: { x: 68, y: 21 },
    possession: 'player_team',
    ballAccess: 'support',
    pitchZone: 'final-third',
    phaseOfPlay: 'settled-attack',
    roleDemand: 'moderate',
    sourceConfidence: 0.92,
    marketUrgency: 'active',
    marketFamily: ['Bayern team total', 'Next Bayern attack'],
    feedLabel: 'Venue tracking + event sync',
    note: 'The context is still useful, but the movement surprise has already faded.',
  },
];

const musialaPoseTimeline: ScenarioPoseCue[] = [
  { startTimestampMs: 0, segmentId: 'steadyCarry', playbackRate: 1.04, strideScale: 1.02 },
  { startTimestampMs: 28000, segmentId: 'hardPlant', playbackRate: 0.98, strideScale: 0.94, leanBias: -0.01 },
  { startTimestampMs: 38000, segmentId: 'steadyCarry', playbackRate: 1.0, strideScale: 1.0 },
];

const musialaScenarioInfo: ScenarioInfo = {
  id: 'musiala-contact-reset',
  name: 'Musiala Contact Reset',
  description:
    'A high-urgency contact moment never becomes priceable because the movement signal clears before confirmation.',
  playerProfile: MUSIALA_PROFILE,
  durationMs: 90000,
  anomalyConfig: null,
  narrativeOverlays: musialaNarratives,
  contextTimeline: musialaContextTimeline,
  poseTimeline: musialaPoseTimeline,
};

export const SCENARIOS: ScenarioInfo[] = [
  sakaScenarioInfo,
  pedriScenarioInfo,
  musialaScenarioInfo,
];

export function getScenarioById(id: string): ScenarioInfo | undefined {
  return SCENARIOS.find((s) => s.id === id);
}

const frameCache = new Map<string, DemoFrame[]>();

export function generateFramesForScenario(
  scenario: ScenarioInfo,
  fps: number = 30,
): DemoFrame[] {
  const cacheKey = `${scenario.id}-${fps}`;
  const cached = frameCache.get(cacheKey);
  if (cached) return cached;

  let data: GeneratedScenarioData;

  if (scenario.id === 'musiala-contact-reset') {
    data = generateTransientSpikeFrames(
      scenario.playerProfile,
      scenario.durationMs,
      fps,
      28000,
      4200,
      scenario.narrativeOverlays,
      scenario.contextTimeline,
      scenario.poseTimeline,
    );
  } else {
    data = generateScenarioFrames(
      scenario.playerProfile,
      scenario.durationMs,
      fps,
      scenario.anomalyConfig,
      scenario.narrativeOverlays,
      scenario.contextTimeline,
      scenario.poseTimeline,
    );
  }

  frameCache.set(cacheKey, data.frames);
  return data.frames;
}

export function clearFrameCache(): void {
  frameCache.clear();
}
