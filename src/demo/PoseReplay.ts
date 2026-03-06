import type {
  FilteredKeypoints,
  PoseClipAsset,
  PoseDisplayContourPoint,
  PoseDisplayFrame,
  PoseDisplayLandmark,
  PoseSegmentId,
  Point3D,
  ScenarioPoseCue,
} from '../types/index.ts';
import poseAssetData from './data/real-football-pose.json';

const poseAsset = poseAssetData as PoseClipAsset;

const POSE_INDEX = {
  NOSE: 0,
  LEFT_SHOULDER: 11,
  RIGHT_SHOULDER: 12,
  LEFT_ELBOW: 13,
  RIGHT_ELBOW: 14,
  LEFT_WRIST: 15,
  RIGHT_WRIST: 16,
  LEFT_HIP: 23,
  RIGHT_HIP: 24,
  LEFT_KNEE: 25,
  RIGHT_KNEE: 26,
  LEFT_ANKLE: 27,
  RIGHT_ANKLE: 28,
  LEFT_HEEL: 29,
  RIGHT_HEEL: 30,
  LEFT_FOOT_INDEX: 31,
  RIGHT_FOOT_INDEX: 32,
} as const;

const LEFT_SIDE_INDICES = [
  POSE_INDEX.LEFT_SHOULDER,
  POSE_INDEX.LEFT_ELBOW,
  POSE_INDEX.LEFT_WRIST,
  POSE_INDEX.LEFT_HIP,
  POSE_INDEX.LEFT_KNEE,
  POSE_INDEX.LEFT_ANKLE,
  POSE_INDEX.LEFT_HEEL,
  POSE_INDEX.LEFT_FOOT_INDEX,
];

const RIGHT_SIDE_INDICES = [
  POSE_INDEX.RIGHT_SHOULDER,
  POSE_INDEX.RIGHT_ELBOW,
  POSE_INDEX.RIGHT_WRIST,
  POSE_INDEX.RIGHT_HIP,
  POSE_INDEX.RIGHT_KNEE,
  POSE_INDEX.RIGHT_ANKLE,
  POSE_INDEX.RIGHT_HEEL,
  POSE_INDEX.RIGHT_FOOT_INDEX,
];

const LOWER_BODY_INDICES = [
  POSE_INDEX.LEFT_HIP,
  POSE_INDEX.RIGHT_HIP,
  POSE_INDEX.LEFT_KNEE,
  POSE_INDEX.RIGHT_KNEE,
  POSE_INDEX.LEFT_ANKLE,
  POSE_INDEX.RIGHT_ANKLE,
  POSE_INDEX.LEFT_HEEL,
  POSE_INDEX.RIGHT_HEEL,
  POSE_INDEX.LEFT_FOOT_INDEX,
  POSE_INDEX.RIGHT_FOOT_INDEX,
];

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function cloneLandmarks(landmarks: PoseDisplayLandmark[]): PoseDisplayLandmark[] {
  return landmarks.map((landmark) => ({ ...landmark }));
}

function cloneSilhouette(
  silhouette: PoseDisplayContourPoint[] | null | undefined,
): PoseDisplayContourPoint[] | null {
  return silhouette ? silhouette.map((point) => ({ ...point })) : null;
}

function getCue(cues: ScenarioPoseCue[], timestampMs: number): ScenarioPoseCue {
  let active = cues[0];
  for (const cue of cues) {
    if (timestampMs >= cue.startTimestampMs) {
      active = cue;
    } else {
      break;
    }
  }
  return active;
}

function getSegmentFrame(
  segmentId: PoseSegmentId,
  timestampMs: number,
  cue: ScenarioPoseCue,
): { frame: PoseDisplayFrame; segmentTimeMs: number } {
  const segment = poseAsset.segments[segmentId];
  const frameCount = Math.max(1, segment.endFrame - segment.startFrame);
  const playbackRate = cue.playbackRate ?? 1;
  const elapsedMs = Math.max(0, timestampMs - cue.startTimestampMs) * playbackRate;
  const elapsedFrames = Math.floor((elapsedMs / 1000) * poseAsset.fps);
  const frameIndex = segment.startFrame + (elapsedFrames % frameCount);
  const segmentDurationMs = (frameCount / poseAsset.fps) * 1000;
  return {
    frame: poseAsset.frames[frameIndex],
    segmentTimeMs: segmentDurationMs > 0 ? elapsedMs % segmentDurationMs : 0,
  };
}

function scaleLimbExcursion(
  landmarks: PoseDisplayLandmark[],
  indices: number[],
  anchorIndex: number,
  amount: number,
): void {
  const anchor = landmarks[anchorIndex];
  for (const index of indices) {
    if (index === anchorIndex) continue;
    const point = landmarks[index];
    point.x = anchor.x + (point.x - anchor.x) * (1 - amount * 0.18);
    point.y = anchor.y + (point.y - anchor.y) * (1 - amount * 0.12);
    point.z = anchor.z + (point.z - anchor.z) * (1 - amount * 0.14);
  }
}

function applyBilateralFatigue(
  landmarks: PoseDisplayLandmark[],
  amount: number,
): void {
  const damp = 1 - amount * 0.08;
  for (const index of LOWER_BODY_INDICES) {
    landmarks[index].x *= damp;
  }

  const upperBody = [
    POSE_INDEX.NOSE,
    POSE_INDEX.LEFT_SHOULDER,
    POSE_INDEX.RIGHT_SHOULDER,
    POSE_INDEX.LEFT_ELBOW,
    POSE_INDEX.RIGHT_ELBOW,
    POSE_INDEX.LEFT_WRIST,
    POSE_INDEX.RIGHT_WRIST,
  ];

  for (const index of upperBody) {
    landmarks[index].y -= amount * 0.06;
  }
}

function applyGuarding(
  landmarks: PoseDisplayLandmark[],
  affectedSide: 'left' | 'right' | 'bilateral',
  amount: number,
): void {
  if (affectedSide === 'bilateral') {
    applyBilateralFatigue(landmarks, amount);
    return;
  }

  if (affectedSide === 'left') {
    scaleLimbExcursion(landmarks, LEFT_SIDE_INDICES, POSE_INDEX.LEFT_HIP, amount);
    landmarks[POSE_INDEX.LEFT_SHOULDER].y -= amount * 0.04;
    landmarks[POSE_INDEX.LEFT_WRIST].x += amount * 0.06;
    return;
  }

  scaleLimbExcursion(landmarks, RIGHT_SIDE_INDICES, POSE_INDEX.RIGHT_HIP, amount);
  landmarks[POSE_INDEX.RIGHT_SHOULDER].y -= amount * 0.04;
  landmarks[POSE_INDEX.RIGHT_WRIST].x -= amount * 0.06;
}

function applyCueShape(
  landmarks: PoseDisplayLandmark[],
  cue: ScenarioPoseCue,
  anomalyScore: number,
  affectedSide: 'left' | 'right' | 'bilateral',
): void {
  const cueStrideScale = cue.strideScale ?? 1;
  const cueLeanBias = cue.leanBias ?? 0;

  if (cueStrideScale !== 1) {
    for (const index of [
      POSE_INDEX.LEFT_KNEE,
      POSE_INDEX.RIGHT_KNEE,
      POSE_INDEX.LEFT_ANKLE,
      POSE_INDEX.RIGHT_ANKLE,
      POSE_INDEX.LEFT_HEEL,
      POSE_INDEX.RIGHT_HEEL,
      POSE_INDEX.LEFT_FOOT_INDEX,
      POSE_INDEX.RIGHT_FOOT_INDEX,
    ]) {
      landmarks[index].x *= cueStrideScale;
    }
  }

  if (cueLeanBias !== 0) {
    const upperBody = [
      POSE_INDEX.NOSE,
      POSE_INDEX.LEFT_SHOULDER,
      POSE_INDEX.RIGHT_SHOULDER,
      POSE_INDEX.LEFT_ELBOW,
      POSE_INDEX.RIGHT_ELBOW,
      POSE_INDEX.LEFT_WRIST,
      POSE_INDEX.RIGHT_WRIST,
    ];
    for (const index of upperBody) {
      landmarks[index].x += cueLeanBias;
    }
  }

  const guardingAmount = clamp(anomalyScore * 0.55, 0, 0.55);
  if (guardingAmount > 0.05) {
    applyGuarding(landmarks, affectedSide, guardingAmount);
  }
}

function inferBallAnchor(landmarks: PoseDisplayLandmark[]): Point3D {
  const leftFoot = landmarks[POSE_INDEX.LEFT_FOOT_INDEX];
  const rightFoot = landmarks[POSE_INDEX.RIGHT_FOOT_INDEX];
  const leftHeel = landmarks[POSE_INDEX.LEFT_HEEL];
  const rightHeel = landmarks[POSE_INDEX.RIGHT_HEEL];
  const leftAnkle = landmarks[POSE_INDEX.LEFT_ANKLE];
  const rightAnkle = landmarks[POSE_INDEX.RIGHT_ANKLE];
  const groundY = Math.min(leftFoot.y, rightFoot.y, leftHeel.y, rightHeel.y);
  const leftDrive = (leftFoot.y + leftAnkle.y) / 2;
  const rightDrive = (rightFoot.y + rightAnkle.y) / 2;
  const activeIsLeft = leftDrive >= rightDrive;
  const activeFoot = activeIsLeft ? leftFoot : rightFoot;
  const supportFoot = activeIsLeft ? rightFoot : leftFoot;
  const lift = Math.max((activeFoot.y + (activeIsLeft ? leftAnkle.y : rightAnkle.y)) / 2 - groundY, 0);

  return {
    x: activeFoot.x * 0.72 + supportFoot.x * 0.28,
    y: groundY + clamp(0.22 + lift * 0.58, 0.22, 1.05),
    z: activeFoot.z * 0.7 + supportFoot.z * 0.3,
  };
}

export function getPoseAsset(): PoseClipAsset {
  return poseAsset;
}

export function buildScenarioDisplayPose(
  timestampMs: number,
  frameIndex: number,
  cues: ScenarioPoseCue[],
  anomalyScore: number,
  affectedSide: 'left' | 'right' | 'bilateral',
): PoseDisplayFrame {
  const cue = getCue(cues, timestampMs);
  const { frame: baseFrame, segmentTimeMs } = getSegmentFrame(cue.segmentId, timestampMs, cue);
  const landmarks = cloneLandmarks(baseFrame.landmarks);

  applyCueShape(landmarks, cue, anomalyScore, affectedSide);

  return {
    timestampMs,
    frameIndex,
    confidence: baseFrame.confidence,
    landmarks,
    silhouette: cloneSilhouette(baseFrame.silhouette),
    segmentId: cue.segmentId,
    segmentTimeMs,
    ballAnchor: inferBallAnchor(landmarks),
  };
}

function getPoint(landmarks: PoseDisplayLandmark[], index: number): Point3D {
  const point = landmarks[index];
  return {
    x: point?.x ?? 0,
    y: point?.y ?? 0,
    z: point?.z ?? 0,
  };
}

export function displayPoseToFilteredKeypoints(
  displayPose: PoseDisplayFrame,
): FilteredKeypoints {
  const { landmarks, timestampMs, frameIndex, confidence } = displayPose;

  return {
    timestampMs,
    frameIndex,
    leftShoulder: getPoint(landmarks, POSE_INDEX.LEFT_SHOULDER),
    rightShoulder: getPoint(landmarks, POSE_INDEX.RIGHT_SHOULDER),
    leftHip: getPoint(landmarks, POSE_INDEX.LEFT_HIP),
    rightHip: getPoint(landmarks, POSE_INDEX.RIGHT_HIP),
    leftKnee: getPoint(landmarks, POSE_INDEX.LEFT_KNEE),
    rightKnee: getPoint(landmarks, POSE_INDEX.RIGHT_KNEE),
    leftAnkle: getPoint(landmarks, POSE_INDEX.LEFT_ANKLE),
    rightAnkle: getPoint(landmarks, POSE_INDEX.RIGHT_ANKLE),
    leftHeel: getPoint(landmarks, POSE_INDEX.LEFT_HEEL),
    rightHeel: getPoint(landmarks, POSE_INDEX.RIGHT_HEEL),
    leftFootIndex: getPoint(landmarks, POSE_INDEX.LEFT_FOOT_INDEX),
    rightFootIndex: getPoint(landmarks, POSE_INDEX.RIGHT_FOOT_INDEX),
    confidence,
  };
}
