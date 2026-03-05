// ============================================================
// DemoScenarios - Three pre-built demo scenarios
// ============================================================

import type {
  ScenarioInfo,
  AnomalyConfig,
  NarrativeOverlay,
  SignalTimelineEntry,
  DemoFrame,
} from '../types/index.ts';
import { SAKA_PROFILE, PEDRI_PROFILE, MUSIALA_PROFILE } from './PlayerProfiles.ts';
import {
  generateScenarioFrames,
  generateTransientSpikeFrames,
} from './SyntheticGaitData.ts';
import type { GeneratedScenarioData } from './SyntheticGaitData.ts';

// --- Scenario 1: "Saka Touchline Guarding" ---

const sakaNarratives: NarrativeOverlay[] = [
  {
    timestampMs: 0,
    durationMs: 5000,
    text: 'Saka tracking back in defensive transition - normal movement envelope. Model in MONITORING state.',
    type: 'context',
  },
  {
    timestampMs: 20000,
    durationMs: 5000,
    text: 'Baseline movement signature stable. Load angle, contact time, and stride compression all within one standard deviation.',
    type: 'context',
  },
  {
    timestampMs: 40000,
    durationMs: 6000,
    text: 'Long recovery sprint on the touchline, then a hard deceleration. Nothing obvious on the broadcast feed.',
    type: 'context',
  },
  {
    timestampMs: 50000,
    durationMs: 6000,
    text: 'Right-side load angle softening. Contact asymmetry ticking up. Still below confirmation threshold.',
    type: 'detection',
  },
  {
    timestampMs: 60000,
    durationMs: 5000,
    text: 'ALERT triggered. Right-side contact asymmetry reaches 5.9% against a 2.1% baseline. Rate of change is accelerating.',
    type: 'detection',
  },
  {
    timestampMs: 72000,
    durationMs: 5000,
    text: 'Multiple correlated shifts now agree: hip drive, contact time, and stride compression are all leaning the same direction.',
    type: 'detection',
  },
  {
    timestampMs: 80000,
    durationMs: 6000,
    text: 'Signal CONFIRMED. Eight consecutive strides above threshold. Confidence: 0.74.',
    type: 'detection',
  },
  {
    timestampMs: 95000,
    durationMs: 8000,
    text: 'ACTIONABLE signal emitted. Score: 0.63, Confidence: 0.79. Markets affected: Anytime Scorer, Shots On Target, Team Total Goals.',
    type: 'result',
  },
  {
    timestampMs: 110000,
    durationMs: 7000,
    text: 'Saka stays on the pitch, but top-speed actions flatten. Score stabilizes between 0.56 and 0.66.',
    type: 'context',
  },
  {
    timestampMs: 130000,
    durationMs: 7000,
    text: 'GaitSignal flagged the change 47 seconds before commentary mentioned he was stretching his hamstring.',
    type: 'result',
  },
  {
    timestampMs: 142000,
    durationMs: 5000,
    text: 'Arsenal move him wider and reduce recovery runs. Broadcast still frames it as precautionary.',
    type: 'result',
  },
];

const sakaAnomalyConfig: AnomalyConfig = {
  type: 'hip_compensation',
  onsetTimestampMs: 40000,
  rampDurationMs: 13000,
  peakSeverity: 1.0,
  affectedSide: 'right',
  affectedFeatures: [1, 2, 4, 5, 10, 11, 15, 16, 17, 18],
};

const sakaSignalTimeline: SignalTimelineEntry[] = [
  { state: 'monitoring', startTimestampMs: 0 },
  { state: 'alert', startTimestampMs: 60000 },
  { state: 'confirmed', startTimestampMs: 80000 },
  { state: 'actionable', startTimestampMs: 95000 },
];

const sakaScenarioInfo: ScenarioInfo = {
  id: 'saka-touchline-guarding',
  name: 'Saka Touchline Guarding',
  description:
    'Primary demo. Subtle right-side guarding after a long recovery sprint. Model catches it 47 seconds before commentary.',
  playerProfile: SAKA_PROFILE,
  durationMs: 150000,
  anomalyConfig: sakaAnomalyConfig,
  narrativeOverlays: sakaNarratives,
  signalTimeline: sakaSignalTimeline,
};

// --- Scenario 2: "Pedri Pressing Drift" ---

const pedriNarratives: NarrativeOverlay[] = [
  {
    timestampMs: 0,
    durationMs: 6000,
    text: 'Seventy-first minute. Barcelona are still pressing high. Monitoring baseline.',
    type: 'context',
  },
  {
    timestampMs: 20000,
    durationMs: 5000,
    text: 'Repeat accelerations are shortening. Contact times and forward lean are beginning to drift.',
    type: 'context',
  },
  {
    timestampMs: 40000,
    durationMs: 6000,
    text: 'Not an injury signal - workload accumulation. Pedri is conserving on second-wave presses.',
    type: 'detection',
  },
  {
    timestampMs: 60000,
    durationMs: 5000,
    text: 'ALERT state. Multiple movement features are drifting together. The onset is subtle but sustained.',
    type: 'detection',
  },
  {
    timestampMs: 80000,
    durationMs: 6000,
    text: 'Signal CONFIRMED at lower confidence (0.56). This reads like fatigue, not acute trauma.',
    type: 'detection',
  },
  {
    timestampMs: 95000,
    durationMs: 7000,
    text: 'ACTIONABLE for next-goal and team-total markets. Historical comps show chance creation usually drops first.',
    type: 'result',
  },
  {
    timestampMs: 110000,
    durationMs: 6000,
    text: 'This is where football video gets interesting - the model can separate sustained fatigue from one-off contact.',
    type: 'result',
  },
];

const pedriAnomalyConfig: AnomalyConfig = {
  type: 'fatigue_drift',
  onsetTimestampMs: 15000,
  rampDurationMs: 60000,
  peakSeverity: 1.15,
  affectedSide: 'bilateral',
  affectedFeatures: [0, 1, 9, 10, 12, 13, 15, 16, 18],
};

const pedriSignalTimeline: SignalTimelineEntry[] = [
  { state: 'monitoring', startTimestampMs: 0 },
  { state: 'alert', startTimestampMs: 60000 },
  { state: 'confirmed', startTimestampMs: 80000 },
  { state: 'actionable', startTimestampMs: 95000 },
];

const pedriScenarioInfo: ScenarioInfo = {
  id: 'pedri-pressing-drift',
  name: 'Pedri Pressing Drift',
  description:
    'Gradual fatigue-induced movement degradation after repeated pressing actions. Lower-confidence signal but actionable live.',
  playerProfile: PEDRI_PROFILE,
  durationMs: 120000,
  anomalyConfig: pedriAnomalyConfig,
  narrativeOverlays: pedriNarratives,
  signalTimeline: pedriSignalTimeline,
};

const musialaSignalTimeline: SignalTimelineEntry[] = [
  { state: 'monitoring', startTimestampMs: 0 },
  { state: 'alert', startTimestampMs: 30000 },
  { state: 'monitoring', startTimestampMs: 38000 },
];

// --- Scenario 3: "Musiala Contact Reset" ---

const musialaNarratives: NarrativeOverlay[] = [
  {
    timestampMs: 0,
    durationMs: 5000,
    text: 'Musiala carrying at the edge of the box - normal movement signature. MONITORING.',
    type: 'context',
  },
  {
    timestampMs: 25000,
    durationMs: 5000,
    text: 'Heavy contact near the box. Musiala takes two protective steps after landing.',
    type: 'context',
  },
  {
    timestampMs: 30000,
    durationMs: 5000,
    text: 'Visible hitch for 3-4 strides. Contact asymmetry spikes to 13%. Model enters ALERT.',
    type: 'detection',
  },
  {
    timestampMs: 38000,
    durationMs: 5000,
    text: 'Movement normalizing. Load angle and stride compression are falling back toward baseline. Only three strides above threshold.',
    type: 'detection',
  },
  {
    timestampMs: 48000,
    durationMs: 6000,
    text: 'Model returns to MONITORING. Transient contact event - confirmation threshold was not met.',
    type: 'result',
  },
  {
    timestampMs: 60000,
    durationMs: 6000,
    text: 'Musiala fully normalized. The state machine prevented a false positive signal.',
    type: 'result',
  },
  {
    timestampMs: 75000,
    durationMs: 8000,
    text: 'This is the difference between a useful football signal and noisy overreaction.',
    type: 'result',
  },
];

const musialaScenarioInfo: ScenarioInfo = {
  id: 'musiala-contact-reset',
  name: 'Musiala Contact Reset',
  description:
    'Heavy contact produces a brief protective stride pattern, then the signal clears before any false escalation.',
  playerProfile: MUSIALA_PROFILE,
  durationMs: 90000,
  anomalyConfig: null,
  narrativeOverlays: musialaNarratives,
  signalTimeline: musialaSignalTimeline,
};

// --- Scenario registry ---

export const SCENARIOS: ScenarioInfo[] = [
  sakaScenarioInfo,
  pedriScenarioInfo,
  musialaScenarioInfo,
];

export function getScenarioById(id: string): ScenarioInfo | undefined {
  return SCENARIOS.find((s) => s.id === id);
}

// --- Frame generation (lazy, cached) ---

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
      4000,
      scenario.narrativeOverlays,
      scenario.signalTimeline ?? null,
    );
  } else {
    data = generateScenarioFrames(
      scenario.playerProfile,
      scenario.durationMs,
      fps,
      scenario.anomalyConfig,
      scenario.narrativeOverlays,
      scenario.signalTimeline ?? null,
    );
  }

  frameCache.set(cacheKey, data.frames);
  return data.frames;
}

export function clearFrameCache(): void {
  frameCache.clear();
}
