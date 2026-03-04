// ============================================================
// GaitAnalyzer — orchestrates gait analysis sub-modules
// Produces GaitMetricsSnapshot with the 20-element featureVector
// ============================================================

import type {
  FilteredKeypoints,
  GaitMetricsSnapshot,
  JointAngles,
  StrideData,
  SymmetryReport,
} from '../types/index';
import { computeJointAngles } from './JointAngleComputer';
import { StrideAnalyzer } from './StrideAnalyzer';
import { computeSymmetry } from './SymmetryScorer';

/** Maximum history frames to retain */
const MAX_HISTORY = 900; // 30fps * 30s

export class GaitAnalyzer {
  private strideAnalyzer: StrideAnalyzer;
  private history: GaitMetricsSnapshot[] = [];
  private jointAnglesHistory: JointAngles[] = [];
  private prevAngles: JointAngles | null = null;
  private prevPrevAngles: JointAngles | null = null;

  constructor() {
    this.strideAnalyzer = new StrideAnalyzer();
  }

  /**
   * Process a single frame of filtered keypoints and produce a GaitMetricsSnapshot.
   */
  processFrame(keypoints: FilteredKeypoints, timestampMs: number): GaitMetricsSnapshot {
    // 1. Compute joint angles
    const jointAngles = computeJointAngles(keypoints);
    this.jointAnglesHistory.push(jointAngles);
    if (this.jointAnglesHistory.length > MAX_HISTORY) {
      this.jointAnglesHistory.shift();
    }

    // 2. Feed stride analyzer
    const strideUpdate = this.strideAnalyzer.addFrame(keypoints, timestampMs);

    // 3. Get recent strides per side for symmetry
    const leftStrides = this.strideAnalyzer.getRecentSideStrides('left', 10);
    const rightStrides = this.strideAnalyzer.getRecentSideStrides('right', 10);

    // 4. Compute symmetry
    const symmetry = computeSymmetry(leftStrides, rightStrides, this.jointAnglesHistory);

    // 5. Compute composite scores
    const symmetryScore = computeSymmetryScore(symmetry);
    const fluidityScore = this.computeFluidityScore(jointAngles);
    const overallGaitScore = symmetryScore * 0.5 + fluidityScore * 0.5;

    // 6. Build the 20-element feature vector
    const featureVector = buildFeatureVector(
      jointAngles,
      symmetry,
      leftStrides,
      rightStrides,
    );

    // Track angles for fluidity (jerk) computation
    this.prevPrevAngles = this.prevAngles;
    this.prevAngles = jointAngles;

    const snapshot: GaitMetricsSnapshot = {
      timestampMs,
      frameIndex: keypoints.frameIndex,
      jointAngles,
      currentStride: strideUpdate,
      symmetry,
      overallGaitScore,
      symmetryScore,
      fluidityScore,
      featureVector,
    };

    this.history.push(snapshot);
    if (this.history.length > MAX_HISTORY) {
      this.history.shift();
    }

    return snapshot;
  }

  /** Return the last N snapshots from history */
  getHistory(frames: number): GaitMetricsSnapshot[] {
    return this.history.slice(-frames);
  }

  reset(): void {
    this.strideAnalyzer.reset();
    this.history = [];
    this.jointAnglesHistory = [];
    this.prevAngles = null;
    this.prevPrevAngles = null;
  }

  /**
   * Fluidity score based on jerk (rate of change of acceleration) in joint angles.
   * Lower jerk = smoother motion = higher score.
   * Scale: 0-100 where 100 = perfectly smooth.
   */
  private computeFluidityScore(current: JointAngles): number {
    if (!this.prevAngles || !this.prevPrevAngles) return 100;

    // Approximate second derivative (acceleration) for key angles
    const angleKeys: (keyof JointAngles)[] = [
      'leftKneeFlexion',
      'rightKneeFlexion',
      'leftHipFlexion',
      'rightHipFlexion',
    ];

    let totalJerk = 0;
    for (const key of angleKeys) {
      const v0 = this.prevPrevAngles[key];
      const v1 = this.prevAngles[key];
      const v2 = current[key];
      // Jerk = change in acceleration = second difference
      const accel1 = v1 - v0;
      const accel2 = v2 - v1;
      const jerk = Math.abs(accel2 - accel1);
      totalJerk += jerk;
    }

    // Average jerk per angle
    const avgJerk = totalJerk / angleKeys.length;

    // Map to 0-100 scale. Jerk of 0 = 100, jerk of 20+ = 0
    return Math.max(0, Math.min(100, 100 - avgJerk * 5));
  }
}

/**
 * Compute symmetry composite score (0-100 scale, 100 = perfect symmetry).
 */
function computeSymmetryScore(sym: SymmetryReport): number {
  // Weight the most clinically relevant asymmetries more heavily
  const weighted =
    sym.strideLengthAsymmetry * 0.2 +
    sym.strideTimeAsymmetry * 0.2 +
    sym.kneeFlexionAsymmetry * 0.25 +
    sym.groundContactAsymmetry * 0.15 +
    sym.hipFlexionAsymmetry * 0.1 +
    sym.ankleAsymmetry * 0.1;

  // 0% asymmetry = 100 score, 20%+ asymmetry = 0 score
  return Math.max(0, Math.min(100, 100 - weighted * 5));
}

/**
 * Build the 20-element feature vector. Order defined in src/types/index.ts.
 *
 * For stride-level features, uses the most recent stride per side.
 * Returns zeros for stride features if no strides have been detected yet.
 */
function buildFeatureVector(
  angles: JointAngles,
  symmetry: SymmetryReport,
  leftStrides: StrideData[],
  rightStrides: StrideData[],
): number[] {
  const lastLeft = leftStrides.length > 0 ? leftStrides[leftStrides.length - 1] : null;
  const lastRight = rightStrides.length > 0 ? rightStrides[rightStrides.length - 1] : null;

  return [
    // 0: Left knee flexion peak (deg)
    lastLeft?.peakKneeFlexion ?? angles.leftKneeFlexion,
    // 1: Right knee flexion peak (deg)
    lastRight?.peakKneeFlexion ?? angles.rightKneeFlexion,
    // 2: Knee flexion asymmetry (%)
    symmetry.kneeFlexionAsymmetry,
    // 3: Left hip flexion peak (deg)
    lastLeft?.peakHipFlexion ?? angles.leftHipFlexion,
    // 4: Right hip flexion peak (deg)
    lastRight?.peakHipFlexion ?? angles.rightHipFlexion,
    // 5: Hip flexion asymmetry (%)
    symmetry.hipFlexionAsymmetry,
    // 6: Left ankle dorsiflexion peak (deg)
    lastLeft?.peakAnkleDorsiflexion ?? angles.leftAnkleDorsiflexion,
    // 7: Right ankle dorsiflexion peak (deg)
    lastRight?.peakAnkleDorsiflexion ?? angles.rightAnkleDorsiflexion,
    // 8: Ankle asymmetry (%)
    symmetry.ankleAsymmetry,
    // 9: Stride length left (normalized)
    lastLeft?.strideLength ?? 0,
    // 10: Stride length right (normalized)
    lastRight?.strideLength ?? 0,
    // 11: Stride length asymmetry (%)
    symmetry.strideLengthAsymmetry,
    // 12: Stride time left (ms)
    lastLeft?.strideTimeMs ?? 0,
    // 13: Stride time right (ms)
    lastRight?.strideTimeMs ?? 0,
    // 14: Stride time asymmetry (%)
    symmetry.strideTimeAsymmetry,
    // 15: Ground contact time left (ms)
    lastLeft?.groundContactTimeMs ?? 0,
    // 16: Ground contact time right (ms)
    lastRight?.groundContactTimeMs ?? 0,
    // 17: Ground contact asymmetry (%)
    symmetry.groundContactAsymmetry,
    // 18: Trunk lean (deg)
    angles.trunkLean,
    // 19: Lateral trunk tilt (deg)
    angles.lateralTrunkTilt,
  ];
}
