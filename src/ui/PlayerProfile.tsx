import { useRef, useEffect } from 'react';
import * as d3 from 'd3';
import type { PlayerProfileJSON, GaitMetricsSnapshot } from '../types/index.ts';
import { FEATURE_NAMES } from '../types/index.ts';

interface PlayerProfileProps {
  profile: PlayerProfileJSON | null;
  currentMetrics: GaitMetricsSnapshot | null;
}

const RADAR_FEATURES = [0, 1, 3, 4, 6, 7, 9, 10, 18, 19];
const RADAR_LABELS = RADAR_FEATURES.map((i) => FEATURE_NAMES[i]);

function normalizeValue(value: number, mean: number, stddev: number): number {
  if (stddev === 0) return 50;
  const z = (value - mean) / stddev;
  return Math.max(0, Math.min(100, 50 + z * 15));
}

function RadarChart({
  profile,
  currentVector,
}: {
  profile: PlayerProfileJSON;
  currentVector: number[] | null;
}) {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const size = 200;
    const cx = size / 2;
    const cy = size / 2;
    const radius = 75;
    const n = RADAR_FEATURES.length;
    const angleSlice = (Math.PI * 2) / n;

    const g = svg.append('g').attr('transform', `translate(${cx},${cy})`);

    // Grid
    const levels = 4;
    for (let l = 1; l <= levels; l++) {
      const r = (radius / levels) * l;
      const points: [number, number][] = [];
      for (let i = 0; i < n; i++) {
        const angle = angleSlice * i - Math.PI / 2;
        points.push([r * Math.cos(angle), r * Math.sin(angle)]);
      }
      g.append('polygon')
        .attr('points', points.map((p) => p.join(',')).join(' '))
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
        .attr('stroke-width', 0.5);

      const labelR = radius + 14;
      g.append('text')
        .attr('x', labelR * Math.cos(angle))
        .attr('y', labelR * Math.sin(angle))
        .attr('text-anchor', 'middle')
        .attr('dominant-baseline', 'middle')
        .attr('fill', '#6b6b80')
        .attr('font-size', '6px')
        .attr('font-family', 'JetBrains Mono, monospace')
        .text(RADAR_LABELS[i]);
    }

    // Baseline polygon
    const baselinePoints: [number, number][] = RADAR_FEATURES.map((fi, i) => {
      const val = normalizeValue(profile.baselineMean[fi], profile.baselineMean[fi], profile.baselineStdDev[fi]);
      const r = (val / 100) * radius;
      const angle = angleSlice * i - Math.PI / 2;
      return [r * Math.cos(angle), r * Math.sin(angle)];
    });

    g.append('polygon')
      .attr('points', baselinePoints.map((p) => p.join(',')).join(' '))
      .attr('fill', '#00f0ff')
      .attr('fill-opacity', 0.08)
      .attr('stroke', '#00f0ff')
      .attr('stroke-width', 1)
      .attr('stroke-opacity', 0.4);

    // Current polygon
    if (currentVector && currentVector.length >= 20) {
      const currentPoints: [number, number][] = RADAR_FEATURES.map((fi, i) => {
        const val = normalizeValue(currentVector[fi], profile.baselineMean[fi], profile.baselineStdDev[fi]);
        const r = (val / 100) * radius;
        const angle = angleSlice * i - Math.PI / 2;
        return [r * Math.cos(angle), r * Math.sin(angle)];
      });

      g.append('polygon')
        .attr('points', currentPoints.map((p) => p.join(',')).join(' '))
        .attr('fill', '#ffb800')
        .attr('fill-opacity', 0.06)
        .attr('stroke', '#ffb800')
        .attr('stroke-width', 1.5)
        .attr('stroke-opacity', 0.8);

      // Deviation dots
      currentPoints.forEach((pt, i) => {
        const fi = RADAR_FEATURES[i];
        const z = Math.abs((currentVector[fi] - profile.baselineMean[fi]) / (profile.baselineStdDev[fi] || 1));
        if (z > 1.5) {
          g.append('circle')
            .attr('cx', pt[0]).attr('cy', pt[1])
            .attr('r', 3)
            .attr('fill', z > 2.5 ? '#ff3344' : '#ffb800');
        }
      });
    }
  }, [profile, currentVector]);

  return <svg ref={svgRef} viewBox="0 0 200 200" className="w-full max-w-56" />;
}

export default function PlayerProfile({ profile, currentMetrics }: PlayerProfileProps) {
  if (!profile) {
    return (
      <div className="rounded-lg border border-border bg-surface p-4">
        <span className="text-text-secondary font-mono text-xs">No player selected</span>
      </div>
    );
  }

  const { player } = profile;

  return (
    <div className="rounded-lg border border-border bg-surface p-4 flex flex-col gap-3">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-full bg-bg border border-border flex items-center justify-center">
          <span className="font-mono text-cyan text-lg font-semibold">#{player.jerseyNumber}</span>
        </div>
        <div>
          <h3 className="font-sans text-text-primary text-sm font-semibold">{player.name}</h3>
          <p className="text-text-secondary text-xs font-sans">
            {player.team} | {player.position} | {player.height}
          </p>
        </div>
      </div>

      <div className="flex justify-center">
        <RadarChart
          profile={profile}
          currentVector={currentMetrics?.featureVector ?? null}
        />
      </div>

      <div className="grid grid-cols-2 gap-2 text-xs font-mono">
        <div>
          <span className="text-text-secondary block">Baseline Games</span>
          <span className="text-text-primary">{profile.gamesInBaseline}</span>
        </div>
        <div>
          <span className="text-text-secondary block">Last Update</span>
          <span className="text-text-primary">{profile.lastBaselineUpdate}</span>
        </div>
      </div>
      <p className="text-text-secondary font-mono text-xs leading-tight">
        {profile.modelVersion} | {profile.modelParams}
      </p>
    </div>
  );
}
