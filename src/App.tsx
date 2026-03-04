import { useState, useEffect, useRef, useCallback } from 'react';
import type {
  DemoFrame,
  ScenarioInfo,
  GaitMetricsSnapshot,
  AnomalyResult,
  SignalEvent,
} from './types/index.ts';
import { DemoController } from './demo/DemoController.ts';
import type { PlaybackSpeed } from './demo/DemoController.ts';
import VideoPanel from './ui/VideoPanel.tsx';
import GaitTimeline from './ui/GaitTimeline.tsx';
import AnomalyAlert from './ui/AnomalyAlert.tsx';
import PlayerProfile from './ui/PlayerProfile.tsx';
import BaselineComparison from './ui/BaselineComparison.tsx';
import BettingSignalPanel from './ui/BettingSignalPanel.tsx';

export default function App() {
  const controllerRef = useRef<DemoController | null>(null);
  const [scenarios, setScenarios] = useState<ScenarioInfo[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [currentFrame, setCurrentFrame] = useState<DemoFrame | null>(null);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState<PlaybackSpeed>(1);
  const [loading, setLoading] = useState(true);

  const [gaitHistory, setGaitHistory] = useState<GaitMetricsSnapshot[]>([]);
  const [anomalyHistory, setAnomalyHistory] = useState<AnomalyResult[]>([]);
  const [signalEvents, setSignalEvents] = useState<SignalEvent[]>([]);
  const lastSignalStateRef = useRef<string>('monitoring');

  const handleFrame = useCallback((frame: DemoFrame) => {
    setCurrentFrame(frame);

    setGaitHistory((prev) => {
      const last = prev[prev.length - 1];
      if (last && last.timestampMs === frame.gaitMetrics.timestampMs) return prev;
      const next = [...prev, frame.gaitMetrics];
      return next.length > 1800 ? next.slice(-1800) : next;
    });

    setAnomalyHistory((prev) => {
      const last = prev[prev.length - 1];
      if (last && last.timestampMs === frame.anomalyResult.timestampMs) return prev;
      const next = [...prev, frame.anomalyResult];
      return next.length > 1800 ? next.slice(-1800) : next;
    });

    // Detect signal state transitions
    const newState = frame.signalState.current;
    if (newState !== 'monitoring' && newState !== lastSignalStateRef.current) {
      const eventType =
        newState === 'alert' ? 'alert_triggered' as const :
        newState === 'confirmed' ? 'signal_confirmed' as const :
        'signal_actionable' as const;

      const evt: SignalEvent = {
        timestampMs: frame.timestampMs,
        type: eventType,
        anomalyScore: frame.anomalyResult.compositeScore,
        confidence: frame.anomalyResult.confidence,
        marketImpact: {
          playerPropDirection: 'under',
          magnitudeEstimate: frame.anomalyResult.compositeScore > 0.6 ? 'major' : 'moderate',
          affectedMarkets: ['Points O/U', 'PRA', 'Team Spread'],
          estimatedPossessionsToImpact: Math.round(12 - frame.anomalyResult.compositeScore * 8),
        },
        topFeatures: frame.anomalyResult.contributingFeatures.slice(0, 3),
      };
      setSignalEvents((prev) => [...prev, evt]);
    }
    if (newState === 'monitoring' && lastSignalStateRef.current !== 'monitoring') {
      const evt: SignalEvent = {
        timestampMs: frame.timestampMs,
        type: 'signal_cleared',
        anomalyScore: frame.anomalyResult.compositeScore,
        confidence: frame.anomalyResult.confidence,
        marketImpact: {
          playerPropDirection: 'neutral',
          magnitudeEstimate: 'minor',
          affectedMarkets: [],
          estimatedPossessionsToImpact: 0,
        },
        topFeatures: [],
      };
      setSignalEvents((prev) => [...prev, evt]);
    }
    lastSignalStateRef.current = newState;
  }, []);

  // Initialize controller
  useEffect(() => {
    const controller = new DemoController({
      onFrame: handleFrame,
      onPlayStateChange: (p) => setPlaying(p),
      onComplete: () => setPlaying(false),
    });

    controllerRef.current = controller;
    const available = controller.getAvailableScenarios();
    setScenarios(available);

    if (available.length > 0) {
      controller.loadScenario(available[0].id);
      setSelectedId(available[0].id);
      setLoading(false);
    }

    return () => controller.destroy();
  }, [handleFrame]);

  const handleScenarioChange = useCallback((id: string) => {
    const ctrl = controllerRef.current;
    if (!ctrl) return;
    setLoading(true);
    setGaitHistory([]);
    setAnomalyHistory([]);
    setSignalEvents([]);
    lastSignalStateRef.current = 'monitoring';
    ctrl.loadScenario(id);
    setSelectedId(id);
    setLoading(false);
  }, []);

  const handlePlayPause = useCallback(() => {
    controllerRef.current?.togglePlayPause();
  }, []);

  const handleSpeedChange = useCallback((s: PlaybackSpeed) => {
    setSpeed(s);
    controllerRef.current?.setSpeed(s);
  }, []);

  const handleReset = useCallback(() => {
    const ctrl = controllerRef.current;
    if (!ctrl) return;
    ctrl.pause();
    ctrl.seek(0);
    setGaitHistory([]);
    setAnomalyHistory([]);
    setSignalEvents([]);
    lastSignalStateRef.current = 'monitoring';
  }, []);

  const scenario = scenarios.find((s) => s.id === selectedId) ?? null;
  const profile = scenario?.playerProfile ?? null;
  const progress = controllerRef.current?.getProgress() ?? 0;

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
            value={selectedId}
            onChange={(e) => handleScenarioChange(e.target.value)}
            className="bg-bg border border-border rounded px-3 py-1.5 text-text-primary font-mono text-xs focus:outline-none focus:border-cyan/50"
          >
            {scenarios.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
          {scenario && (
            <span className="text-text-secondary font-sans text-xs hidden lg:block max-w-96 truncate">
              {scenario.description}
            </span>
          )}
        </div>

        <div className="flex items-center gap-3">
          <div className="flex gap-1">
            {([0.5, 1, 2] as PlaybackSpeed[]).map((s) => (
              <button
                key={s}
                onClick={() => handleSpeedChange(s)}
                className={`font-mono text-xs px-2 py-1 rounded transition-colors ${
                  speed === s ? 'bg-cyan/15 text-cyan' : 'text-text-secondary hover:text-text-primary'
                }`}
              >
                {s}x
              </button>
            ))}
          </div>
          <button
            onClick={handlePlayPause}
            disabled={loading}
            className="bg-cyan/10 border border-cyan/30 text-cyan font-mono text-xs px-4 py-1.5 rounded hover:bg-cyan/20 disabled:opacity-30 transition-colors"
          >
            {playing ? 'PAUSE' : 'PLAY'}
          </button>
          <button
            onClick={handleReset}
            className="text-text-secondary font-mono text-xs px-3 py-1.5 rounded hover:text-text-primary transition-colors"
          >
            RESET
          </button>
        </div>
      </header>

      {/* Progress bar */}
      <div className="h-0.5 bg-bg flex-shrink-0">
        <div className="h-full bg-cyan/40 transition-all duration-100" style={{ width: `${progress * 100}%` }} />
      </div>

      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <p className="text-text-secondary font-mono text-sm animate-pulse">Loading scenario data...</p>
        </div>
      ) : (
        <div className="flex-1 grid grid-cols-12 gap-4 p-4 overflow-hidden min-h-0">
          {/* Left: Video + Skeleton (5/12 ~ 40%) */}
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

          {/* Center: Gait Timeline (4/12 ~ 35%) */}
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

          {/* Right: Anomaly + Betting (3/12 ~ 25%) */}
          <div className="col-span-3 flex flex-col gap-4 overflow-y-auto">
            <AnomalyAlert
              anomalyResult={currentFrame?.anomalyResult ?? null}
              signalState={currentFrame?.signalState ?? null}
            />
            <BettingSignalPanel
              signalState={currentFrame?.signalState ?? null}
              signalHistory={signalEvents}
              anomalyResult={currentFrame?.anomalyResult ?? null}
              playerName={profile?.player.name ?? 'Player'}
            />
          </div>
        </div>
      )}
    </div>
  );
}
