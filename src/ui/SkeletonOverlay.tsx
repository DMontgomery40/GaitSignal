import { useCallback, useEffect, useRef } from 'react';
import type {
  FeatureContribution,
  FootballContext,
  PoseDisplayFrame,
  PoseDisplayLandmark,
} from '../types/index.ts';

interface SkeletonOverlayProps {
  displayPose: PoseDisplayFrame | null;
  footballContext: FootballContext | null;
  contributingFeatures: FeatureContribution[];
  width: number;
  height: number;
  poseOnly?: boolean;
}

interface ScreenPoint {
  x: number;
  y: number;
}

interface Placement {
  anchorX: number;
  groundY: number;
  scale: number;
}

const BODY_CONNECTIONS: readonly [number, number][] = [
  [11, 12],
  [11, 13],
  [13, 15],
  [12, 14],
  [14, 16],
  [11, 23],
  [12, 24],
  [23, 24],
  [23, 25],
  [25, 27],
  [24, 26],
  [26, 28],
  [27, 29],
  [29, 31],
  [27, 31],
  [28, 30],
  [30, 32],
  [28, 32],
] as const;

const JOINT_INDICES = [
  0,
  11, 12,
  13, 14,
  15, 16,
  23, 24,
  25, 26,
  27, 28,
  29, 30,
  31, 32,
];

const FEATURE_JOINT_MAP: Record<string, number[]> = {
  'L Knee Load': [25],
  'R Knee Load': [26],
  'Knee Load Asym.': [25, 26],
  'L Hip Drive': [23],
  'R Hip Drive': [24],
  'Hip Drive Asym.': [23, 24],
  'L Ankle Spring': [27, 29, 31],
  'R Ankle Spring': [28, 30, 32],
  'Ankle Spring Asym.': [27, 28, 29, 30, 31, 32],
  'Stride Length L': [29, 31],
  'Stride Length R': [30, 32],
  'Stride Compression': [29, 30, 31, 32],
  'Ground Contact L': [29, 31],
  'Ground Contact R': [30, 32],
  'Ground Contact Asym.': [29, 30, 31, 32],
  'Forward Lean': [0, 11, 12, 23, 24],
  'Lateral Tilt': [0, 11, 12, 23, 24],
};

const COLOR_NORMAL = '#00f0ff';
const COLOR_ELEVATED = '#ffb800';
const COLOR_CRITICAL = '#ff3344';
const PITCH_LENGTH_M = 105;
const PITCH_WIDTH_M = 68;

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function getJointColor(jointIndex: number, contributingFeatures: FeatureContribution[]): string {
  let maxContrib = 0;
  for (const feature of contributingFeatures) {
    const joints = FEATURE_JOINT_MAP[feature.featureName];
    if (joints?.includes(jointIndex)) {
      maxContrib = Math.max(maxContrib, feature.contribution);
    }
  }
  if (maxContrib > 0.5) return COLOR_CRITICAL;
  if (maxContrib > 0.2) return COLOR_ELEVATED;
  return COLOR_NORMAL;
}

function blendLandmarks(
  current: PoseDisplayLandmark[],
  previous: PoseDisplayLandmark[] | null,
): PoseDisplayLandmark[] {
  if (!previous || previous.length !== current.length) {
    return current.map((landmark) => ({ ...landmark }));
  }

  const alpha = 0.34;
  return current.map((landmark, index) => {
    const prev = previous[index];
    return {
      x: prev.x + (landmark.x - prev.x) * alpha,
      y: prev.y + (landmark.y - prev.y) * alpha,
      z: prev.z + (landmark.z - prev.z) * alpha,
      visibility: prev.visibility + (landmark.visibility - prev.visibility) * alpha,
    };
  });
}

function getScenePlacement(
  footballContext: FootballContext | null,
  width: number,
  height: number,
  poseOnly: boolean,
): Placement {
  if (poseOnly) {
    return {
      anchorX: width * 0.5,
      groundY: height * 0.83,
      scale: height * 0.235,
    };
  }

  if (!footballContext) {
    return {
      anchorX: width * 0.5,
      groundY: height * 0.8,
      scale: height * 0.15,
    };
  }

  const xRatio = clamp(footballContext.playerPosition.x / PITCH_LENGTH_M, 0, 1);
  const yRatio = clamp(footballContext.playerPosition.y / PITCH_WIDTH_M, 0, 1);

  return {
    anchorX: lerp(width * 0.2, width * 0.82, xRatio),
    groundY: lerp(height * 0.78, height * 0.48, yRatio),
    scale: lerp(height * 0.14, height * 0.19, 1 - yRatio * 0.75),
  };
}

function getSegmentBodyWidth(a: number, b: number, scale: number, poseOnly: boolean): number {
  const key = `${Math.min(a, b)}-${Math.max(a, b)}`;
  const widths: Record<string, number> = {
    '11-12': 0.15,
    '11-23': 0.14,
    '12-24': 0.14,
    '23-24': 0.15,
    '11-13': 0.1,
    '12-14': 0.1,
    '13-15': 0.075,
    '14-16': 0.075,
    '23-25': 0.135,
    '24-26': 0.135,
    '25-27': 0.11,
    '26-28': 0.11,
    '27-29': 0.07,
    '28-30': 0.07,
    '27-31': 0.08,
    '28-32': 0.08,
    '29-31': 0.08,
    '30-32': 0.08,
  };
  const widthScale = poseOnly ? 1.25 : 1;
  return Math.max(poseOnly ? 7 : 4, scale * (widths[key] ?? 0.08) * widthScale);
}

function drawCapsule(
  ctx: CanvasRenderingContext2D,
  from: ScreenPoint,
  to: ScreenPoint,
  fillColor: string,
  accentColor: string | CanvasGradient,
  width: number,
  poseOnly: boolean,
): void {
  if (poseOnly) {
    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(to.x, to.y);
    ctx.strokeStyle = fillColor;
    ctx.globalAlpha = 0.98;
    ctx.lineWidth = width + 2;
    ctx.shadowColor = 'rgba(0, 0, 0, 0.28)';
    ctx.shadowBlur = 10;
    ctx.stroke();
    ctx.shadowBlur = 0;
    return;
  }

  ctx.beginPath();
  ctx.moveTo(from.x, from.y);
  ctx.lineTo(to.x, to.y);
  ctx.strokeStyle = 'rgba(2, 14, 18, 0.68)';
  ctx.globalAlpha = 1;
  ctx.lineWidth = width + 3;
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(from.x, from.y);
  ctx.lineTo(to.x, to.y);
  ctx.strokeStyle = fillColor;
  ctx.globalAlpha = 0.88;
  ctx.lineWidth = width;
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(from.x, from.y);
  ctx.lineTo(to.x, to.y);
  ctx.strokeStyle = accentColor;
  ctx.globalAlpha = 0.72;
  ctx.lineWidth = Math.max(2.2, width * 0.22);
  ctx.stroke();
}

function drawShoe(
  ctx: CanvasRenderingContext2D,
  heel: ScreenPoint | null,
  toe: ScreenPoint | null,
  accentColor: string,
  scale: number,
  poseOnly: boolean,
): void {
  if (!heel || !toe) return;
  if (poseOnly) {
    ctx.beginPath();
    ctx.moveTo(heel.x, heel.y);
    ctx.lineTo(toe.x, toe.y);
    ctx.strokeStyle = 'rgba(235, 244, 246, 0.98)';
    ctx.lineWidth = Math.max(5.5, scale * 0.052);
    ctx.globalAlpha = 0.98;
    ctx.shadowColor = 'rgba(0, 0, 0, 0.24)';
    ctx.shadowBlur = 8;
    ctx.stroke();
    ctx.shadowBlur = 0;

    ctx.beginPath();
    ctx.moveTo(heel.x, heel.y);
    ctx.lineTo(toe.x, toe.y);
    ctx.strokeStyle = accentColor;
    ctx.lineWidth = Math.max(1.2, scale * 0.012);
    ctx.globalAlpha = 0.72;
    ctx.stroke();
    return;
  }

  ctx.beginPath();
  ctx.moveTo(heel.x, heel.y);
  ctx.lineTo(toe.x, toe.y);
  ctx.strokeStyle = 'rgba(2, 14, 18, 0.72)';
  ctx.lineWidth = Math.max(6, scale * 0.06);
  ctx.globalAlpha = 1;
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(heel.x, heel.y);
  ctx.lineTo(toe.x, toe.y);
  ctx.strokeStyle = poseOnly ? 'rgba(235, 244, 246, 0.96)' : 'rgba(210, 249, 255, 0.86)';
  ctx.lineWidth = Math.max(4.4, scale * 0.042);
  ctx.globalAlpha = poseOnly ? 0.98 : 0.9;
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(heel.x, heel.y);
  ctx.lineTo(toe.x, toe.y);
  ctx.strokeStyle = accentColor;
  ctx.lineWidth = Math.max(1.5, scale * 0.014);
  ctx.globalAlpha = poseOnly ? 0.9 : 0.76;
  ctx.stroke();
}

function getGroundOffset(landmarks: PoseDisplayLandmark[]): number {
  const footPoints = [27, 28, 29, 30, 31, 32]
    .map((footIndex) => landmarks[footIndex]?.y)
    .filter((value): value is number => typeof value === 'number');
  return footPoints.length > 0 ? Math.min(...footPoints) : -2.1;
}

function projectBodyPoint(
  point: { x: number; y: number; z: number },
  landmarks: PoseDisplayLandmark[],
  placement: { anchorX: number; groundY: number; scale: number },
): ScreenPoint {
  const groundOffset = getGroundOffset(landmarks);

  return {
    x: placement.anchorX + point.x * placement.scale + point.z * placement.scale * 0.1,
    y: placement.groundY - (point.y - groundOffset) * placement.scale,
  };
}

function projectPosePoint(
  landmarks: PoseDisplayLandmark[],
  placement: { anchorX: number; groundY: number; scale: number },
  index: number,
): ScreenPoint | null {
  const point = landmarks[index];
  if (!point || point.visibility <= 0.02) return null;
  return projectBodyPoint(point, landmarks, placement);
}

function projectPitchPoint(
  point: { x: number; y: number },
  width: number,
  height: number,
): ScreenPoint {
  const xRatio = clamp(point.x / PITCH_LENGTH_M, 0, 1);
  const yRatio = clamp(point.y / PITCH_WIDTH_M, 0, 1);
  return {
    x: lerp(width * 0.12, width * 0.88, xRatio),
    y: lerp(height * 0.8, height * 0.43, yRatio),
  };
}

export default function SkeletonOverlay({
  displayPose,
  footballContext,
  contributingFeatures,
  width,
  height,
  poseOnly = false,
}: SkeletonOverlayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const previousPoseRef = useRef<PoseDisplayLandmark[] | null>(null);
  const animationFrameRef = useRef<number>(0);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, width, height);
    if (!displayPose) return;

    const landmarks = blendLandmarks(displayPose.landmarks, previousPoseRef.current);
    const placement = getScenePlacement(footballContext, width, height, poseOnly);

    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    ctx.beginPath();
    ctx.ellipse(
      placement.anchorX,
      placement.groundY + placement.scale * 0.1,
      placement.scale * 0.38,
      placement.scale * 0.12,
      0,
      0,
      Math.PI * 2,
    );
    ctx.fillStyle = poseOnly ? 'rgba(0, 0, 0, 0.28)' : 'rgba(0, 0, 0, 0.22)';
    ctx.fill();

    const leftShoulder = projectPosePoint(landmarks, placement, 11);
    const rightShoulder = projectPosePoint(landmarks, placement, 12);
    const leftHip = projectPosePoint(landmarks, placement, 23);
    const rightHip = projectPosePoint(landmarks, placement, 24);
    const leftHeel = projectPosePoint(landmarks, placement, 29);
    const rightHeel = projectPosePoint(landmarks, placement, 30);
    const leftToe = projectPosePoint(landmarks, placement, 31);
    const rightToe = projectPosePoint(landmarks, placement, 32);

    if (leftShoulder && rightShoulder && leftHip && rightHip) {
      const waistLeft = {
        x: lerp(leftShoulder.x, leftHip.x, 0.54),
        y: lerp(leftShoulder.y, leftHip.y, 0.54),
      };
      const waistRight = {
        x: lerp(rightShoulder.x, rightHip.x, 0.54),
        y: lerp(rightShoulder.y, rightHip.y, 0.54),
      };

      ctx.beginPath();
      ctx.moveTo(leftShoulder.x, leftShoulder.y);
      ctx.lineTo(rightShoulder.x, rightShoulder.y);
      ctx.lineTo(waistRight.x, waistRight.y);
      ctx.lineTo(rightHip.x, rightHip.y);
      ctx.lineTo(leftHip.x, leftHip.y);
      ctx.lineTo(waistLeft.x, waistLeft.y);
      ctx.closePath();
      ctx.fillStyle = poseOnly ? 'rgba(241, 244, 239, 0.98)' : 'rgba(168, 245, 255, 0.2)';
      ctx.fill();

      ctx.beginPath();
      ctx.moveTo(waistLeft.x, waistLeft.y);
      ctx.lineTo(waistRight.x, waistRight.y);
      ctx.lineTo(rightHip.x, rightHip.y);
      ctx.lineTo(leftHip.x, leftHip.y);
      ctx.closePath();
      ctx.fillStyle = poseOnly ? 'rgba(241, 244, 239, 0.96)' : 'rgba(0, 240, 255, 0.14)';
      ctx.fill();

      if (!poseOnly) {
        ctx.beginPath();
        ctx.moveTo(leftShoulder.x, leftShoulder.y);
        ctx.lineTo(rightShoulder.x, rightShoulder.y);
        ctx.lineTo(rightHip.x, rightHip.y);
        ctx.lineTo(leftHip.x, leftHip.y);
        ctx.closePath();
        ctx.strokeStyle = 'rgba(0, 240, 255, 0.3)';
        ctx.globalAlpha = 1;
        ctx.lineWidth = 1.6;
        ctx.stroke();
      }
    }

    for (const [a, b] of BODY_CONNECTIONS) {
      const from = projectPosePoint(landmarks, placement, a);
      const to = projectPosePoint(landmarks, placement, b);
      if (!from || !to) continue;

      const colorA = getJointColor(a, contributingFeatures);
      const colorB = getJointColor(b, contributingFeatures);
      const widthForSegment = getSegmentBodyWidth(a, b, placement.scale, poseOnly);
      const accentColor =
        colorA === colorB
          ? colorA
          : ctx.createLinearGradient(from.x, from.y, to.x, to.y);

      if (accentColor instanceof CanvasGradient) {
        accentColor.addColorStop(0, colorA);
        accentColor.addColorStop(1, colorB);
      }

      drawCapsule(
        ctx,
        from,
        to,
        poseOnly ? 'rgba(241, 244, 239, 0.98)' : 'rgba(182, 249, 255, 0.82)',
        poseOnly ? 'rgba(76, 126, 136, 0.42)' : accentColor,
        widthForSegment,
        poseOnly,
      );
    }

    const nose = projectPosePoint(landmarks, placement, 0);
    if (nose && leftShoulder && rightShoulder) {
      const shoulderMid = {
        x: (leftShoulder.x + rightShoulder.x) / 2,
        y: (leftShoulder.y + rightShoulder.y) / 2,
      };
      const headCenter = {
        x: lerp(shoulderMid.x, nose.x, 0.74),
        y: lerp(shoulderMid.y, nose.y, 0.74),
      };
      const shoulderWidth = Math.abs(rightShoulder.x - leftShoulder.x);
      const radius = Math.max(10, shoulderWidth * 0.32);

      ctx.beginPath();
      ctx.moveTo(shoulderMid.x, shoulderMid.y);
      ctx.lineTo(headCenter.x, headCenter.y + radius * 0.18);
      ctx.strokeStyle = poseOnly ? 'rgba(230, 242, 245, 0.94)' : getJointColor(0, contributingFeatures);
      ctx.globalAlpha = poseOnly ? 0.96 : 0.72;
      ctx.lineWidth = Math.max(poseOnly ? 6 : 3, shoulderWidth * (poseOnly ? 0.12 : 0.08));
      if (poseOnly) {
        ctx.shadowColor = 'rgba(0, 0, 0, 0.24)';
        ctx.shadowBlur = 8;
      }
      ctx.stroke();
      ctx.shadowBlur = 0;

      ctx.beginPath();
      ctx.arc(headCenter.x, headCenter.y - radius * 0.1, radius, 0, Math.PI * 2);
      ctx.fillStyle = poseOnly ? 'rgba(230, 242, 245, 0.96)' : 'rgba(0, 240, 255, 0.12)';
      if (poseOnly) {
        ctx.shadowColor = 'rgba(0, 0, 0, 0.24)';
        ctx.shadowBlur = 10;
      }
      ctx.fill();
      ctx.shadowBlur = 0;
      if (!poseOnly) {
        ctx.strokeStyle = getJointColor(0, contributingFeatures);
        ctx.globalAlpha = 0.78;
        ctx.lineWidth = 2;
        ctx.stroke();
      }
    }

    drawShoe(ctx, leftHeel, leftToe, getJointColor(31, contributingFeatures), placement.scale, poseOnly);
    drawShoe(ctx, rightHeel, rightToe, getJointColor(32, contributingFeatures), placement.scale, poseOnly);

    for (const index of JOINT_INDICES) {
      const point = projectPosePoint(landmarks, placement, index);
      if (!point) continue;
      if (poseOnly) continue;

      ctx.beginPath();
      ctx.arc(point.x, point.y, index === 0 ? 3.6 : 3.1, 0, Math.PI * 2);
      ctx.fillStyle = '#07131a';
      ctx.globalAlpha = 0.98;
      ctx.fill();
      ctx.strokeStyle = getJointColor(index, contributingFeatures);
      ctx.globalAlpha = 0.9;
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }

    const ballPoint =
      footballContext && ['far', 'support'].includes(footballContext.ballAccess)
        ? projectPitchPoint(footballContext.ballPosition, width, height)
        : displayPose.ballAnchor
          ? projectBodyPoint(displayPose.ballAnchor, landmarks, placement)
          : footballContext
            ? projectPitchPoint(footballContext.ballPosition, width, height)
            : null;

    if (ballPoint && poseOnly) {
      const toeCandidates = [leftToe, rightToe].filter((point): point is ScreenPoint => point !== null);
      const strikingToe = toeCandidates.sort((a, b) => {
        const distanceA = Math.hypot(a.x - ballPoint.x, a.y - ballPoint.y);
        const distanceB = Math.hypot(b.x - ballPoint.x, b.y - ballPoint.y);
        return distanceA - distanceB;
      })[0];

      if (strikingToe) {
        const control = {
          x: lerp(strikingToe.x, ballPoint.x, 0.45) + (ballPoint.y - strikingToe.y) * 0.18,
          y: Math.min(strikingToe.y, ballPoint.y) - placement.scale * 0.16,
        };

        ctx.beginPath();
        ctx.moveTo(strikingToe.x, strikingToe.y);
        ctx.quadraticCurveTo(control.x, control.y, ballPoint.x, ballPoint.y);
      ctx.strokeStyle = 'rgba(236, 245, 247, 0.34)';
        ctx.lineWidth = 2;
        ctx.setLineDash([8, 8]);
        ctx.globalAlpha = 1;
        ctx.stroke();
        ctx.setLineDash([]);
      }
    }

    if (ballPoint) {
      const radius = poseOnly ? 10 : 8;
      ctx.beginPath();
      ctx.arc(ballPoint.x, ballPoint.y, radius, 0, Math.PI * 2);
      ctx.fillStyle = poseOnly ? 'rgba(247, 248, 244, 0.98)' : '#f6f7fb';
      ctx.globalAlpha = 0.96;
      ctx.fill();
      ctx.strokeStyle = '#0f1720';
      ctx.globalAlpha = 0.78;
      ctx.lineWidth = 1.4;
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(ballPoint.x, ballPoint.y, radius * 1.9, 0, Math.PI * 2);
      ctx.strokeStyle = '#f6f7fb';
      ctx.globalAlpha = poseOnly ? 0.18 : 0.1;
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    ctx.restore();
    previousPoseRef.current = landmarks;
  }, [contributingFeatures, displayPose, footballContext, height, poseOnly, width]);

  useEffect(() => {
    cancelAnimationFrame(animationFrameRef.current);
    animationFrameRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(animationFrameRef.current);
  }, [draw]);

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      className="absolute inset-0 w-full h-full pointer-events-none"
    />
  );
}
