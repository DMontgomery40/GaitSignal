// ============================================================
// SymmetryScorer — bilateral gait symmetry metrics
// ============================================================

import type { JointAngles, StrideData, SymmetryReport } from '../types/index';

/** Number of recent stride cycles used for rolling symmetry averages */
const ROLLING_WINDOW = 10;

/**
 * Compute asymmetry as a percentage: |L - R| / avg(L, R) * 100
 * Returns 0 if both values are 0 to avoid division by zero.
 */
function asymmetryPercent(left: number, right: number): number {
  const avg = (left + right) / 2;
  if (avg === 0) return 0;
  return (Math.abs(left - right) / avg) * 100;
}

/**
 * Compute bilateral symmetry metrics from recent left/right strides
 * and accumulated joint angle data.
 *
 * All asymmetry values are percentages except knee/hip/ankle which use
 * the definitions matching the SymmetryReport interface.
 */
export function computeSymmetry(
  leftStrides: StrideData[],
  rightStrides: StrideData[],
  jointAnglesHistory: JointAngles[],
): SymmetryReport {
  // Use last ROLLING_WINDOW strides from each side
  const recentLeft = leftStrides.slice(-ROLLING_WINDOW);
  const recentRight = rightStrides.slice(-ROLLING_WINDOW);

  // Stride length asymmetry
  const avgLeftStrideLen = mean(recentLeft.map(s => s.strideLength));
  const avgRightStrideLen = mean(recentRight.map(s => s.strideLength));
  const strideLengthAsymmetry = asymmetryPercent(avgLeftStrideLen, avgRightStrideLen);

  // Stride time asymmetry
  const avgLeftStrideTime = mean(recentLeft.map(s => s.strideTimeMs));
  const avgRightStrideTime = mean(recentRight.map(s => s.strideTimeMs));
  const strideTimeAsymmetry = asymmetryPercent(avgLeftStrideTime, avgRightStrideTime);

  // Knee flexion asymmetry (degrees difference from recent angles)
  const recentAngles = jointAnglesHistory.slice(-30); // ~1 second at 30fps
  const avgLeftKnee = mean(recentAngles.map(a => a.leftKneeFlexion));
  const avgRightKnee = mean(recentAngles.map(a => a.rightKneeFlexion));
  const kneeFlexionAsymmetry = asymmetryPercent(avgLeftKnee, avgRightKnee);

  // Hip flexion asymmetry
  const avgLeftHip = mean(recentAngles.map(a => a.leftHipFlexion));
  const avgRightHip = mean(recentAngles.map(a => a.rightHipFlexion));
  const hipFlexionAsymmetry = asymmetryPercent(avgLeftHip, avgRightHip);

  // Ankle asymmetry
  const avgLeftAnkle = mean(recentAngles.map(a => a.leftAnkleDorsiflexion));
  const avgRightAnkle = mean(recentAngles.map(a => a.rightAnkleDorsiflexion));
  const ankleAsymmetry = asymmetryPercent(avgLeftAnkle, avgRightAnkle);

  // Ground contact asymmetry
  const avgLeftGC = mean(recentLeft.map(s => s.groundContactTimeMs));
  const avgRightGC = mean(recentRight.map(s => s.groundContactTimeMs));
  const groundContactAsymmetry = asymmetryPercent(avgLeftGC, avgRightGC);

  return {
    strideLengthAsymmetry,
    strideTimeAsymmetry,
    kneeFlexionAsymmetry,
    hipFlexionAsymmetry,
    ankleAsymmetry,
    groundContactAsymmetry,
  };
}

/** Arithmetic mean, returns 0 for empty arrays */
function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}
