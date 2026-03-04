// ============================================================
// StrideAnalyzer — detect stride cycles and compute stride metrics
// ============================================================

import type { FilteredKeypoints, StrideData, StrideUpdate } from '../types/index';
import { computeJointAngles } from './JointAngleComputer';

/** Internal per-side state for stride detection */
interface SideState {
  side: 'left' | 'right';
  /** Rolling buffer of heel Y values for peak detection */
  heelYBuffer: { y: number; timestampMs: number; frameIndex: number }[];
  /** Last detected heel strike timestamp */
  lastHeelStrikeMs: number | null;
  /** Last detected heel strike heel position */
  lastHeelStrikePos: { x: number; z: number } | null;
  /** Ground contact start timestamp */
  groundContactStartMs: number | null;
  /** Whether foot is currently on ground */
  isGrounded: boolean;
  /** Completed strides (rolling buffer, max 20) */
  strides: StrideData[];
  /** Peak angles accumulated during current stride */
  peakKneeFlexion: number;
  peakHipFlexion: number;
  peakAnkleDorsiflexion: number;
  /** Total stride count */
  strideCount: number;
}

/** Minimum frames between heel strikes at 30fps (~333ms) */
const MIN_PEAK_DISTANCE = 10;
/** Maximum strides to keep in rolling buffer per side */
const MAX_STRIDE_BUFFER = 20;
/** Y-threshold fraction of recent range to detect ground contact */
const GROUND_CONTACT_FRACTION = 0.2;

export class StrideAnalyzer {
  private left: SideState;
  private right: SideState;
  private frameCount = 0;

  constructor() {
    this.left = this.createSideState('left');
    this.right = this.createSideState('right');
  }

  private createSideState(side: 'left' | 'right'): SideState {
    return {
      side,
      heelYBuffer: [],
      lastHeelStrikeMs: null,
      lastHeelStrikePos: null,
      groundContactStartMs: null,
      isGrounded: false,
      strides: [],
      peakKneeFlexion: 0,
      peakHipFlexion: 0,
      peakAnkleDorsiflexion: 0,
      strideCount: 0,
    };
  }

  /**
   * Process a frame and return a StrideUpdate if a new stride was completed.
   */
  addFrame(keypoints: FilteredKeypoints, timestampMs: number): StrideUpdate | null {
    this.frameCount++;
    const angles = computeJointAngles(keypoints);

    const leftResult = this.processSide(
      this.left,
      keypoints.leftHeel,
      keypoints.leftFootIndex,
      angles.leftKneeFlexion,
      angles.leftHipFlexion,
      angles.leftAnkleDorsiflexion,
      timestampMs,
    );

    const rightResult = this.processSide(
      this.right,
      keypoints.rightHeel,
      keypoints.rightFootIndex,
      angles.rightKneeFlexion,
      angles.rightHipFlexion,
      angles.rightAnkleDorsiflexion,
      timestampMs,
    );

    // Return the most recently completed stride (prefer left if both complete simultaneously)
    return leftResult ?? rightResult;
  }

  private processSide(
    state: SideState,
    heel: { x: number; y: number; z: number },
    _footIndex: { x: number; y: number; z: number },
    kneeFlexion: number,
    hipFlexion: number,
    ankleDorsiflexion: number,
    timestampMs: number,
  ): StrideUpdate | null {
    // Track peak angles for current stride
    state.peakKneeFlexion = Math.max(state.peakKneeFlexion, kneeFlexion);
    state.peakHipFlexion = Math.max(state.peakHipFlexion, hipFlexion);
    state.peakAnkleDorsiflexion = Math.max(state.peakAnkleDorsiflexion, ankleDorsiflexion);

    // Add to heel Y buffer
    state.heelYBuffer.push({ y: heel.y, timestampMs, frameIndex: this.frameCount });

    // Keep buffer manageable (last 60 frames = 2s at 30fps)
    if (state.heelYBuffer.length > 60) {
      state.heelYBuffer.shift();
    }

    // Need at least MIN_PEAK_DISTANCE + 2 frames to detect a local minimum
    if (state.heelYBuffer.length < MIN_PEAK_DISTANCE + 2) {
      return null;
    }

    // Track ground contact state
    const recentY = state.heelYBuffer.map(h => h.y);
    const minY = Math.min(...recentY);
    const maxY = Math.max(...recentY);
    const range = maxY - minY;
    const groundThreshold = minY + range * GROUND_CONTACT_FRACTION;

    const currentY = heel.y;
    const wasGrounded = state.isGrounded;
    // In MediaPipe, higher Y = lower in image = closer to ground
    state.isGrounded = currentY >= groundThreshold && range > 0.001;

    if (state.isGrounded && !wasGrounded) {
      state.groundContactStartMs = timestampMs;
    }

    // Check for heel strike: local maximum in Y (lowest physical point)
    // We look at the point MIN_PEAK_DISTANCE/2 frames back to confirm it's a peak
    const checkIdx = state.heelYBuffer.length - 1 - Math.floor(MIN_PEAK_DISTANCE / 2);
    if (checkIdx < 1) return null;

    const candidate = state.heelYBuffer[checkIdx];
    const before = state.heelYBuffer[checkIdx - 1];
    const after = state.heelYBuffer[checkIdx + 1];

    // Local maximum in Y = heel strike (foot at lowest point)
    const isLocalMax = candidate.y > before.y && candidate.y > after.y;
    if (!isLocalMax) return null;

    // Ensure minimum distance from last heel strike
    if (
      state.lastHeelStrikeMs !== null &&
      candidate.timestampMs - state.lastHeelStrikeMs < (MIN_PEAK_DISTANCE / 30) * 1000
    ) {
      return null;
    }

    // We have a new heel strike -- compute stride if we have a previous one
    let result: StrideUpdate | null = null;

    if (state.lastHeelStrikeMs !== null && state.lastHeelStrikePos !== null) {
      const strideTimeMs = candidate.timestampMs - state.lastHeelStrikeMs;

      // Stride length: horizontal distance between consecutive heel strikes (same foot)
      const dx = heel.x - state.lastHeelStrikePos.x;
      const dz = heel.z - state.lastHeelStrikePos.z;
      const strideLength = Math.sqrt(dx * dx + dz * dz);

      // Ground contact time: time foot was grounded during this stride
      const groundContactTimeMs = state.groundContactStartMs !== null
        ? Math.max(0, candidate.timestampMs - state.groundContactStartMs)
        : strideTimeMs * 0.6; // Default ~60% of stride is ground contact in running

      const flightTimeMs = Math.max(0, strideTimeMs - groundContactTimeMs);

      const stride: StrideData = {
        side: state.side,
        startTimestampMs: state.lastHeelStrikeMs,
        endTimestampMs: candidate.timestampMs,
        strideLength,
        strideTimeMs,
        groundContactTimeMs,
        flightTimeMs,
        peakKneeFlexion: state.peakKneeFlexion,
        peakHipFlexion: state.peakHipFlexion,
        peakAnkleDorsiflexion: state.peakAnkleDorsiflexion,
      };

      // Add to rolling buffer
      state.strides.push(stride);
      if (state.strides.length > MAX_STRIDE_BUFFER) {
        state.strides.shift();
      }
      state.strideCount++;

      // Compute cadence from recent strides
      const recentStrides = state.strides.slice(-5);
      const avgStrideTime =
        recentStrides.reduce((sum, s) => sum + s.strideTimeMs, 0) / recentStrides.length;
      const currentCadence = avgStrideTime > 0 ? 1000 / avgStrideTime : 0;

      result = {
        newStride: stride,
        strideCount: state.strideCount,
        currentCadence,
      };
    }

    // Update heel strike tracking and reset peak accumulators
    state.lastHeelStrikeMs = candidate.timestampMs;
    state.lastHeelStrikePos = { x: heel.x, z: heel.z };
    state.peakKneeFlexion = 0;
    state.peakHipFlexion = 0;
    state.peakAnkleDorsiflexion = 0;
    state.groundContactStartMs = null;

    return result;
  }

  /** Get the N most recent strides from both sides, sorted by time */
  getRecentStrides(count: number): StrideData[] {
    const all = [...this.left.strides, ...this.right.strides];
    all.sort((a, b) => a.endTimestampMs - b.endTimestampMs);
    return all.slice(-count);
  }

  /** Get recent strides for a specific side */
  getRecentSideStrides(side: 'left' | 'right', count: number): StrideData[] {
    const state = side === 'left' ? this.left : this.right;
    return state.strides.slice(-count);
  }

  /** Total stride count (both sides) */
  getTotalStrideCount(): number {
    return this.left.strideCount + this.right.strideCount;
  }

  reset(): void {
    this.left = this.createSideState('left');
    this.right = this.createSideState('right');
    this.frameCount = 0;
  }
}
