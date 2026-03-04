// ============================================================
// JointAngleComputer — compute joint angles from filtered keypoints
// ============================================================

import type { FilteredKeypoints, JointAngles, Point3D } from '../types/index';
import { angleBetweenPoints } from '../utils/math';

/** Midpoint of two 3D points */
function midpoint(a: Point3D, b: Point3D): Point3D {
  return {
    x: (a.x + b.x) / 2,
    y: (a.y + b.y) / 2,
    z: (a.z + b.z) / 2,
  };
}

/**
 * Compute all joint angles from a single frame of filtered keypoints.
 *
 * - Knee flexion: angle at knee (hip-knee-ankle)
 * - Hip flexion: angle at hip (shoulder-hip-knee)
 * - Ankle dorsiflexion: angle at ankle (knee-ankle-footIndex)
 * - Trunk lean: forward/backward lean of torso relative to vertical
 * - Lateral trunk tilt: side-to-side tilt of torso
 */
export function computeJointAngles(keypoints: FilteredKeypoints): JointAngles {
  // Knee flexion: angle at knee formed by hip-knee-ankle
  // 180 = fully extended, lower = more flexed. We report flexion as (180 - angle).
  const leftKneeRaw = angleBetweenPoints(keypoints.leftHip, keypoints.leftKnee, keypoints.leftAnkle);
  const rightKneeRaw = angleBetweenPoints(keypoints.rightHip, keypoints.rightKnee, keypoints.rightAnkle);
  const leftKneeFlexion = 180 - leftKneeRaw;
  const rightKneeFlexion = 180 - rightKneeRaw;

  // Hip flexion: angle at hip formed by shoulder-hip-knee
  const leftHipRaw = angleBetweenPoints(keypoints.leftShoulder, keypoints.leftHip, keypoints.leftKnee);
  const rightHipRaw = angleBetweenPoints(keypoints.rightShoulder, keypoints.rightHip, keypoints.rightKnee);
  const leftHipFlexion = 180 - leftHipRaw;
  const rightHipFlexion = 180 - rightHipRaw;

  // Ankle dorsiflexion: angle at ankle formed by knee-ankle-footIndex
  const leftAnkleRaw = angleBetweenPoints(keypoints.leftKnee, keypoints.leftAnkle, keypoints.leftFootIndex);
  const rightAnkleRaw = angleBetweenPoints(keypoints.rightKnee, keypoints.rightAnkle, keypoints.rightFootIndex);
  const leftAnkleDorsiflexion = 180 - leftAnkleRaw;
  const rightAnkleDorsiflexion = 180 - rightAnkleRaw;

  // Trunk lean: angle of shoulder-midpoint to hip-midpoint relative to vertical
  // In MediaPipe coordinates, Y increases downward, so vertical = straight down.
  const shoulderMid = midpoint(keypoints.leftShoulder, keypoints.rightShoulder);
  const hipMid = midpoint(keypoints.leftHip, keypoints.rightHip);

  // Trunk vector (hip to shoulder, going up)
  const trunkDx = shoulderMid.x - hipMid.x;
  const trunkDy = shoulderMid.y - hipMid.y;
  const trunkDz = shoulderMid.z - hipMid.z;

  // Forward lean: angle in the sagittal plane (XZ vs Y)
  // Vertical is pure Y. Lean = deviation in Z direction.
  const sagittalLen = Math.sqrt(trunkDy ** 2 + trunkDz ** 2);
  const trunkLean = sagittalLen > 0
    ? (Math.atan2(Math.abs(trunkDz), Math.abs(trunkDy)) * 180) / Math.PI
    : 0;

  // Lateral tilt: deviation in X direction from vertical
  const frontalLen = Math.sqrt(trunkDy ** 2 + trunkDx ** 2);
  const lateralTrunkTilt = frontalLen > 0
    ? (Math.atan2(Math.abs(trunkDx), Math.abs(trunkDy)) * 180) / Math.PI
    : 0;

  return {
    leftKneeFlexion,
    rightKneeFlexion,
    leftHipFlexion,
    rightHipFlexion,
    leftAnkleDorsiflexion,
    rightAnkleDorsiflexion,
    trunkLean,
    lateralTrunkTilt,
  };
}
