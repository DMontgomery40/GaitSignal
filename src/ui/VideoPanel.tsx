import { useRef, useState, useEffect } from 'react';
import type { FilteredKeypoints, FeatureContribution, NarrativeOverlay as NarrativeOverlayType, SeverityLevel } from '../types/index.ts';
import SkeletonOverlay from './SkeletonOverlay.tsx';
import NarrativeOverlay from './NarrativeOverlay.tsx';

interface VideoPanelProps {
  keypoints: FilteredKeypoints | null;
  contributingFeatures: FeatureContribution[];
  severity: SeverityLevel;
  narrativeOverlay: NarrativeOverlayType | null;
}

const GLOW_COLORS: Record<SeverityLevel, string> = {
  normal: '0 0 20px rgba(0, 240, 255, 0.15)',
  elevated: '0 0 25px rgba(255, 184, 0, 0.2)',
  significant: '0 0 30px rgba(255, 184, 0, 0.3)',
  critical: '0 0 35px rgba(255, 51, 68, 0.35)',
};

const BORDER_COLORS: Record<SeverityLevel, string> = {
  normal: 'border-cyan/20',
  elevated: 'border-amber/30',
  significant: 'border-amber/40',
  critical: 'border-red/40',
};

export default function VideoPanel({ keypoints, contributingFeatures, severity, narrativeOverlay }: VideoPanelProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 640, height: 360 });

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const obs = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) {
        const w = entry.contentRect.width;
        setDimensions({ width: w, height: Math.round(w * 9 / 16) });
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
        {/* Court background gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-surface via-bg to-surface" />

        {/* Court lines */}
        <svg className="absolute inset-0 w-full h-full opacity-10" viewBox="0 0 640 360">
          <rect x="40" y="20" width="560" height="320" fill="none" stroke="#00f0ff" strokeWidth="1" />
          <line x1="320" y1="20" x2="320" y2="340" stroke="#00f0ff" strokeWidth="0.5" />
          <circle cx="320" cy="180" r="60" fill="none" stroke="#00f0ff" strokeWidth="0.5" />
          <rect x="40" y="100" width="140" height="160" fill="none" stroke="#00f0ff" strokeWidth="0.5" />
          <rect x="460" y="100" width="140" height="160" fill="none" stroke="#00f0ff" strokeWidth="0.5" />
        </svg>

        {/* Skeleton overlay */}
        <SkeletonOverlay
          keypoints={keypoints}
          contributingFeatures={contributingFeatures}
          width={dimensions.width}
          height={dimensions.height}
        />

        {/* Narrative overlay */}
        <NarrativeOverlay overlay={narrativeOverlay} />

        {/* Live badge */}
        <div className="absolute top-3 left-3 flex items-center gap-1.5 bg-bg/80 backdrop-blur-sm rounded px-2 py-1">
          <div className="w-1.5 h-1.5 rounded-full bg-red animate-pulse" />
          <span className="font-mono text-xs text-text-secondary tracking-wider">LIVE ANALYSIS</span>
        </div>

        {/* Confidence */}
        {keypoints && (
          <div className="absolute top-3 right-3 bg-bg/80 backdrop-blur-sm rounded px-2 py-1">
            <span className="font-mono text-xs text-text-secondary">
              POSE {(keypoints.confidence * 100).toFixed(0)}%
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
