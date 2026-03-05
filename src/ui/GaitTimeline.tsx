import { useMemo, useRef, useState, useEffect } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  ReferenceLine,
  CartesianGrid,
} from 'recharts';
import type { GaitMetricsSnapshot, AnomalyResult, SignalEvent } from '../types/index.ts';

interface GaitTimelineProps {
  gaitHistory: GaitMetricsSnapshot[];
  anomalyHistory: AnomalyResult[];
  signalEvents: SignalEvent[];
  currentTimestampMs: number;
  onSeek?: (timestampMs: number) => void;
}

interface ChartDataPoint {
  time: number;
  timeLabel: string;
  kneeAsym: number;
  strideAsym: number;
  contactAsym: number;
  anomalyScore: number;
}

function formatTime(ms: number): string {
  const sec = Math.floor(ms / 1000);
  const min = Math.floor(sec / 60);
  const s = sec % 60;
  return `${min}:${s.toString().padStart(2, '0')}`;
}

interface SparklineConfig {
  label: string;
  dataKey: keyof ChartDataPoint;
  color: string;
  domain: [number, number];
  unit: string;
  thresholds?: { value: number; color: string }[];
}

const SPARKLINES: SparklineConfig[] = [
  {
    label: 'LOAD ASYM.',
    dataKey: 'kneeAsym',
    color: '#00f0ff',
    domain: [0, 20],
    unit: '%',
    thresholds: [{ value: 8, color: '#ffb800' }],
  },
  {
    label: 'STRIDE COMPRESSION',
    dataKey: 'strideAsym',
    color: '#00f0ff',
    domain: [0, 20],
    unit: '%',
    thresholds: [{ value: 8, color: '#ffb800' }],
  },
  {
    label: 'GROUND CONTACT ASYM.',
    dataKey: 'contactAsym',
    color: '#00f0ff',
    domain: [0, 20],
    unit: '%',
    thresholds: [{ value: 8, color: '#ffb800' }],
  },
  {
    label: 'ANOMALY SCORE',
    dataKey: 'anomalyScore',
    color: '#00f0ff',
    domain: [0, 1],
    unit: '',
    thresholds: [
      { value: 0.3, color: '#ffb800' },
      { value: 0.5, color: '#ff3344' },
    ],
  },
];

function Sparkline({
  data,
  config,
  currentTime,
  signalEvents,
}: {
  data: ChartDataPoint[];
  config: SparklineConfig;
  currentTime: number;
  signalEvents: SignalEvent[];
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

  const latestValue = data.length > 0 ? data[data.length - 1][config.dataKey] : 0;
  const numValue = typeof latestValue === 'number' ? latestValue : 0;

  let valueColor = config.color;
  if (config.thresholds) {
    for (const t of config.thresholds) {
      if (numValue >= t.value) valueColor = t.color;
    }
  }

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between px-1">
        <span className="text-text-secondary font-mono text-xs tracking-wider">{config.label}</span>
        <span className="font-mono text-sm font-semibold" style={{ color: valueColor }}>
          {numValue.toFixed(config.dataKey === 'anomalyScore' ? 2 : 1)}{config.unit}
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
            <YAxis domain={config.domain} hide />
            {config.thresholds?.map((t, i) => (
              <ReferenceLine
                key={i}
                y={t.value}
                stroke={t.color}
                strokeDasharray="4 4"
                strokeOpacity={0.4}
              />
            ))}
            <ReferenceLine x={currentTime} stroke="#6b6b80" strokeWidth={1} />
            {signalEvents.map((evt, i) => (
              <ReferenceLine
                key={`evt-${i}`}
                x={evt.timestampMs}
                stroke={evt.type === 'signal_actionable' ? '#ff3344' : '#ffb800'}
                strokeWidth={1}
                strokeDasharray="2 2"
              />
            ))}
            <Line
              type="monotone"
              dataKey={config.dataKey}
              stroke={config.color}
              strokeWidth={1.5}
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
  anomalyHistory,
  signalEvents,
  currentTimestampMs,
}: GaitTimelineProps) {
  const data = useMemo<ChartDataPoint[]>(() => {
    const windowMs = 60000;
    const startMs = Math.max(0, currentTimestampMs - windowMs);

    return gaitHistory
      .filter((g) => g.timestampMs >= startMs && g.timestampMs <= currentTimestampMs)
      .map((g) => {
        const anomaly = anomalyHistory.find((a) => a.timestampMs === g.timestampMs);
        return {
          time: g.timestampMs,
          timeLabel: formatTime(g.timestampMs),
          kneeAsym: g.symmetry.kneeFlexionAsymmetry,
          strideAsym: g.symmetry.strideLengthAsymmetry,
          contactAsym: g.symmetry.groundContactAsymmetry,
          anomalyScore: anomaly?.compositeScore ?? 0,
        };
      });
  }, [gaitHistory, anomalyHistory, currentTimestampMs]);

  const visibleEvents = useMemo(() => {
    const windowMs = 60000;
    const startMs = Math.max(0, currentTimestampMs - windowMs);
    return signalEvents.filter((e) => e.timestampMs >= startMs && e.timestampMs <= currentTimestampMs);
  }, [signalEvents, currentTimestampMs]);

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border bg-surface p-4">
      <div className="flex items-center justify-between">
        <span className="text-text-secondary font-mono text-xs tracking-widest uppercase">
          Movement Metrics Timeline
        </span>
        <span className="text-text-secondary font-mono text-xs">
          {formatTime(currentTimestampMs)}
        </span>
      </div>
      <div className="flex flex-col gap-4">
        {SPARKLINES.map((config) => (
          <Sparkline
            key={config.dataKey}
            data={data}
            config={config}
            currentTime={currentTimestampMs}
            signalEvents={visibleEvents}
          />
        ))}
      </div>
    </div>
  );
}
