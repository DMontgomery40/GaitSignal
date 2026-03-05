// ============================================================
// SyntheticGaitData — Generate biomechanically plausible gait data
// ============================================================

import type {
  PlayerProfileJSON,
  AnomalyConfig,
  FilteredKeypoints,
  GaitMetricsSnapshot,
  AnomalyResult,
  SignalState,
  SignalTimelineEntry,
  DemoFrame,
  JointAngles,
  StrideUpdate,
  SymmetryReport,
  FeatureContribution,
  NarrativeOverlay,
  Point3D,
} from '../types/index.ts';
import { FEATURE_NAMES } from '../types/index.ts';

// --- Random helpers ---

type Rng = () => number;

function hashSeed(input: string): number {
  let hash = 2166136261;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function createSeededRng(seed: number): Rng {
  let t = seed >>> 0;
  return () => {
    t += 0x6D2B79F5;
    let x = Math.imul(t ^ (t >>> 15), 1 | t);
    x ^= x + Math.imul(x ^ (x >>> 7), 61 | x);
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}

function gaussianRandom(mean: number, stdDev: number, rng: Rng): number {
  // Box-Muller transform
  const u1 = rng();
  const u2 = rng();
  const z = Math.sqrt(-2 * Math.log(u1 || 1e-10)) * Math.cos(2 * Math.PI * u2);
  return mean + z * stdDev;
}

function sigmoid(t: number): number {
  return 1 / (1 + Math.exp(-t));
}

/** Maps t in [0, rampDurationMs] to [0, 1] via smooth sigmoid */
function sigmoidRamp(elapsedMs: number, rampDurationMs: number): number {
  // Map elapsed to roughly [-6, 6] so sigmoid covers full 0..1
  const normalized = (elapsedMs / rampDurationMs) * 12 - 6;
  return sigmoid(normalized);
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

// --- Feature vector generation ---

function generateBaselineFeatureVector(
  profile: PlayerProfileJSON,
  noiseScale: number = 1.0,
  rng: Rng,
): number[] {
  const { baselineMean, baselineStdDev } = profile;
  return baselineMean.map((mean, i) => {
    const noise = gaussianRandom(0, baselineStdDev[i] * 0.18 * noiseScale, rng);
    return mean + noise;
  });
}

/**
 * Apply anomaly perturbations to a feature vector.
 * `severity` ranges from 0 (no anomaly) to peakSeverity.
 */
function applyAnomaly(
  baseFeatures: number[],
  config: AnomalyConfig,
  severity: number,
  profile: PlayerProfileJSON,
): number[] {
  const features = [...baseFeatures];
  const { baselineStdDev } = profile;

  switch (config.type) {
    case 'knee_compensation': {
      // Right knee flexion decreases (protecting the knee)
      // Stride length asymmetry increases
      // Right ground contact time increases
      const side = config.affectedSide === 'left' ? 0 : 1;
      const otherSide = 1 - side;

      // Affected knee flexion decreases
      features[side] -= severity * baselineStdDev[side] * 2.5;
      // Other knee compensates slightly
      features[otherSide] += severity * baselineStdDev[otherSide] * 0.4;
      // Knee asymmetry increases
      features[2] += severity * 5.5;

      // Stride length on affected side shortens
      features[9 + side] -= severity * baselineStdDev[9 + side] * 1.8;
      // Stride length asymmetry increases
      features[11] += severity * 4.2;

      // Stride time on affected side increases slightly
      features[12 + side] += severity * baselineStdDev[12 + side] * 1.2;
      features[14] += severity * 3.0;

      // Ground contact time on affected side increases
      features[15 + side] += severity * baselineStdDev[15 + side] * 2.0;
      features[17] += severity * 4.8;

      // Subtle trunk lean compensation
      features[18] += severity * 1.8;
      features[19] += severity * 1.2;
      break;
    }

    case 'ankle_guarding': {
      const side = config.affectedSide === 'left' ? 0 : 1;

      // Ankle dorsiflexion decreases on affected side
      features[6 + side] -= severity * baselineStdDev[6 + side] * 2.8;
      features[8] += severity * 5.0;

      // Stride length shortens bilaterally (cautious steps)
      features[9] -= severity * baselineStdDev[9] * 1.2;
      features[10] -= severity * baselineStdDev[10] * 1.0;

      // Stride time decreases (more frequent, shorter steps)
      features[12] -= severity * baselineStdDev[12] * 0.8;
      features[13] -= severity * baselineStdDev[13] * 0.6;

      // Ground contact time increases on affected side
      features[15 + side] += severity * baselineStdDev[15 + side] * 1.6;
      features[17] += severity * 3.5;
      break;
    }

    case 'hip_compensation': {
      const side = config.affectedSide === 'left' ? 0 : 1;

      // Hip flexion decreases on affected side
      features[3 + side] -= severity * baselineStdDev[3 + side] * 2.2;
      features[5] += severity * 4.5;

      // Lateral trunk tilt increases (compensation)
      features[19] += severity * 3.0;
      features[18] += severity * 2.0;

      // Stride length asymmetry
      features[9 + side] -= severity * baselineStdDev[9 + side] * 1.5;
      features[11] += severity * 3.8;
      break;
    }

    case 'fatigue_drift': {
      // Gradual bilateral degradation
      // Stride length shortens
      features[9] -= severity * baselineStdDev[9] * 1.4;
      features[10] -= severity * baselineStdDev[10] * 1.3;

      // Ground contact time increases
      features[15] += severity * baselineStdDev[15] * 1.5;
      features[16] += severity * baselineStdDev[16] * 1.4;

      // Trunk lean increases (fatigue posture)
      features[18] += severity * 2.5;

      // Stride time increases (slower cadence)
      features[12] += severity * baselineStdDev[12] * 0.8;
      features[13] += severity * baselineStdDev[13] * 0.7;

      // Knee flexion decreases slightly (less explosive)
      features[0] -= severity * baselineStdDev[0] * 0.6;
      features[1] -= severity * baselineStdDev[1] * 0.5;

      // Slight asymmetry creeps in
      features[2] += severity * 1.2;
      features[11] += severity * 1.5;
      features[17] += severity * 1.8;
      break;
    }
  }

  // Ensure asymmetries are non-negative
  for (const idx of [2, 5, 8, 11, 14, 17]) {
    features[idx] = Math.max(0, features[idx]);
  }

  return features;
}

// --- Keypoint generation from feature vector ---

/** Generate synthetic FilteredKeypoints from a feature vector */
function featureVectorToKeypoints(
  features: number[],
  frameIndex: number,
  timestampMs: number,
  stridePhase: number, // 0..1 within stride cycle
  rng: Rng,
): FilteredKeypoints {
  // Base body proportions (normalized coordinates, 0..1 range)
  const hipYBase = 0.52;
  const shoulderYBase = 0.30;
  const kneeYBase = 0.70;
  const ankleYBase = 0.88;
  const footYBase = 0.92;
  const heelYBase = 0.905;

  // Body center and widths
  const cx = 0.5;
  const hipWidth = 0.08;
  const shoulderWidth = 0.125;

  // Stride cycle modulation
  const phase = stridePhase * Math.PI * 2;
  const swing = Math.sin(phase); // left-forward when positive
  const swingOpp = -swing;

  // Slight up/down COM movement for a running cadence
  const pelvisBob = Math.abs(Math.sin(phase * 2)) * 0.007;

  // Modulate stride amplitude by current stride-length features
  const strideAmplitude =
    0.03 + clamp(((features[9] + features[10]) / 2 - 1.15) * 0.05, -0.008, 0.018);

  const leftStepX = swing * strideAmplitude;
  const rightStepX = swingOpp * strideAmplitude;
  const leftSwingLift = Math.max(0, swing) * 0.04;
  const rightSwingLift = Math.max(0, swingOpp) * 0.04;

  // Knee flexion affects knee vertical lift
  const lKneeFlexRad = (features[0] * Math.PI) / 180;
  const rKneeFlexRad = (features[1] * Math.PI) / 180;
  const lKneeYOffset = Math.sin(lKneeFlexRad) * 0.018 * (0.5 + Math.abs(swing));
  const rKneeYOffset = Math.sin(rKneeFlexRad) * 0.018 * (0.5 + Math.abs(swingOpp));

  // Trunk lean and tilt offsets
  const trunkLeanRad = (features[18] * Math.PI) / 180;
  const trunkTiltRad = (features[19] * Math.PI) / 180;
  const shoulderXOffset = Math.sin(trunkLeanRad) * 0.015;
  const shoulderTiltOffset = Math.sin(trunkTiltRad) * 0.012;

  const leftHipX = cx - hipWidth + swing * 0.004;
  const rightHipX = cx + hipWidth + swingOpp * 0.004;
  const hipY = hipYBase + pelvisBob;

  const leftAnkleX = leftHipX + leftStepX * 1.45;
  const rightAnkleX = rightHipX + rightStepX * 1.45;
  const leftAnkleY = ankleYBase - leftSwingLift * 0.75;
  const rightAnkleY = ankleYBase - rightSwingLift * 0.75;

  const leftKneeX = (leftHipX + leftAnkleX) / 2 + leftStepX * 0.22;
  const rightKneeX = (rightHipX + rightAnkleX) / 2 + rightStepX * 0.22;
  const leftKneeY = kneeYBase - lKneeYOffset - leftSwingLift * 0.45 + pelvisBob * 0.3;
  const rightKneeY = kneeYBase - rKneeYOffset - rightSwingLift * 0.45 + pelvisBob * 0.3;

  const shoulderY = shoulderYBase + pelvisBob * 0.35;

  const p = (x: number, y: number, z: number = 0): Point3D => ({ x, y, z });

  return {
    timestampMs,
    frameIndex,
    leftHip: p(leftHipX, hipY, 0),
    rightHip: p(rightHipX, hipY, 0),
    leftKnee: p(leftKneeX, leftKneeY, 0),
    rightKnee: p(rightKneeX, rightKneeY, 0),
    leftAnkle: p(leftAnkleX, leftAnkleY, 0),
    rightAnkle: p(rightAnkleX, rightAnkleY, 0),
    leftHeel: p(leftAnkleX - 0.015, heelYBase - leftSwingLift * 0.8, 0),
    rightHeel: p(rightAnkleX - 0.015, heelYBase - rightSwingLift * 0.8, 0),
    leftFootIndex: p(leftAnkleX + 0.018 + leftStepX * 0.18, footYBase - leftSwingLift, 0),
    rightFootIndex: p(rightAnkleX + 0.018 + rightStepX * 0.18, footYBase - rightSwingLift, 0),
    leftShoulder: p(
      cx - shoulderWidth + shoulderXOffset - shoulderTiltOffset,
      shoulderY,
      0,
    ),
    rightShoulder: p(
      cx + shoulderWidth + shoulderXOffset + shoulderTiltOffset,
      shoulderY,
      0,
    ),
    confidence: 0.92 + rng() * 0.06,
  };
}

// --- Gait metrics snapshot from feature vector ---

function featureVectorToGaitMetrics(
  features: number[],
  frameIndex: number,
  timestampMs: number,
  strideCount: number,
  hasNewStride: boolean,
): GaitMetricsSnapshot {
  const jointAngles: JointAngles = {
    leftKneeFlexion: features[0],
    rightKneeFlexion: features[1],
    leftHipFlexion: features[3],
    rightHipFlexion: features[4],
    leftAnkleDorsiflexion: features[6],
    rightAnkleDorsiflexion: features[7],
    trunkLean: features[18],
    lateralTrunkTilt: features[19],
  };

  const symmetry: SymmetryReport = {
    strideLengthAsymmetry: features[11],
    strideTimeAsymmetry: features[14],
    kneeFlexionAsymmetry: features[2],
    hipFlexionAsymmetry: features[5],
    ankleAsymmetry: features[8],
    groundContactAsymmetry: features[17],
  };

  // Compute composite scores (100 = perfect)
  const avgAsymmetry =
    (features[2] + features[5] + features[8] + features[11] + features[14] + features[17]) / 6;
  const symmetryScore = clamp(100 - avgAsymmetry * 8, 0, 100);
  const overallGaitScore = clamp(100 - avgAsymmetry * 6, 0, 100);
  const fluidityScore = clamp(100 - (Math.abs(features[18] - 5) + Math.abs(features[19])) * 3, 0, 100);

  const currentStride: StrideUpdate | null = hasNewStride
    ? {
        newStride: {
          side: strideCount % 2 === 0 ? 'left' : 'right',
          startTimestampMs: timestampMs - features[12],
          endTimestampMs: timestampMs,
          strideLength: strideCount % 2 === 0 ? features[9] : features[10],
          strideTimeMs: strideCount % 2 === 0 ? features[12] : features[13],
          groundContactTimeMs: strideCount % 2 === 0 ? features[15] : features[16],
          flightTimeMs:
            (strideCount % 2 === 0 ? features[12] : features[13]) -
            (strideCount % 2 === 0 ? features[15] : features[16]),
          peakKneeFlexion: strideCount % 2 === 0 ? features[0] : features[1],
          peakHipFlexion: strideCount % 2 === 0 ? features[3] : features[4],
          peakAnkleDorsiflexion: strideCount % 2 === 0 ? features[6] : features[7],
        },
        strideCount,
        currentCadence: 1000 / ((features[12] + features[13]) / 2),
      }
    : null;

  return {
    timestampMs,
    frameIndex,
    jointAngles,
    currentStride,
    symmetry,
    overallGaitScore,
    symmetryScore,
    fluidityScore,
    featureVector: features,
  };
}

// --- Anomaly result from feature vector + baseline ---

function computeAnomalyResult(
  features: number[],
  profile: PlayerProfileJSON,
  timestampMs: number,
  recentFeatures: number[][],
): AnomalyResult {
  const { baselineMean, baselineStdDev } = profile;

  // Z-scores against baseline
  const zScores = features.map((v, i) =>
    baselineStdDev[i] > 0 ? (v - baselineMean[i]) / baselineStdDev[i] : 0,
  );

  // Rate of change: compare to recent history
  const rateOfChangeScores: number[] = new Array(20).fill(0);
  if (recentFeatures.length >= 5) {
    const older = recentFeatures[recentFeatures.length - 5];
    for (let i = 0; i < 20; i++) {
      const change = Math.abs(features[i] - older[i]);
      const expectedChange = baselineStdDev[i] * 0.5;
      rateOfChangeScores[i] = expectedChange > 0 ? change / expectedChange : 0;
    }
  }

  // Contributing features sorted by absolute z-score
  const contributions: FeatureContribution[] = zScores
    .map((z, i) => ({
      featureName: FEATURE_NAMES[i],
      featureIndex: i,
      currentValue: features[i],
      baselineValue: baselineMean[i],
      zScore: z,
      rateOfChange: rateOfChangeScores[i],
      contribution: Math.abs(z) * 0.6 + rateOfChangeScores[i] * 0.4,
    }))
    .sort((a, b) => b.contribution - a.contribution);

  // Composite scores
  const topN = contributions.slice(0, 6);
  const baselineDeviationScore = clamp(
    topN.reduce((sum, c) => sum + Math.abs(c.zScore), 0) / (topN.length * 3),
    0,
    1,
  );
  const rateOfChangeScore = clamp(
    topN.reduce((sum, c) => sum + c.rateOfChange, 0) / (topN.length * 4),
    0,
    1,
  );

  // Short-term deviation: compare to last 10 frames
  let shortTermDeviationScore = 0;
  if (recentFeatures.length >= 10) {
    const recentSlice = recentFeatures.slice(-10);
    const recentMean = new Array(20).fill(0);
    for (const rf of recentSlice) {
      for (let i = 0; i < 20; i++) recentMean[i] += rf[i] / recentSlice.length;
    }
    const shortTermDevs = features.map((v, i) => Math.abs(v - recentMean[i]) / (baselineStdDev[i] || 1));
    shortTermDeviationScore = clamp(
      shortTermDevs.reduce((s, d) => s + d, 0) / (20 * 2),
      0,
      1,
    );
  }

  // Composite: weighted combination
  const rawComposite =
    baselineDeviationScore * 0.4 + rateOfChangeScore * 0.35 + shortTermDeviationScore * 0.25;
  const compositeScore = clamp(rawComposite * 1.35, 0, 1);

  // Confidence: increases with number of correlated features above threshold
  const featuresAboveThreshold = contributions.filter((c) => Math.abs(c.zScore) > 1.5).length;
  const confidence = clamp(
    0.22 + compositeScore * 0.88 + Math.min(featuresAboveThreshold, 4) * 0.015,
    0,
    1,
  );

  const severity =
    compositeScore >= 0.7
      ? 'critical' as const
      : compositeScore >= 0.5
        ? 'significant' as const
        : compositeScore >= 0.3
          ? 'elevated' as const
          : 'normal' as const;

  return {
    timestampMs,
    compositeScore,
    severity,
    confidence,
    rateOfChangeScore,
    baselineDeviationScore,
    shortTermDeviationScore,
    contributingFeatures: contributions.slice(0, 5),
  };
}

// --- Signal state machine ---

function updateSignalState(
  prev: SignalState,
  anomaly: AnomalyResult,
  isNewStride: boolean,
): SignalState {
  const state = { ...prev };
  state.lastAnomalyResult = anomaly;

  if (!isNewStride) {
    return state;
  }

  if (anomaly.compositeScore >= 0.32) {
    state.consecutiveStridesAboveThreshold += 1;
  } else {
    state.consecutiveStridesAboveThreshold = Math.max(0, state.consecutiveStridesAboveThreshold - 1);
  }

  // State transitions
  if (anomaly.compositeScore < 0.18 && state.consecutiveStridesAboveThreshold <= 0) {
    state.current = 'monitoring';
    state.enteredAt = anomaly.timestampMs;
  } else if (
    state.current === 'monitoring' &&
    anomaly.compositeScore >= 0.32 &&
    state.consecutiveStridesAboveThreshold >= 2
  ) {
    state.current = 'alert';
    state.enteredAt = anomaly.timestampMs;
  } else if (
    state.current === 'alert' &&
    state.consecutiveStridesAboveThreshold >= 5 &&
    anomaly.compositeScore >= 0.34 &&
    anomaly.confidence >= 0.5
  ) {
    state.current = 'confirmed';
    state.enteredAt = anomaly.timestampMs;
  } else if (
    state.current === 'confirmed' &&
    (
      (anomaly.compositeScore >= 0.5 && anomaly.confidence >= 0.7) ||
      anomaly.compositeScore >= 0.65 ||
      (state.consecutiveStridesAboveThreshold >= 12 &&
        anomaly.compositeScore >= 0.35 &&
        anomaly.confidence >= 0.5)
    )
  ) {
    state.current = 'actionable';
    state.enteredAt = anomaly.timestampMs;
  } else if (
    (state.current === 'alert' || state.current === 'confirmed' || state.current === 'actionable') &&
    anomaly.compositeScore < 0.2 &&
    state.consecutiveStridesAboveThreshold <= 0
  ) {
    state.current = 'monitoring';
    state.enteredAt = anomaly.timestampMs;
    state.consecutiveStridesAboveThreshold = 0;
  }

  return state;
}

function applySignalTimeline(
  prev: SignalState,
  anomaly: AnomalyResult,
  timestampMs: number,
  signalTimeline: SignalTimelineEntry[] | null,
): SignalState {
  if (!signalTimeline || signalTimeline.length === 0) {
    return prev;
  }

  let active = signalTimeline[0];
  for (const entry of signalTimeline) {
    if (timestampMs >= entry.startTimestampMs) {
      active = entry;
    } else {
      break;
    }
  }

  const next: SignalState = {
    ...prev,
    current: active.state,
    enteredAt: active.startTimestampMs,
    lastAnomalyResult: anomaly,
  };

  const elapsed = Math.max(0, timestampMs - active.startTimestampMs);
  if (active.state === 'monitoring') {
    next.consecutiveStridesAboveThreshold = 0;
  } else if (active.state === 'alert') {
    next.consecutiveStridesAboveThreshold = Math.min(4, 1 + Math.floor(elapsed / 1200));
  } else if (active.state === 'confirmed') {
    next.consecutiveStridesAboveThreshold = Math.min(8, 5 + Math.floor(elapsed / 1500));
  } else {
    next.consecutiveStridesAboveThreshold = 8 + Math.floor(elapsed / 1200);
  }

  return next;
}

function smoothFeatureVector(next: number[], prev: number[], alpha: number): number[] {
  return next.map((value, i) => prev[i] + (value - prev[i]) * alpha);
}

// --- Main generation functions ---

export interface GeneratedScenarioData {
  frames: DemoFrame[];
  totalDurationMs: number;
}

export function generateScenarioFrames(
  profile: PlayerProfileJSON,
  durationMs: number,
  fps: number,
  anomalyConfig: AnomalyConfig | null,
  narrativeOverlays: NarrativeOverlay[],
  signalTimeline: SignalTimelineEntry[] | null = null,
): GeneratedScenarioData {
  const totalFrames = Math.floor((durationMs / 1000) * fps);
  const frameDurationMs = 1000 / fps;

  // Basketball running: stride at 1.2-1.5 Hz
  const strideFrequency = 1.35; // Hz
  const strideFrames = Math.round(fps / strideFrequency);

  const frames: DemoFrame[] = [];
  const recentFeatures: number[][] = [];
  const rng = createSeededRng(hashSeed(`${profile.player.name}-${durationMs}-${fps}-${anomalyConfig?.type ?? 'none'}`));
  let prevFeatures = [...profile.baselineMean];

  let signalState: SignalState = {
    current: 'monitoring',
    enteredAt: 0,
    consecutiveStridesAboveThreshold: 0,
    lastAnomalyResult: null,
  };

  let strideCount = 0;

  for (let i = 0; i < totalFrames; i++) {
    const timestampMs = i * frameDurationMs;
    const stridePhase = (i % strideFrames) / strideFrames;
    const isNewStride = i % strideFrames === 0 && i > 0;

    if (isNewStride) strideCount++;

    // Generate baseline features with natural noise
    let features = generateBaselineFeatureVector(profile, 1.0, rng);

    // Apply anomaly if configured and past onset time
    if (anomalyConfig && timestampMs >= anomalyConfig.onsetTimestampMs) {
      const elapsed = timestampMs - anomalyConfig.onsetTimestampMs;
      const ramp = sigmoidRamp(elapsed, anomalyConfig.rampDurationMs);
      const severity = ramp * anomalyConfig.peakSeverity;
      features = applyAnomaly(features, anomalyConfig, severity, profile);
    }

    features = smoothFeatureVector(features, prevFeatures, 0.22);
    prevFeatures = features;

    // Store for rate-of-change computation
    recentFeatures.push(features);
    if (recentFeatures.length > 30) recentFeatures.shift();

    // Generate derived data
    const keypoints = featureVectorToKeypoints(features, i, timestampMs, stridePhase, rng);
    const gaitMetrics = featureVectorToGaitMetrics(
      features,
      i,
      timestampMs,
      strideCount,
      isNewStride,
    );
    const anomalyResult = computeAnomalyResult(features, profile, timestampMs, recentFeatures);
    signalState = updateSignalState(signalState, anomalyResult, isNewStride);
    signalState = applySignalTimeline(signalState, anomalyResult, timestampMs, signalTimeline);

    // Find active narrative overlay
    const activeOverlay =
      narrativeOverlays.find(
        (o) =>
          timestampMs >= o.timestampMs &&
          timestampMs < o.timestampMs + o.durationMs,
      ) ?? null;

    frames.push({
      timestampMs,
      frameIndex: i,
      keypoints,
      gaitMetrics,
      anomalyResult,
      signalState: { ...signalState },
      narrativeOverlay: activeOverlay,
    });
  }

  return { frames, totalDurationMs: durationMs };
}

/**
 * Generate a transient spike sequence for the Tatum scenario.
 * Normal -> spike for a few steps -> back to normal.
 */
export function generateTransientSpikeFrames(
  profile: PlayerProfileJSON,
  durationMs: number,
  fps: number,
  spikeOnsetMs: number,
  spikeDurationMs: number,
  narrativeOverlays: NarrativeOverlay[],
  signalTimeline: SignalTimelineEntry[] | null = null,
): GeneratedScenarioData {
  const totalFrames = Math.floor((durationMs / 1000) * fps);
  const frameDurationMs = 1000 / fps;
  const strideFrequency = 1.35;
  const strideFrames = Math.round(fps / strideFrequency);

  const frames: DemoFrame[] = [];
  const recentFeatures: number[][] = [];
  const rng = createSeededRng(hashSeed(`${profile.player.name}-${durationMs}-${fps}-transient`));
  let prevFeatures = [...profile.baselineMean];

  let signalState: SignalState = {
    current: 'monitoring',
    enteredAt: 0,
    consecutiveStridesAboveThreshold: 0,
    lastAnomalyResult: null,
  };

  let strideCount = 0;

  for (let i = 0; i < totalFrames; i++) {
    const timestampMs = i * frameDurationMs;
    const stridePhase = (i % strideFrames) / strideFrames;
    const isNewStride = i % strideFrames === 0 && i > 0;
    if (isNewStride) strideCount++;

    let features = generateBaselineFeatureVector(profile, 1.0, rng);

    // Transient spike: sharp onset, sharp decay
    if (
      timestampMs >= spikeOnsetMs &&
      timestampMs < spikeOnsetMs + spikeDurationMs
    ) {
      const spikeElapsed = timestampMs - spikeOnsetMs;
      // Ramp up quickly in first 500ms, hold, then ramp down in last 1000ms
      let spikeSeverity: number;
      if (spikeElapsed < 500) {
        spikeSeverity = spikeElapsed / 500;
      } else if (spikeElapsed > spikeDurationMs - 1000) {
        spikeSeverity = (spikeDurationMs - spikeElapsed) / 1000;
      } else {
        spikeSeverity = 1.0;
      }
      spikeSeverity = clamp(spikeSeverity, 0, 1);

      // Heavy limp effect
      const side = 0; // left side affected
      features[side] -= spikeSeverity * profile.baselineStdDev[side] * 4;
      features[2] += spikeSeverity * 12;
      features[9] -= spikeSeverity * profile.baselineStdDev[9] * 3;
      features[11] += spikeSeverity * 10;
      features[15] += spikeSeverity * profile.baselineStdDev[15] * 3;
      features[17] += spikeSeverity * 8;
      features[18] += spikeSeverity * 4;
    }

    features = smoothFeatureVector(features, prevFeatures, 0.24);
    prevFeatures = features;

    recentFeatures.push(features);
    if (recentFeatures.length > 30) recentFeatures.shift();

    const keypoints = featureVectorToKeypoints(features, i, timestampMs, stridePhase, rng);
    const gaitMetrics = featureVectorToGaitMetrics(
      features,
      i,
      timestampMs,
      strideCount,
      isNewStride,
    );
    const anomalyResult = computeAnomalyResult(features, profile, timestampMs, recentFeatures);
    signalState = updateSignalState(signalState, anomalyResult, isNewStride);
    signalState = applySignalTimeline(signalState, anomalyResult, timestampMs, signalTimeline);

    const activeOverlay =
      narrativeOverlays.find(
        (o) =>
          timestampMs >= o.timestampMs &&
          timestampMs < o.timestampMs + o.durationMs,
      ) ?? null;

    frames.push({
      timestampMs,
      frameIndex: i,
      keypoints,
      gaitMetrics,
      anomalyResult,
      signalState: { ...signalState },
      narrativeOverlay: activeOverlay,
    });
  }

  return { frames, totalDurationMs: durationMs };
}
