import { useState, useRef, useEffect } from 'react';
import * as d3 from 'd3';
import type { PlayerProfileJSON, GaitMetricsSnapshot } from '../types/index.ts';
import { FEATURE_NAMES, FEATURE_COUNT } from '../types/index.ts';

interface BaselineComparisonProps {
  profile: PlayerProfileJSON | null;
  currentMetrics: GaitMetricsSnapshot | null;
}

type ViewMode = 'radar' | 'bar';

function BarView({ profile, currentVector }: { profile: PlayerProfileJSON; currentVector: number[] }) {
  const features = Array.from({ length: FEATURE_COUNT }, (_, i) => {
    const mean = profile.baselineMean[i];
    const std = profile.baselineStdDev[i];
    const current = currentVector[i];
    const z = std > 0 ? (current - mean) / std : 0;
    return { index: i, name: FEATURE_NAMES[i], mean, std, current, z };
  }).sort((a, b) => Math.abs(b.z) - Math.abs(a.z));

  return (
    <div className="flex flex-col gap-1.5 max-h-80 overflow-y-auto pr-1">
      {features.map((f) => {
        const barPct = Math.min(Math.abs(f.z) / 4 * 100, 100);
        const color = Math.abs(f.z) > 2.5 ? '#ff3344' : Math.abs(f.z) > 1.5 ? '#ffb800' : '#00f0ff';
        const direction = f.z > 0 ? '+' : '';

        return (
          <div key={f.index} className="flex items-center gap-2">
            <span className="text-text-secondary font-mono text-xs w-32 truncate flex-shrink-0">
              {f.name}
            </span>
            <div className="flex-1 h-2 bg-bg rounded-full overflow-hidden relative">
              <div className="absolute inset-y-0 left-1/2 w-px bg-border" />
              {f.z >= 0 ? (
                <div
                  className="absolute inset-y-0 rounded-r-full transition-all duration-300"
                  style={{ left: '50%', width: `${barPct / 2}%`, backgroundColor: color }}
                />
              ) : (
                <div
                  className="absolute inset-y-0 rounded-l-full transition-all duration-300"
                  style={{ right: '50%', width: `${barPct / 2}%`, backgroundColor: color }}
                />
              )}
            </div>
            <span className="font-mono text-xs w-14 text-right" style={{ color }}>
              {direction}{f.z.toFixed(1)}σ
            </span>
          </div>
        );
      })}
    </div>
  );
}

function RadarView({ profile, currentVector }: { profile: PlayerProfileJSON; currentVector: number[] }) {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const size = 240;
    const cx = size / 2;
    const cy = size / 2;
    const radius = 85;
    const n = FEATURE_COUNT;
    const angleSlice = (Math.PI * 2) / n;

    const g = svg.append('g').attr('transform', `translate(${cx},${cy})`);

    // Grid
    for (let l = 1; l <= 4; l++) {
      const r = (radius / 4) * l;
      const pts: [number, number][] = [];
      for (let i = 0; i < n; i++) {
        const angle = angleSlice * i - Math.PI / 2;
        pts.push([r * Math.cos(angle), r * Math.sin(angle)]);
      }
      g.append('polygon')
        .attr('points', pts.map((p) => p.join(',')).join(' '))
        .attr('fill', 'none')
        .attr('stroke', '#1e1e2e')
        .attr('stroke-width', 0.5);
    }

    // Axes
    for (let i = 0; i < n; i++) {
      const angle = angleSlice * i - Math.PI / 2;
      g.append('line')
        .attr('x1', 0).attr('y1', 0)
        .attr('x2', radius * Math.cos(angle))
        .attr('y2', radius * Math.sin(angle))
        .attr('stroke', '#1e1e2e')
        .attr('stroke-width', 0.3);
    }

    const normalize = (val: number, mean: number, std: number) => {
      if (std === 0) return 50;
      const z = (val - mean) / std;
      return Math.max(0, Math.min(100, 50 + z * 15));
    };

    // Baseline
    const bPts: [number, number][] = [];
    for (let i = 0; i < n; i++) {
      const val = normalize(profile.baselineMean[i], profile.baselineMean[i], profile.baselineStdDev[i]);
      const r = (val / 100) * radius;
      const angle = angleSlice * i - Math.PI / 2;
      bPts.push([r * Math.cos(angle), r * Math.sin(angle)]);
    }
    g.append('polygon')
      .attr('points', bPts.map((p) => p.join(',')).join(' '))
      .attr('fill', '#00f0ff')
      .attr('fill-opacity', 0.06)
      .attr('stroke', '#00f0ff')
      .attr('stroke-width', 1)
      .attr('stroke-opacity', 0.4);

    // Current
    const cPts: [number, number][] = [];
    for (let i = 0; i < n; i++) {
      const val = normalize(currentVector[i], profile.baselineMean[i], profile.baselineStdDev[i]);
      const r = (val / 100) * radius;
      const angle = angleSlice * i - Math.PI / 2;
      cPts.push([r * Math.cos(angle), r * Math.sin(angle)]);
    }
    g.append('polygon')
      .attr('points', cPts.map((p) => p.join(',')).join(' '))
      .attr('fill', '#ffb800')
      .attr('fill-opacity', 0.05)
      .attr('stroke', '#ffb800')
      .attr('stroke-width', 1.5)
      .attr('stroke-opacity', 0.7);
  }, [profile, currentVector]);

  return <svg ref={svgRef} viewBox="0 0 240 240" className="w-full" />;
}

export default function BaselineComparison({ profile, currentMetrics }: BaselineComparisonProps) {
  const [mode, setMode] = useState<ViewMode>('bar');

  if (!profile) return null;

  const currentVector = currentMetrics?.featureVector ?? profile.baselineMean;

  return (
    <div className="rounded-lg border border-border bg-surface p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="text-text-secondary font-mono text-xs tracking-widest uppercase">
          Baseline Comparison
        </span>
        <div className="flex gap-1">
          <button
            onClick={() => setMode('radar')}
            className={`font-mono text-xs px-2 py-0.5 rounded ${
              mode === 'radar' ? 'bg-cyan/15 text-cyan' : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            Radar
          </button>
          <button
            onClick={() => setMode('bar')}
            className={`font-mono text-xs px-2 py-0.5 rounded ${
              mode === 'bar' ? 'bg-cyan/15 text-cyan' : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            Bar
          </button>
        </div>
      </div>

      <div className="flex items-center gap-4 text-xs">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-0.5 bg-cyan rounded" />
          <span className="text-text-secondary font-mono">Baseline</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-0.5 bg-amber rounded" />
          <span className="text-text-secondary font-mono">Current</span>
        </div>
      </div>

      {mode === 'radar' ? (
        <RadarView profile={profile} currentVector={currentVector} />
      ) : (
        <BarView profile={profile} currentVector={currentVector} />
      )}
    </div>
  );
}
