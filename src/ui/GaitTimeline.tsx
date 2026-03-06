import { useMemo, useRef, useState, useEffect } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  ReferenceLine,
  CartesianGrid,
} from 'recharts';
import type { GaitMetricsSnapshot, PricingEdge, EdgeEvent } from '../types/index.ts';

interface GaitTimelineProps {
  gaitHistory: GaitMetricsSnapshot[];
  pricingHistory: PricingEdge[];
  edgeEvents: EdgeEvent[];
  currentTimestampMs: number;
}

interface ChartDataPoint {
  time: number;
  movementSurprise: number;
  contextGate: number;
  edgeScore: number;
  sourceConfidence: number;
}

interface SparklineConfig {
  label: string;
  dataKey: keyof ChartDataPoint;
  color: string;
  thresholds?: number[];
}

const SPARKLINES: SparklineConfig[] = [
  {
    label: 'MOVEMENT SURPRISE',
    dataKey: 'movementSurprise',
    color: '#00f0ff',
    thresholds: [0.35, 0.58],
  },
  {
    label: 'CONTEXT GATE',
    dataKey: 'contextGate',
    color: '#7ce3b0',
    thresholds: [0.5, 0.72],
  },
  {
    label: 'EDGE SCORE',
    dataKey: 'edgeScore',
    color: '#ffb800',
    thresholds: [0.28, 0.56],
  },
  {
    label: 'SOURCE CONFIDENCE',
    dataKey: 'sourceConfidence',
    color: '#ff3344',
    thresholds: [0.74, 0.8],
  },
];

function formatTime(ms: number): string {
  const sec = Math.floor(ms / 1000);
  const min = Math.floor(sec / 60);
  const s = sec % 60;
  return `${min}:${s.toString().padStart(2, '0')}`;
}

function Sparkline({
  data,
  config,
  currentTime,
  edgeEvents,
}: {
  data: ChartDataPoint[];
  config: SparklineConfig;
  currentTime: number;
  edgeEvents: EdgeEvent[];
}) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const [chartWidth, setChartWidth] = useState(0);

  useEffect(() => {
    const el = chartContainerRef.current;
    if (!el) return;

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      setChartWidth(Math.max(0, Math.floor(entry.contentRect.width)));
    });

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const latest = data.length > 0 ? data[data.length - 1][config.dataKey] : 0;

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between px-1">
        <span className="text-text-secondary font-mono text-xs tracking-wider">{config.label}</span>
        <span className="font-mono text-sm font-semibold" style={{ color: config.color }}>
          {latest.toFixed(2)}
        </span>
      </div>
      <div ref={chartContainerRef} className="h-16 w-full min-w-0">
        {chartWidth > 0 && (
          <LineChart width={chartWidth} height={64} data={data} margin={{ top: 2, right: 4, bottom: 2, left: 4 }}>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="#1e1e2e"
              horizontal={true}
              vertical={false}
            />
            <XAxis dataKey="time" hide />
            <YAxis domain={[0, 1]} hide />
            {config.thresholds?.map((value) => (
              <ReferenceLine
                key={value}
                y={value}
                stroke={value >= 0.56 || value >= 0.8 ? '#ff3344' : '#ffb800'}
                strokeDasharray="4 4"
                strokeOpacity={0.32}
              />
            ))}
            <ReferenceLine x={currentTime} stroke="#6b6b80" strokeWidth={1} />
            {edgeEvents.map((event) => (
              <ReferenceLine
                key={`${event.type}-${event.timestampMs}`}
                x={event.timestampMs}
                stroke={event.type === 'edge_priceable' ? '#ff3344' : '#ffb800'}
                strokeWidth={1}
                strokeDasharray="2 2"
              />
            ))}
            <Line
              type="monotone"
              dataKey={config.dataKey}
              stroke={config.color}
              strokeWidth={1.6}
              dot={false}
              isAnimationActive={false}
            />
          </LineChart>
        )}
      </div>
    </div>
  );
}

export default function GaitTimeline({
  gaitHistory,
  pricingHistory,
  edgeEvents,
  currentTimestampMs,
}: GaitTimelineProps) {
  const data = useMemo<ChartDataPoint[]>(() => {
    const windowMs = 60000;
    const startMs = Math.max(0, currentTimestampMs - windowMs);

    return gaitHistory
      .map((frame, index) => ({ frame, edge: pricingHistory[index] }))
      .filter(({ frame }) => frame.timestampMs >= startMs && frame.timestampMs <= currentTimestampMs)
      .map(({ frame, edge }) => {
        return {
          time: frame.timestampMs,
          movementSurprise: edge?.movementSurprise ?? 0,
          contextGate: edge?.contextGate ?? 0,
          edgeScore: edge?.edgeScore ?? 0,
          sourceConfidence: edge?.sourceConfidence ?? 0,
        };
      });
  }, [gaitHistory, pricingHistory, currentTimestampMs]);

  const visibleEvents = useMemo(() => {
    const windowMs = 60000;
    const startMs = Math.max(0, currentTimestampMs - windowMs);
    return edgeEvents.filter((event) => event.timestampMs >= startMs && event.timestampMs <= currentTimestampMs);
  }, [edgeEvents, currentTimestampMs]);

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border bg-surface p-4">
      <div className="flex items-center justify-between">
        <span className="text-text-secondary font-mono text-xs tracking-widest uppercase">
          Pricing Workflow Timeline
        </span>
        <span className="text-text-secondary font-mono text-xs">
          {formatTime(currentTimestampMs)}
        </span>
      </div>
      <div className="rounded border border-border bg-bg/60 px-3 py-2">
        <p className="text-text-secondary font-sans text-xs leading-relaxed">
          Movement surprise stays primary, but the edge only opens when venue context and feed confidence agree.
        </p>
      </div>
      <div className="flex flex-col gap-4">
        {SPARKLINES.map((config) => (
          <Sparkline
            key={config.dataKey}
            data={data}
            config={config}
            currentTime={currentTimestampMs}
            edgeEvents={visibleEvents}
          />
        ))}
      </div>
    </div>
  );
}
