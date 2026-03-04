import { useState, useEffect, useCallback, useRef } from 'react';
import type {
  DemoFrame,
  ScenarioInfo,
  GaitMetricsSnapshot,
  AnomalyResult,
  SignalEvent,
  SignalState,
  PlayerProfileJSON,
} from '../types/index.ts';
import VideoPanel from './VideoPanel.tsx';
import GaitTimeline from './GaitTimeline.tsx';
import AnomalyAlert from './AnomalyAlert.tsx';
import PlayerProfile from './PlayerProfile.tsx';
import BaselineComparison from './BaselineComparison.tsx';
import BettingSignalPanel from './BettingSignalPanel.tsx';

interface DashboardProps {
  scenarios: ScenarioInfo[];
  loadScenario: (id: string) => Promise<DemoFrame[]>;
}

type PlaybackSpeed = 0.5 | 1 | 2;

export default function Dashboard({ scenarios, loadScenario }: DashboardProps) {
  const [selectedScenarioId, setSelectedScenarioId] = useState<string>(scenarios[0]?.id ?? '');
  const [scenario, setScenario] = useState<ScenarioInfo | null>(null);
  const [frames, setFrames] = useState<DemoFrame[]>([]);
  const [frameIndex, setFrameIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState<PlaybackSpeed>(1);
  const [loading, setLoading] = useState(true);

  const [gaitHistory, setGaitHistory] = useState<GaitMetricsSnapshot[]>([]);
  const [anomalyHistory, setAnomalyHistory] = useState<AnomalyResult[]>([]);
  const [signalEvents, setSignalEvents] = useState<SignalEvent[]>([]);

  const playIntervalRef = useRef<number>(0);

  const currentFrame: DemoFrame | null = frames[frameIndex] ?? null;
  const profile: PlayerProfileJSON | null = scenario?.playerProfile ?? null;

  // Load scenario data
  const handleLoadScenario = useCallback(async (id: string) => {
    setLoading(true);
    setPlaying(false);
    setFrameIndex(0);
    setGaitHistory([]);
    setAnomalyHistory([]);
    setSignalEvents([]);

    const info = scenarios.find((s) => s.id === id);
    setScenario(info ?? null);
    setSelectedScenarioId(id);

    const data = await loadScenario(id);
    setFrames(data);
    setLoading(false);
  }, [scenarios, loadScenario]);

  // Load first scenario on mount
  useEffect(() => {
    if (scenarios.length > 0) {
      handleLoadScenario(scenarios[0].id);
    }
  }, [scenarios, handleLoadScenario]);

  // Playback loop
  useEffect(() => {
    if (!playing || frames.length === 0) return;

    const intervalMs = Math.round(33 / speed);

    playIntervalRef.current = window.setInterval(() => {
      setFrameIndex((prev) => {
        if (prev >= frames.length - 1) {
          setPlaying(false);
          return prev;
        }
        return prev + 1;
      });
    }, intervalMs);

    return () => window.clearInterval(playIntervalRef.current);
  }, [playing, speed, frames.length]);

  // Accumulate history on frame advance
  useEffect(() => {
    if (!currentFrame) return;

    setGaitHistory((prev) => {
      const last = prev[prev.length - 1];
      if (last && last.timestampMs === currentFrame.gaitMetrics.timestampMs) return prev;
      const next = [...prev, currentFrame.gaitMetrics];
      if (next.length > 1800) return next.slice(-1800);
      return next;
    });

    setAnomalyHistory((prev) => {
      const last = prev[prev.length - 1];
      if (last && last.timestampMs === currentFrame.anomalyResult.timestampMs) return prev;
      const next = [...prev, currentFrame.anomalyResult];
      if (next.length > 1800) return next.slice(-1800);
      return next;
    });

    // Collect signal events from state transitions
    const ss = currentFrame.signalState;
    if (ss.current !== 'monitoring' && ss.lastAnomalyResult) {
      setSignalEvents((prev) => {
        const last = prev[prev.length - 1];
        const eventType =
          ss.current === 'alert' ? 'alert_triggered' as const :
          ss.current === 'confirmed' ? 'signal_confirmed' as const :
          'signal_actionable' as const;

        if (last && last.type === eventType && Math.abs(last.timestampMs - currentFrame.timestampMs) < 2000) {
          return prev;
        }

        // Only add events at state transitions
        if (prev.length === 0 || prev[prev.length - 1].type !== eventType) {
          const evt: SignalEvent = {
            timestampMs: currentFrame.timestampMs,
            type: eventType,
            anomalyScore: currentFrame.anomalyResult.compositeScore,
            confidence: currentFrame.anomalyResult.confidence,
            marketImpact: {
              playerPropDirection: 'under',
              magnitudeEstimate: currentFrame.anomalyResult.compositeScore > 0.6 ? 'major' : 'moderate',
              affectedMarkets: ['Points O/U', 'PRA', 'Team Spread'],
              estimatedPossessionsToImpact: Math.round(12 - currentFrame.anomalyResult.compositeScore * 8),
            },
            topFeatures: currentFrame.anomalyResult.contributingFeatures.slice(0, 3),
          };
          return [...prev, evt];
        }
        return prev;
      });
    }
  }, [currentFrame]);

  const signalState: SignalState | null = currentFrame?.signalState ?? null;
  const progress = frames.length > 0 ? (frameIndex / (frames.length - 1)) * 100 : 0;

  return (
    <div className="flex flex-col h-screen bg-bg">
      {/* Top Bar */}
      <header className="flex items-center justify-between px-6 py-3 border-b border-border bg-surface flex-shrink-0">
        <div className="flex items-center gap-4">
          <h1 className="font-sans text-lg font-bold tracking-tight">
            <span className="text-cyan">GAIT</span>
            <span className="text-text-primary">SIGNAL</span>
          </h1>
          <div className="h-5 w-px bg-border" />
          <select
            value={selectedScenarioId}
            onChange={(e) => handleLoadScenario(e.target.value)}
            className="bg-bg border border-border rounded px-3 py-1.5 text-text-primary font-mono text-xs focus:outline-none focus:border-cyan/50"
          >
            {scenarios.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-3">
          {/* Speed selector */}
          <div className="flex gap-1">
            {([0.5, 1, 2] as PlaybackSpeed[]).map((s) => (
              <button
                key={s}
                onClick={() => setSpeed(s)}
                className={`font-mono text-xs px-2 py-1 rounded ${
                  speed === s ? 'bg-cyan/15 text-cyan' : 'text-text-secondary hover:text-text-primary'
                }`}
              >
                {s}x
              </button>
            ))}
          </div>

          {/* Play/Pause */}
          <button
            onClick={() => setPlaying(!playing)}
            disabled={loading || frames.length === 0}
            className="bg-cyan/10 border border-cyan/30 text-cyan font-mono text-xs px-4 py-1.5 rounded hover:bg-cyan/20 disabled:opacity-30 transition-colors"
          >
            {playing ? 'PAUSE' : 'PLAY'}
          </button>

          {/* Reset */}
          <button
            onClick={() => { setFrameIndex(0); setPlaying(false); setGaitHistory([]); setAnomalyHistory([]); setSignalEvents([]); }}
            className="text-text-secondary font-mono text-xs px-3 py-1.5 rounded hover:text-text-primary transition-colors"
          >
            RESET
          </button>
        </div>
      </header>

      {/* Progress bar */}
      <div className="h-0.5 bg-bg flex-shrink-0">
        <div
          className="h-full bg-cyan/40 transition-all duration-100"
          style={{ width: `${progress}%` }}
        />
      </div>

      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <p className="text-text-secondary font-mono text-sm animate-pulse">Loading scenario data...</p>
        </div>
      ) : (
        /* Three-column layout */
        <div className="flex-1 grid grid-cols-12 gap-4 p-4 overflow-hidden min-h-0">
          {/* Left: Video + Skeleton (40%) */}
          <div className="col-span-5 flex flex-col gap-4 overflow-y-auto">
            <VideoPanel
              keypoints={currentFrame?.keypoints ?? null}
              contributingFeatures={currentFrame?.anomalyResult.contributingFeatures ?? []}
              severity={currentFrame?.anomalyResult.severity ?? 'normal'}
              narrativeOverlay={currentFrame?.narrativeOverlay ?? null}
            />
            <PlayerProfile
              profile={profile}
              currentMetrics={currentFrame?.gaitMetrics ?? null}
            />
          </div>

          {/* Center: Gait Timeline (35%) */}
          <div className="col-span-4 flex flex-col gap-4 overflow-y-auto">
            <GaitTimeline
              gaitHistory={gaitHistory}
              anomalyHistory={anomalyHistory}
              signalEvents={signalEvents}
              currentTimestampMs={currentFrame?.timestampMs ?? 0}
            />
            <BaselineComparison
              profile={profile}
              currentMetrics={currentFrame?.gaitMetrics ?? null}
            />
          </div>

          {/* Right: Anomaly + Betting (25%) */}
          <div className="col-span-3 flex flex-col gap-4 overflow-y-auto">
            <AnomalyAlert
              anomalyResult={currentFrame?.anomalyResult ?? null}
              signalState={signalState}
            />
            <BettingSignalPanel
              signalState={signalState}
              signalHistory={signalEvents}
              anomalyResult={currentFrame?.anomalyResult ?? null}
              playerName={profile?.player.name ?? 'Player'}
            />
          </div>
        </div>
      )}

      {/* Scenario description */}
      {scenario && (
        <footer className="px-6 py-2 border-t border-border bg-surface flex-shrink-0">
          <p className="text-text-secondary font-sans text-xs">
            {scenario.description}
          </p>
        </footer>
      )}
    </div>
  );
}
