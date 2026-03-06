import { useRef, useState, useEffect } from 'react';
import type {
  FeatureContribution,
  FootballContext,
  NarrativeOverlay as NarrativeOverlayType,
  PoseDisplayFrame,
  SeverityLevel,
} from '../types/index.ts';
import SkeletonOverlay from './SkeletonOverlay.tsx';
import NarrativeOverlay from './NarrativeOverlay.tsx';
import RealMotionReplay from './RealMotionReplay.tsx';

interface VideoPanelProps {
  displayPose: PoseDisplayFrame | null;
  footballContext: FootballContext | null;
  contributingFeatures: FeatureContribution[];
  severity: SeverityLevel;
  narrativeOverlay: NarrativeOverlayType | null;
  poseOnly?: boolean;
}

const GLOW_COLORS: Record<SeverityLevel, string> = {
  normal: '0 0 20px rgba(0, 240, 255, 0.14)',
  elevated: '0 0 28px rgba(255, 184, 0, 0.2)',
  significant: '0 0 34px rgba(255, 184, 0, 0.26)',
  critical: '0 0 38px rgba(255, 51, 68, 0.3)',
};

const BORDER_COLORS: Record<SeverityLevel, string> = {
  normal: 'border-cyan/20',
  elevated: 'border-amber/30',
  significant: 'border-amber/40',
  critical: 'border-red/40',
};

export default function VideoPanel({
  displayPose,
  footballContext,
  contributingFeatures,
  severity,
  narrativeOverlay,
  poseOnly = false,
}: VideoPanelProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 640, height: 360 });

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const obs = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) {
        const width = entry.contentRect.width;
        setDimensions({ width, height: Math.round((width * 9) / 16) });
      }
    });

    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <div className="flex flex-col gap-2">
      <div
        ref={containerRef}
        className={`relative rounded-lg border ${BORDER_COLORS[severity]} bg-surface overflow-hidden transition-all duration-500`}
        style={{
          aspectRatio: '16/9',
          boxShadow: GLOW_COLORS[severity],
        }}
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(0,240,255,0.08),transparent_40%),radial-gradient(circle_at_80%_10%,rgba(255,184,0,0.08),transparent_32%),linear-gradient(180deg,#091118_0%,#0b1520_44%,#091018_100%)]" />
        <div className="absolute inset-0 opacity-25 bg-[linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(180deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:32px_32px]" />

        <div className="absolute inset-x-10 bottom-14 h-px bg-cyan/20" />
        <div className="absolute inset-x-0 bottom-24 h-24 bg-[radial-gradient(circle_at_center,rgba(0,240,255,0.06),transparent_70%)]" />

        <RealMotionReplay displayPose={displayPose} poseOnly={poseOnly} />

        {!poseOnly && (
          <div className="absolute inset-0 opacity-28">
            <SkeletonOverlay
              displayPose={displayPose}
              footballContext={footballContext}
              contributingFeatures={contributingFeatures}
              width={dimensions.width}
              height={dimensions.height}
              poseOnly={false}
            />
          </div>
        )}

        {!poseOnly && <NarrativeOverlay overlay={narrativeOverlay} />}

        {!poseOnly && (
          <div className="absolute top-3 left-3 flex items-center gap-1.5 bg-bg/80 backdrop-blur-sm rounded px-2 py-1">
          <div className="w-1.5 h-1.5 rounded-full bg-cyan animate-pulse" />
          <span className="font-mono text-xs text-text-secondary tracking-wider">
            PLAYER MOTION LENS
          </span>
          </div>
        )}

        {displayPose && !poseOnly && (
          <div className="absolute top-3 right-3 bg-bg/80 backdrop-blur-sm rounded px-2 py-1">
            <span className="font-mono text-xs text-text-secondary">
              pose {(displayPose.confidence * 100).toFixed(0)}%
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
