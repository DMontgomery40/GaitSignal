import { useState, useEffect, useRef, useCallback } from 'react';
import type {
  DemoFrame,
  GaitMetricsSnapshot,
  PricingEdge,
  EdgeEvent,
  EdgeEventType,
  EdgeStateType,
} from './types/index.ts';
import { DemoController } from './demo/DemoController.ts';
import type { PlaybackSpeed } from './demo/DemoController.ts';
import { SCENARIOS } from './demo/DemoScenarios.ts';
import { DEMO_CUE_INDEX } from './demo/DemoCueIndex.ts';
import MatchStatePanel from './ui/MatchStatePanel.tsx';
import VideoPanel from './ui/VideoPanel.tsx';
import GaitTimeline from './ui/GaitTimeline.tsx';
import AnomalyAlert from './ui/AnomalyAlert.tsx';
import PlayerProfile from './ui/PlayerProfile.tsx';
import BaselineComparison from './ui/BaselineComparison.tsx';
import BettingSignalPanel from './ui/BettingSignalPanel.tsx';

function formatClock(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  return `${min}:${sec.toString().padStart(2, '0')}`;
}

function transitionEventType(
  previous: EdgeStateType,
  next: EdgeStateType,
): EdgeEventType | null {
  if (next === 'warming' && previous === 'monitoring') return 'edge_opened';
  if (next === 'confirmed') return 'edge_confirmed';
  if (next === 'priceable') return 'edge_priceable';
  if (next === 'monitoring' && previous !== 'monitoring') return 'edge_cleared';
  return null;
}

export default function App() {
  const scenarios = SCENARIOS;
  const searchParams =
    typeof window !== 'undefined'
      ? new URLSearchParams(window.location.search)
      : new URLSearchParams();
  const poseOnlyMode = searchParams.get('view') === 'pose';
  const autoplay = searchParams.get('autoplay') === '1';
  const requestedSeekMs = Number(searchParams.get('seek') ?? '0');
  const requestedScenarioId = searchParams.get('scenario');
  const initialScenarioId =
    (requestedScenarioId && scenarios.some((scenario) => scenario.id === requestedScenarioId)
      ? requestedScenarioId
      : scenarios[0]?.id) ?? '';
  const controllerRef = useRef<DemoController | null>(null);
  const [selectedId, setSelectedId] = useState(initialScenarioId);
  const [currentFrame, setCurrentFrame] = useState<DemoFrame | null>(null);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState<PlaybackSpeed>(1);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [gaitHistory, setGaitHistory] = useState<GaitMetricsSnapshot[]>([]);
  const [pricingHistory, setPricingHistory] = useState<PricingEdge[]>([]);
  const [edgeEvents, setEdgeEvents] = useState<EdgeEvent[]>([]);
  const lastEdgeStateRef = useRef<EdgeStateType>('monitoring');

  const handleFrame = useCallback((frame: DemoFrame) => {
    setCurrentFrame(frame);
    setProgress(controllerRef.current?.getProgress() ?? 0);

    setGaitHistory((prev) => {
      const last = prev[prev.length - 1];
      if (last && last.timestampMs === frame.gaitMetrics.timestampMs) return prev;
      const next = [...prev, frame.gaitMetrics];
      return next.length > 1800 ? next.slice(-1800) : next;
    });

    setPricingHistory((prev) => {
      const last = prev[prev.length - 1];
      if (
        last &&
        last.stateEnteredAt === frame.pricingEdge.stateEnteredAt &&
        Math.abs(last.edgeScore - frame.pricingEdge.edgeScore) < 1e-6
      ) {
        return prev;
      }
      const next = [...prev, frame.pricingEdge];
      return next.length > 1800 ? next.slice(-1800) : next;
    });

    const nextState = frame.pricingEdge.edgeState;
    const eventType = transitionEventType(lastEdgeStateRef.current, nextState);

    if (eventType) {
      const event: EdgeEvent = {
        timestampMs: frame.timestampMs,
        type: eventType,
        edgeScore: frame.pricingEdge.edgeScore,
        movementSurprise: frame.pricingEdge.movementSurprise,
        contextGate: frame.pricingEdge.contextGate,
        sourceConfidence: frame.pricingEdge.sourceConfidence,
        marketFamily: frame.pricingEdge.marketFamily,
        timeToMarketImpact: frame.pricingEdge.timeToMarketImpact,
        topFeatures: frame.anomalyResult.contributingFeatures.slice(0, 3),
      };
      setEdgeEvents((prev) => [...prev, event]);
    }

    lastEdgeStateRef.current = nextState;
  }, []);

  useEffect(() => {
    const controller = new DemoController({
      onFrame: handleFrame,
      onPlayStateChange: (isPlaying) => setPlaying(isPlaying),
      onComplete: () => setPlaying(false),
    });

    controllerRef.current = controller;
    if (initialScenarioId) {
      controller.loadScenario(initialScenarioId);
      if (requestedSeekMs > 0) {
        controller.seek(requestedSeekMs);
      }
      if (autoplay) {
        controller.play();
      }
    }

    return () => controller.destroy();
  }, [autoplay, handleFrame, initialScenarioId, requestedSeekMs]);

  const handleScenarioChange = useCallback((id: string) => {
    const controller = controllerRef.current;
    if (!controller) return;

    setLoading(true);
    setProgress(0);
    setGaitHistory([]);
    setPricingHistory([]);
    setEdgeEvents([]);
    lastEdgeStateRef.current = 'monitoring';
    controller.loadScenario(id);
    setSelectedId(id);
    setLoading(false);
  }, []);

  const handlePlayPause = useCallback(() => {
    controllerRef.current?.togglePlayPause();
  }, []);

  const handleSpeedChange = useCallback((nextSpeed: PlaybackSpeed) => {
    setSpeed(nextSpeed);
    controllerRef.current?.setSpeed(nextSpeed);
  }, []);

  const handleReset = useCallback(() => {
    const controller = controllerRef.current;
    if (!controller) return;

    controller.pause();
    controller.seek(0);
    setProgress(0);
    setGaitHistory([]);
    setPricingHistory([]);
    setEdgeEvents([]);
    lastEdgeStateRef.current = 'monitoring';
  }, []);

  const handleSeek = useCallback((timestampMs: number) => {
    controllerRef.current?.seek(timestampMs);
  }, []);

  const handleScrubStart = useCallback(() => {
    controllerRef.current?.pause();
  }, []);

  const scenario = scenarios.find((item) => item.id === selectedId) ?? null;
  const profile = scenario?.playerProfile ?? null;
  const cuePoints = DEMO_CUE_INDEX[selectedId] ?? [];
  const currentTimestampMs = currentFrame?.timestampMs ?? 0;
  const totalDurationMs = scenario?.durationMs ?? 0;

  const videoPanel = (
    <VideoPanel
      displayPose={currentFrame?.displayPose ?? null}
      footballContext={currentFrame?.footballContext ?? null}
      contributingFeatures={currentFrame?.anomalyResult.contributingFeatures ?? []}
      severity={currentFrame?.anomalyResult.severity ?? 'normal'}
      narrativeOverlay={currentFrame?.narrativeOverlay ?? null}
      poseOnly={poseOnlyMode}
    />
  );

  const cueChipClassByKind: Record<'context' | 'detection' | 'result', string> = {
    context: 'border-cyan/30 text-cyan hover:bg-cyan/10',
    detection: 'border-amber/30 text-amber hover:bg-amber/10',
    result: 'border-red/30 text-red hover:bg-red/10',
  };

  if (poseOnlyMode) {
    return (
      <div className="min-h-screen bg-[#05070c] flex items-center justify-center p-6">
        <div className="w-full max-w-[1280px]">{videoPanel}</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-bg">
      <header className="flex items-center justify-between px-6 py-3 border-b border-border bg-surface flex-shrink-0">
        <div className="flex items-center gap-4">
          <div>
            <h1 className="font-sans text-lg font-bold tracking-tight">
              <span className="text-cyan">GAIT</span>
              <span className="text-text-primary">SIGNAL</span>
              <span className="text-amber ml-2">LIVE EDGE</span>
            </h1>
            <p className="text-text-secondary font-mono text-[11px] mt-1 uppercase tracking-widest">
              In-stadium football pricing workflow demo
            </p>
          </div>
          <div className="h-8 w-px bg-border" />
          <select
            value={selectedId}
            onChange={(event) => handleScenarioChange(event.target.value)}
            className="bg-bg border border-border rounded px-3 py-1.5 text-text-primary font-mono text-xs focus:outline-none focus:border-cyan/50"
          >
            {scenarios.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
          {scenario && (
            <span className="text-text-secondary font-sans text-xs hidden xl:block max-w-[34rem] truncate">
              {scenario.description}
            </span>
          )}
        </div>

        <div className="flex items-center gap-3">
          <div className="flex gap-1">
            {([0.5, 1, 2] as PlaybackSpeed[]).map((value) => (
              <button
                key={value}
                onClick={() => handleSpeedChange(value)}
                className={`font-mono text-xs px-2 py-1 rounded transition-colors ${
                  speed === value
                    ? 'bg-cyan/15 text-cyan'
                    : 'text-text-secondary hover:text-text-primary'
                }`}
              >
                {value}x
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

      <div className="px-4 py-2 border-b border-border bg-bg/80 flex-shrink-0">
        <div className="flex items-center gap-3">
          <span className="font-mono text-xs text-text-secondary w-10 text-right">
            {formatClock(currentTimestampMs)}
          </span>
          <div className="relative flex-1">
            <div className="h-0.5 bg-border absolute inset-x-0 top-1/2 -translate-y-1/2 pointer-events-none" />
            <div
              className="h-0.5 bg-cyan/50 absolute left-0 top-1/2 -translate-y-1/2 pointer-events-none"
              style={{ width: `${progress * 100}%` }}
            />
            <input
              type="range"
              min={0}
              max={totalDurationMs}
              step={100}
              value={currentTimestampMs}
              onPointerDown={handleScrubStart}
              onChange={(event) => handleSeek(Number(event.target.value))}
              className="w-full accent-cyan bg-transparent appearance-none cursor-pointer"
              aria-label="Scenario timeline"
            />
          </div>
          <span className="font-mono text-xs text-text-secondary w-10">
            {formatClock(totalDurationMs)}
          </span>
        </div>
        <div className="mt-2 flex items-center gap-2 overflow-x-auto pb-1">
          {cuePoints.map((cue) => (
            <button
              key={`${cue.timestampMs}-${cue.label}`}
              onClick={() => {
                handleScrubStart();
                handleSeek(cue.timestampMs);
              }}
              title={cue.note}
              className={`whitespace-nowrap font-mono text-[11px] px-2.5 py-1 rounded border transition-colors ${cueChipClassByKind[cue.kind]}`}
            >
              {formatClock(cue.timestampMs)} {cue.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <p className="text-text-secondary font-mono text-sm animate-pulse">
            Loading in-stadium scenario data...
          </p>
        </div>
      ) : (
        <div className="flex-1 grid grid-cols-12 gap-4 p-4 overflow-hidden min-h-0">
          <div className="col-span-5 flex flex-col gap-4 overflow-y-auto">
            <MatchStatePanel
              context={currentFrame?.footballContext ?? null}
              playerName={profile?.player.name ?? 'Player'}
              teamName={profile?.player.team ?? 'Team'}
            />
            {videoPanel}
            <PlayerProfile
              profile={profile}
              currentMetrics={currentFrame?.gaitMetrics ?? null}
            />
          </div>

          <div className="col-span-4 flex flex-col gap-4 overflow-y-auto">
            <GaitTimeline
              gaitHistory={gaitHistory}
              pricingHistory={pricingHistory}
              edgeEvents={edgeEvents}
              currentTimestampMs={currentTimestampMs}
            />
            <BaselineComparison
              profile={profile}
              currentMetrics={currentFrame?.gaitMetrics ?? null}
            />
          </div>

          <div className="col-span-3 flex flex-col gap-4 overflow-y-auto">
            <AnomalyAlert
              anomalyResult={currentFrame?.anomalyResult ?? null}
              pricingEdge={currentFrame?.pricingEdge ?? null}
            />
            <BettingSignalPanel
              pricingEdge={currentFrame?.pricingEdge ?? null}
              edgeHistory={edgeEvents}
              playerName={profile?.player.name ?? 'Player'}
            />
          </div>
        </div>
      )}
    </div>
  );
}
