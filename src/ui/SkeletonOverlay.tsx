import { useRef, useEffect, useCallback } from 'react';
import type { FilteredKeypoints, FeatureContribution } from '../types/index.ts';

interface SkeletonOverlayProps {
  keypoints: FilteredKeypoints | null;
  contributingFeatures: FeatureContribution[];
  width: number;
  height: number;
}

const CONNECTIONS: [keyof FilteredKeypoints, keyof FilteredKeypoints][] = [
  ['leftShoulder', 'rightShoulder'],
  ['leftShoulder', 'leftHip'],
  ['rightShoulder', 'rightHip'],
  ['leftHip', 'rightHip'],
  ['leftHip', 'leftKnee'],
  ['rightHip', 'rightKnee'],
  ['leftKnee', 'leftAnkle'],
  ['rightKnee', 'rightAnkle'],
  ['leftAnkle', 'leftHeel'],
  ['rightAnkle', 'rightHeel'],
  ['leftAnkle', 'leftFootIndex'],
  ['rightAnkle', 'rightFootIndex'],
  ['leftHeel', 'leftFootIndex'],
  ['rightHeel', 'rightFootIndex'],
];

const JOINT_KEYS: (keyof FilteredKeypoints)[] = [
  'leftShoulder', 'rightShoulder',
  'leftHip', 'rightHip',
  'leftKnee', 'rightKnee',
  'leftAnkle', 'rightAnkle',
  'leftHeel', 'rightHeel',
  'leftFootIndex', 'rightFootIndex',
];

const FEATURE_JOINT_MAP: Record<string, (keyof FilteredKeypoints)[]> = {
  'L Knee Flexion': ['leftKnee'],
  'R Knee Flexion': ['rightKnee'],
  'Knee Flex. Asym.': ['leftKnee', 'rightKnee'],
  'L Hip Flexion': ['leftHip'],
  'R Hip Flexion': ['rightHip'],
  'Hip Flex. Asym.': ['leftHip', 'rightHip'],
  'L Ankle Dorsiflex.': ['leftAnkle'],
  'R Ankle Dorsiflex.': ['rightAnkle'],
  'Ankle Asym.': ['leftAnkle', 'rightAnkle'],
  'Stride Len. L': ['leftHeel', 'leftFootIndex'],
  'Stride Len. R': ['rightHeel', 'rightFootIndex'],
  'Ground Contact L': ['leftFootIndex', 'leftHeel'],
  'Ground Contact R': ['rightFootIndex', 'rightHeel'],
  'Trunk Lean': ['leftShoulder', 'rightShoulder'],
  'Lat. Trunk Tilt': ['leftShoulder', 'rightShoulder'],
};

const COLOR_NORMAL = '#00f0ff';
const COLOR_ELEVATED = '#ffb800';
const COLOR_CRITICAL = '#ff3344';

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function getJointColor(jointKey: string, contributingFeatures: FeatureContribution[]): string {
  let maxContrib = 0;
  for (const feat of contributingFeatures) {
    const joints = FEATURE_JOINT_MAP[feat.featureName];
    if (joints && joints.includes(jointKey as keyof FilteredKeypoints)) {
      maxContrib = Math.max(maxContrib, feat.contribution);
    }
  }
  if (maxContrib > 0.5) return COLOR_CRITICAL;
  if (maxContrib > 0.2) return COLOR_ELEVATED;
  return COLOR_NORMAL;
}

export default function SkeletonOverlay({ keypoints, contributingFeatures, width, height }: SkeletonOverlayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const prevKeypointsRef = useRef<FilteredKeypoints | null>(null);
  const animFrameRef = useRef<number>(0);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !keypoints) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const prev = prevKeypointsRef.current;
    const lerp = 0.3;

    const getPos = (key: keyof FilteredKeypoints) => {
      const pt = keypoints[key];
      if (typeof pt !== 'object' || pt === null || !('x' in pt)) return null;
      const current = pt as { x: number; y: number };
      if (prev) {
        const prevPt = prev[key];
        if (typeof prevPt === 'object' && prevPt !== null && 'x' in prevPt) {
          const p = prevPt as { x: number; y: number };
          return {
            x: p.x + (current.x - p.x) * lerp,
            y: p.y + (current.y - p.y) * lerp,
          };
        }
      }
      return { x: current.x, y: current.y };
    };

    ctx.clearRect(0, 0, width, height);

    const leftShoulder = getPos('leftShoulder');
    const rightShoulder = getPos('rightShoulder');
    const leftHip = getPos('leftHip');
    const rightHip = getPos('rightHip');
    const leftAnkle = getPos('leftAnkle');
    const rightAnkle = getPos('rightAnkle');

    // Draw a lightweight torso + head so the silhouette reads as a person.
    if (leftShoulder && rightShoulder && leftHip && rightHip) {
      const shoulderMid = {
        x: (leftShoulder.x + rightShoulder.x) / 2,
        y: (leftShoulder.y + rightShoulder.y) / 2,
      };
      const hipMid = {
        x: (leftHip.x + rightHip.x) / 2,
        y: (leftHip.y + rightHip.y) / 2,
      };

      ctx.beginPath();
      ctx.moveTo(leftShoulder.x * width, leftShoulder.y * height);
      ctx.lineTo(rightShoulder.x * width, rightShoulder.y * height);
      ctx.lineTo(rightHip.x * width, rightHip.y * height);
      ctx.lineTo(leftHip.x * width, leftHip.y * height);
      ctx.closePath();
      ctx.fillStyle = '#00f0ff';
      ctx.globalAlpha = 0.08;
      ctx.fill();

      ctx.beginPath();
      ctx.moveTo(shoulderMid.x * width, shoulderMid.y * height);
      ctx.lineTo(hipMid.x * width, hipMid.y * height);
      ctx.strokeStyle = '#7ec7d2';
      ctx.lineWidth = 1.5;
      ctx.globalAlpha = 0.5;
      ctx.stroke();

      const head = {
        x: shoulderMid.x + (hipMid.x - shoulderMid.x) * 0.12,
        y: shoulderMid.y - 0.12,
      };
      ctx.beginPath();
      ctx.arc(head.x * width, head.y * height, 6, 0, Math.PI * 2);
      ctx.fillStyle = '#00f0ff';
      ctx.globalAlpha = 0.14;
      ctx.fill();
      ctx.strokeStyle = '#7ec7d2';
      ctx.globalAlpha = 0.45;
      ctx.lineWidth = 1.2;
      ctx.stroke();

      // Approximate arm swing from ankle phase so upper-body motion is interpretable.
      if (leftAnkle && rightAnkle) {
        const phaseDelta = clamp((leftAnkle.x - rightAnkle.x) * 2.4, -0.06, 0.06);
        const leftElbow = {
          x: leftShoulder.x - 0.028 - phaseDelta,
          y: leftShoulder.y + 0.11,
        };
        const rightElbow = {
          x: rightShoulder.x + 0.028 + phaseDelta,
          y: rightShoulder.y + 0.11,
        };
        const leftWrist = {
          x: leftElbow.x - 0.015 - phaseDelta * 0.6,
          y: leftElbow.y + 0.1,
        };
        const rightWrist = {
          x: rightElbow.x + 0.015 + phaseDelta * 0.6,
          y: rightElbow.y + 0.1,
        };

        ctx.strokeStyle = '#7ec7d2';
        ctx.globalAlpha = 0.6;
        ctx.lineWidth = 2.0;
        ctx.beginPath();
        ctx.moveTo(leftShoulder.x * width, leftShoulder.y * height);
        ctx.lineTo(leftElbow.x * width, leftElbow.y * height);
        ctx.lineTo(leftWrist.x * width, leftWrist.y * height);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(rightShoulder.x * width, rightShoulder.y * height);
        ctx.lineTo(rightElbow.x * width, rightElbow.y * height);
        ctx.lineTo(rightWrist.x * width, rightWrist.y * height);
        ctx.stroke();
      }
    }

    // Draw connections
    for (const [a, b] of CONNECTIONS) {
      const posA = getPos(a);
      const posB = getPos(b);
      if (!posA || !posB) continue;

      const colorA = getJointColor(a, contributingFeatures);
      const colorB = getJointColor(b, contributingFeatures);

      ctx.beginPath();
      ctx.moveTo(posA.x * width, posA.y * height);
      ctx.lineTo(posB.x * width, posB.y * height);

      if (colorA === colorB) {
        ctx.strokeStyle = colorA;
      } else {
        const grad = ctx.createLinearGradient(
          posA.x * width, posA.y * height,
          posB.x * width, posB.y * height
        );
        grad.addColorStop(0, colorA);
        grad.addColorStop(1, colorB);
        ctx.strokeStyle = grad;
      }
      ctx.lineWidth = 2.0;
      ctx.globalAlpha = 0.72;
      ctx.stroke();
    }

    // Draw joints
    for (const key of JOINT_KEYS) {
      const pos = getPos(key);
      if (!pos) continue;
      const color = getJointColor(key, contributingFeatures);
      const isAnomaly = color !== COLOR_NORMAL;

      ctx.beginPath();
      ctx.arc(pos.x * width, pos.y * height, isAnomaly ? 4.8 : 3.2, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.globalAlpha = 0.92;
      ctx.fill();

      if (isAnomaly) {
        ctx.beginPath();
        ctx.arc(pos.x * width, pos.y * height, 8.2, 0, Math.PI * 2);
        ctx.strokeStyle = color;
        ctx.lineWidth = 1.2;
        ctx.globalAlpha = 0.3;
        ctx.stroke();
      }
    }

    ctx.globalAlpha = 1;
    prevKeypointsRef.current = keypoints;
  }, [keypoints, contributingFeatures, width, height]);

  useEffect(() => {
    const animate = () => {
      draw();
      animFrameRef.current = requestAnimationFrame(animate);
    };
    animFrameRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animFrameRef.current);
  }, [draw]);

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      className="absolute inset-0 pointer-events-none"
    />
  );
}
