import type { PoseResult, FilteredKeypoints, Point3D, Keypoint } from '../types/index';
import { LANDMARK, SMOOTHING_ALPHA, CONFIDENCE_THRESHOLD, MAX_INTERPOLATION_GAP } from '../utils/constants';

interface FilterState {
  previous: FilteredKeypoints | null;
  buffer: (FilteredKeypoints | null)[];
  frameIndex: number;
}

const ZERO_POINT: Point3D = { x: 0, y: 0, z: 0 };

function emaSmooth(current: Point3D, previous: Point3D, alpha: number): Point3D {
  return {
    x: alpha * current.x + (1 - alpha) * previous.x,
    y: alpha * current.y + (1 - alpha) * previous.y,
    z: alpha * current.z + (1 - alpha) * previous.z,
  };
}

function keypointToPoint(kp: Keypoint): Point3D {
  return { x: kp.x, y: kp.y, z: kp.z };
}

function getKeypointOrNull(
  landmarks: Keypoint[],
  index: number,
  threshold: number
): Point3D | null {
  const kp = landmarks[index];
  if (!kp || kp.visibility < threshold) return null;
  return keypointToPoint(kp);
}

/**
 * Stateful keypoint filter that extracts lower-body + torso landmarks,
 * applies temporal smoothing (EMA), confidence thresholding, and
 * interpolation for short gaps.
 */
export class KeypointFilter {
  private state: FilterState = {
    previous: null,
    buffer: [],
    frameIndex: 0,
  };

  /**
   * Filter raw pose result into smoothed lower-body keypoints.
   * Returns null if the pose has insufficient confidence.
   */
  filter(raw: PoseResult): FilteredKeypoints | null {
    const frameIndex = this.state.frameIndex++;
    const landmarks = raw.landmarks;

    if (!landmarks || landmarks.length < 33) {
      this.state.buffer.push(null);
      if (this.state.buffer.length > MAX_INTERPOLATION_GAP + 1) {
        this.state.buffer.shift();
      }
      return this.tryInterpolate(frameIndex, raw.timestampMs);
    }

    // Extract relevant keypoints with confidence check
    const points = {
      leftShoulder: getKeypointOrNull(landmarks, LANDMARK.LEFT_SHOULDER, CONFIDENCE_THRESHOLD),
      rightShoulder: getKeypointOrNull(landmarks, LANDMARK.RIGHT_SHOULDER, CONFIDENCE_THRESHOLD),
      leftHip: getKeypointOrNull(landmarks, LANDMARK.LEFT_HIP, CONFIDENCE_THRESHOLD),
      rightHip: getKeypointOrNull(landmarks, LANDMARK.RIGHT_HIP, CONFIDENCE_THRESHOLD),
      leftKnee: getKeypointOrNull(landmarks, LANDMARK.LEFT_KNEE, CONFIDENCE_THRESHOLD),
      rightKnee: getKeypointOrNull(landmarks, LANDMARK.RIGHT_KNEE, CONFIDENCE_THRESHOLD),
      leftAnkle: getKeypointOrNull(landmarks, LANDMARK.LEFT_ANKLE, CONFIDENCE_THRESHOLD),
      rightAnkle: getKeypointOrNull(landmarks, LANDMARK.RIGHT_ANKLE, CONFIDENCE_THRESHOLD),
      leftHeel: getKeypointOrNull(landmarks, LANDMARK.LEFT_HEEL, CONFIDENCE_THRESHOLD),
      rightHeel: getKeypointOrNull(landmarks, LANDMARK.RIGHT_HEEL, CONFIDENCE_THRESHOLD),
      leftFootIndex: getKeypointOrNull(landmarks, LANDMARK.LEFT_FOOT_INDEX, CONFIDENCE_THRESHOLD),
      rightFootIndex: getKeypointOrNull(landmarks, LANDMARK.RIGHT_FOOT_INDEX, CONFIDENCE_THRESHOLD),
    };

    // Require at minimum hips and knees for a valid frame
    if (!points.leftHip || !points.rightHip || !points.leftKnee || !points.rightKnee) {
      this.state.buffer.push(null);
      if (this.state.buffer.length > MAX_INTERPOLATION_GAP + 1) {
        this.state.buffer.shift();
      }
      return this.tryInterpolate(frameIndex, raw.timestampMs);
    }

    // Compute average confidence from available keypoints
    const visibilities = LOWER_BODY_LANDMARK_INDICES.map(
      (idx) => landmarks[idx]?.visibility ?? 0
    );
    const confidence =
      visibilities.reduce((s, v) => s + v, 0) / visibilities.length;

    // Fill missing points with previous frame data or zero
    const prev = this.state.previous;
    const resolve = (pt: Point3D | null, key: keyof FilteredKeypoints): Point3D => {
      if (pt) return pt;
      if (prev && typeof prev[key] === 'object') return prev[key] as Point3D;
      return ZERO_POINT;
    };

    const rawFiltered: FilteredKeypoints = {
      timestampMs: raw.timestampMs,
      frameIndex,
      leftShoulder: resolve(points.leftShoulder, 'leftShoulder'),
      rightShoulder: resolve(points.rightShoulder, 'rightShoulder'),
      leftHip: resolve(points.leftHip, 'leftHip'),
      rightHip: resolve(points.rightHip, 'rightHip'),
      leftKnee: resolve(points.leftKnee, 'leftKnee'),
      rightKnee: resolve(points.rightKnee, 'rightKnee'),
      leftAnkle: resolve(points.leftAnkle, 'leftAnkle'),
      rightAnkle: resolve(points.rightAnkle, 'rightAnkle'),
      leftHeel: resolve(points.leftHeel, 'leftHeel'),
      rightHeel: resolve(points.rightHeel, 'rightHeel'),
      leftFootIndex: resolve(points.leftFootIndex, 'leftFootIndex'),
      rightFootIndex: resolve(points.rightFootIndex, 'rightFootIndex'),
      confidence,
    };

    // Apply EMA temporal smoothing
    const smoothed = prev ? this.smooth(rawFiltered, prev) : rawFiltered;

    this.state.previous = smoothed;
    this.state.buffer.push(smoothed);
    if (this.state.buffer.length > MAX_INTERPOLATION_GAP + 1) {
      this.state.buffer.shift();
    }

    return smoothed;
  }

  /**
   * Directly convert pre-computed FilteredKeypoints (from demo data)
   * applying only EMA smoothing (no confidence filtering needed).
   */
  smoothPrecomputed(keypoints: FilteredKeypoints): FilteredKeypoints {
    const prev = this.state.previous;
    const smoothed = prev ? this.smooth(keypoints, prev) : keypoints;
    this.state.previous = smoothed;
    this.state.frameIndex = keypoints.frameIndex + 1;
    return smoothed;
  }

  reset(): void {
    this.state = { previous: null, buffer: [], frameIndex: 0 };
  }

  private smooth(
    current: FilteredKeypoints,
    previous: FilteredKeypoints
  ): FilteredKeypoints {
    const alpha = SMOOTHING_ALPHA;
    return {
      ...current,
      leftShoulder: emaSmooth(current.leftShoulder, previous.leftShoulder, alpha),
      rightShoulder: emaSmooth(current.rightShoulder, previous.rightShoulder, alpha),
      leftHip: emaSmooth(current.leftHip, previous.leftHip, alpha),
      rightHip: emaSmooth(current.rightHip, previous.rightHip, alpha),
      leftKnee: emaSmooth(current.leftKnee, previous.leftKnee, alpha),
      rightKnee: emaSmooth(current.rightKnee, previous.rightKnee, alpha),
      leftAnkle: emaSmooth(current.leftAnkle, previous.leftAnkle, alpha),
      rightAnkle: emaSmooth(current.rightAnkle, previous.rightAnkle, alpha),
      leftHeel: emaSmooth(current.leftHeel, previous.leftHeel, alpha),
      rightHeel: emaSmooth(current.rightHeel, previous.rightHeel, alpha),
      leftFootIndex: emaSmooth(current.leftFootIndex, previous.leftFootIndex, alpha),
      rightFootIndex: emaSmooth(current.rightFootIndex, previous.rightFootIndex, alpha),
    };
  }

  private tryInterpolate(
    frameIndex: number,
    timestampMs: number
  ): FilteredKeypoints | null {
    // Look for frames on either side of the gap for linear interpolation
    const buf = this.state.buffer;
    if (buf.length < 2) return null;

    // Find the last valid frame
    let lastValid: FilteredKeypoints | null = null;
    let gapSize = 0;
    for (let i = buf.length - 1; i >= 0; i--) {
      if (buf[i] !== null) {
        lastValid = buf[i];
        gapSize = buf.length - 1 - i;
        break;
      }
    }

    if (!lastValid || gapSize > MAX_INTERPOLATION_GAP) return null;

    // Use last valid frame as best estimate (hold interpolation)
    return {
      ...lastValid,
      timestampMs,
      frameIndex,
      confidence: lastValid.confidence * 0.8, // Reduce confidence for interpolated frames
    };
  }
}

const LOWER_BODY_LANDMARK_INDICES = [
  LANDMARK.LEFT_SHOULDER,
  LANDMARK.RIGHT_SHOULDER,
  LANDMARK.LEFT_HIP,
  LANDMARK.RIGHT_HIP,
  LANDMARK.LEFT_KNEE,
  LANDMARK.RIGHT_KNEE,
  LANDMARK.LEFT_ANKLE,
  LANDMARK.RIGHT_ANKLE,
  LANDMARK.LEFT_HEEL,
  LANDMARK.RIGHT_HEEL,
  LANDMARK.LEFT_FOOT_INDEX,
  LANDMARK.RIGHT_FOOT_INDEX,
];

/** Convenience function for one-shot filtering without state */
export function filterKeypoints(raw: PoseResult): FilteredKeypoints | null {
  const filter = new KeypointFilter();
  return filter.filter(raw);
}
