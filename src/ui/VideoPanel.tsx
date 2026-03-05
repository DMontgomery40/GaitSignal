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
        {/* Pitch background gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#081810] via-[#0b2016] to-[#07120d]" />
        <div className="absolute inset-0 opacity-25 bg-[linear-gradient(180deg,transparent_0%,rgba(255,255,255,0.03)_50%,transparent_100%)]" />

        {/* Pitch lines */}
        <svg className="absolute inset-0 w-full h-full opacity-10" viewBox="0 0 640 360">
          <rect x="24" y="20" width="592" height="320" fill="none" stroke="#9ef8ca" strokeWidth="1" />
          <line x1="320" y1="20" x2="320" y2="340" stroke="#9ef8ca" strokeWidth="0.75" />
          <circle cx="320" cy="180" r="42" fill="none" stroke="#9ef8ca" strokeWidth="0.75" />
          <circle cx="320" cy="180" r="2.5" fill="#9ef8ca" />
          <rect x="24" y="92" width="92" height="176" fill="none" stroke="#9ef8ca" strokeWidth="0.75" />
          <rect x="24" y="126" width="36" height="108" fill="none" stroke="#9ef8ca" strokeWidth="0.75" />
          <rect x="524" y="92" width="92" height="176" fill="none" stroke="#9ef8ca" strokeWidth="0.75" />
          <rect x="580" y="126" width="36" height="108" fill="none" stroke="#9ef8ca" strokeWidth="0.75" />
          <path d="M116 180a42 42 0 0 0 0-0.1" fill="none" stroke="#9ef8ca" strokeWidth="0.75" />
          <path d="M524 180a42 42 0 0 1 0-0.1" fill="none" stroke="#9ef8ca" strokeWidth="0.75" />
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
          <span className="font-mono text-xs text-text-secondary tracking-wider">LIVE MATCH ANALYSIS</span>
        </div>

        {/* Confidence */}
        {keypoints && (
          <div className="absolute top-3 right-3 bg-bg/80 backdrop-blur-sm rounded px-2 py-1">
            <span className="font-mono text-xs text-text-secondary">
              TRACK {(keypoints.confidence * 100).toFixed(0)}%
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
