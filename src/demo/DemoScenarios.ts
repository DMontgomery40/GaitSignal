// ============================================================
// DemoScenarios — Three pre-built demo scenarios
// ============================================================

import type {
  ScenarioInfo,
  AnomalyConfig,
  NarrativeOverlay,
  DemoFrame,
} from '../types/index.ts';
import { SGA_PROFILE, JOKIC_PROFILE, TATUM_PROFILE } from './PlayerProfiles.ts';
import {
  generateScenarioFrames,
  generateTransientSpikeFrames,
} from './SyntheticGaitData.ts';
import type { GeneratedScenarioData } from './SyntheticGaitData.ts';

// --- Scenario 1: "The SGA Knee" ---

const sgaNarratives: NarrativeOverlay[] = [
  {
    timestampMs: 0,
    durationMs: 5000,
    text: 'SGA in transition — normal running pattern. Model in MONITORING state.',
    type: 'context',
  },
  {
    timestampMs: 20000,
    durationMs: 5000,
    text: 'Baseline gait signature stable. All 20 features within 1 standard deviation.',
    type: 'context',
  },
  {
    timestampMs: 40000,
    durationMs: 6000,
    text: 'SGA contests a shot at the rim and lands awkwardly on his right leg.',
    type: 'context',
  },
  {
    timestampMs: 50000,
    durationMs: 6000,
    text: 'Right knee flexion peak dropping. Stride asymmetry ticking up. Still within 1.5\u03C3.',
    type: 'detection',
  },
  {
    timestampMs: 60000,
    durationMs: 5000,
    text: 'ALERT triggered. Knee flexion asymmetry at 6.2% (baseline: 2.8%). Rate of change accelerating.',
    type: 'detection',
  },
  {
    timestampMs: 72000,
    durationMs: 5000,
    text: 'Multiple correlated features deviating: knee asymmetry, stride length, ground contact time.',
    type: 'detection',
  },
  {
    timestampMs: 80000,
    durationMs: 6000,
    text: 'Signal CONFIRMED. 8 consecutive strides above threshold. Confidence: 0.72.',
    type: 'detection',
  },
  {
    timestampMs: 95000,
    durationMs: 8000,
    text: 'ACTIONABLE signal emitted. Score: 0.62, Confidence: 0.78. Markets affected: Points, PRA, Team Spread.',
    type: 'result',
  },
  {
    timestampMs: 110000,
    durationMs: 7000,
    text: 'SGA continues playing with consistent compensation pattern. Score stable at 0.55-0.65.',
    type: 'context',
  },
  {
    timestampMs: 130000,
    durationMs: 7000,
    text: 'GaitSignal detected this anomaly 47 seconds before broadcast mentioned SGA grimacing.',
    type: 'result',
  },
  {
    timestampMs: 142000,
    durationMs: 5000,
    text: 'SGA heads to bench. Broadcast reports "precautionary" rest.',
    type: 'result',
  },
];

const sgaAnomalyConfig: AnomalyConfig = {
  type: 'knee_compensation',
  onsetTimestampMs: 40000,
  rampDurationMs: 13000, // ~13 second sigmoid ramp
  peakSeverity: 0.85,
  affectedSide: 'right',
  affectedFeatures: [1, 2, 10, 11, 13, 14, 16, 17, 18, 19],
};

const sgaScenarioInfo: ScenarioInfo = {
  id: 'sga-knee',
  name: 'The SGA Knee',
  description:
    'Primary demo. Subtle right knee compensation after an awkward landing. Model catches it 47 seconds before broadcast.',
  playerProfile: SGA_PROFILE,
  durationMs: 150000, // 2.5 minutes (compressed from 3 min game time to ~90s at 1x speed with 30fps)
  anomalyConfig: sgaAnomalyConfig,
  narrativeOverlays: sgaNarratives,
};

// --- Scenario 2: "Jokic Fatigue Drift" ---

const jokicNarratives: NarrativeOverlay[] = [
  {
    timestampMs: 0,
    durationMs: 6000,
    text: 'Second night of a back-to-back. Jokic enters the 3rd quarter. Monitoring baseline.',
    type: 'context',
  },
  {
    timestampMs: 20000,
    durationMs: 5000,
    text: 'Stride length and ground contact beginning to drift. Fatigue pattern emerging.',
    type: 'context',
  },
  {
    timestampMs: 40000,
    durationMs: 6000,
    text: 'Not an injury — gradual biomechanical degradation. Trunk lean increasing, stride shortening.',
    type: 'detection',
  },
  {
    timestampMs: 60000,
    durationMs: 5000,
    text: 'ALERT state. Multiple features drifting simultaneously. Rate of change is subtle but sustained.',
    type: 'detection',
  },
  {
    timestampMs: 80000,
    durationMs: 6000,
    text: 'Signal CONFIRMED at lower confidence (0.55). This is a fatigue signal, not an injury signal.',
    type: 'detection',
  },
  {
    timestampMs: 95000,
    durationMs: 7000,
    text: 'ACTIONABLE for over/under adjustments. Historical data: fatigued Jokic averages 4.2 fewer points in Q4.',
    type: 'result',
  },
  {
    timestampMs: 110000,
    durationMs: 6000,
    text: 'GaitSignal detects any biomechanical shift — not just injuries. Fatigue is the most common actionable signal.',
    type: 'result',
  },
];

const jokicAnomalyConfig: AnomalyConfig = {
  type: 'fatigue_drift',
  onsetTimestampMs: 15000,
  rampDurationMs: 60000, // Very slow ramp — 60 seconds for fatigue
  peakSeverity: 0.65,
  affectedSide: 'bilateral',
  affectedFeatures: [0, 1, 9, 10, 12, 13, 15, 16, 18],
};

const jokicScenarioInfo: ScenarioInfo = {
  id: 'jokic-fatigue',
  name: 'Jokic Fatigue Drift',
  description:
    'Gradual fatigue-induced gait degradation on a back-to-back. Lower confidence signal but actionable for over/under.',
  playerProfile: JOKIC_PROFILE,
  durationMs: 120000, // 2 minutes
  anomalyConfig: jokicAnomalyConfig,
  narrativeOverlays: jokicNarratives,
};

// --- Scenario 3: "Tatum False Negative Avoidance" ---

const tatumNarratives: NarrativeOverlay[] = [
  {
    timestampMs: 0,
    durationMs: 5000,
    text: 'Tatum driving to the basket — normal gait signature. MONITORING.',
    type: 'context',
  },
  {
    timestampMs: 25000,
    durationMs: 5000,
    text: 'Hard foul on the drive. Tatum hits the floor.',
    type: 'context',
  },
  {
    timestampMs: 30000,
    durationMs: 5000,
    text: 'Visible limp for 3-4 steps. Knee asymmetry spikes to 14%. Model enters ALERT.',
    type: 'detection',
  },
  {
    timestampMs: 38000,
    durationMs: 5000,
    text: 'Gait normalizing. Asymmetry dropping back toward baseline. Only 3 strides above threshold.',
    type: 'detection',
  },
  {
    timestampMs: 48000,
    durationMs: 6000,
    text: 'Model returns to MONITORING. Transient event — confirmation threshold (5 strides) not met.',
    type: 'result',
  },
  {
    timestampMs: 60000,
    durationMs: 6000,
    text: 'Tatum fully normalized. The state machine prevented a false positive signal.',
    type: 'result',
  },
  {
    timestampMs: 75000,
    durationMs: 8000,
    text: 'This is why the confirmation requirement exists. A single-frame detector would have cried wolf.',
    type: 'result',
  },
];

const tatumScenarioInfo: ScenarioInfo = {
  id: 'tatum-false-negative',
  name: 'Tatum False Negative Avoidance',
  description:
    'Hard foul causes visible limp for 3-4 steps, then normal gait. Model correctly returns to MONITORING.',
  playerProfile: TATUM_PROFILE,
  durationMs: 90000, // 1.5 minutes
  anomalyConfig: null, // Handled by transient spike generator
  narrativeOverlays: tatumNarratives,
};

// --- Scenario registry ---

export const SCENARIOS: ScenarioInfo[] = [
  sgaScenarioInfo,
  jokicScenarioInfo,
  tatumScenarioInfo,
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

  if (scenario.id === 'tatum-false-negative') {
    // Special transient spike generation
    data = generateTransientSpikeFrames(
      scenario.playerProfile,
      scenario.durationMs,
      fps,
      28000, // Spike onset at 28s (hard foul)
      4000, // Spike lasts ~4 seconds (3-4 steps at 1.35 Hz)
      scenario.narrativeOverlays,
    );
  } else {
    data = generateScenarioFrames(
      scenario.playerProfile,
      scenario.durationMs,
      fps,
      scenario.anomalyConfig,
      scenario.narrativeOverlays,
    );
  }

  frameCache.set(cacheKey, data.frames);
  return data.frames;
}

export function clearFrameCache(): void {
  frameCache.clear();
}
