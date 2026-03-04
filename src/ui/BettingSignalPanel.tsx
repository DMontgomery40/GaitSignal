import type { SignalState, SignalEvent, AnomalyResult, FeatureContribution } from '../types/index.ts';

interface BettingSignalPanelProps {
  signalState: SignalState | null;
  signalHistory: SignalEvent[];
  anomalyResult: AnomalyResult | null;
  playerName: string;
}

function formatTime(ms: number): string {
  const sec = Math.floor(ms / 1000);
  const min = Math.floor(sec / 60);
  const s = sec % 60;
  return `${min}:${s.toString().padStart(2, '0')}`;
}

function StateMachineViz({ current }: { current: string }) {
  const states = ['monitoring', 'alert', 'confirmed', 'actionable'];
  const stateColors: Record<string, string> = {
    monitoring: '#00f0ff',
    alert: '#ffb800',
    confirmed: '#ffb800',
    actionable: '#ff3344',
  };

  return (
    <div className="flex items-center gap-1">
      {states.map((s, i) => {
        const isActive = s === current;
        const isPast = states.indexOf(current) > i;
        const color = stateColors[s];

        return (
          <div key={s} className="flex items-center gap-1">
            <div className="flex flex-col items-center">
              <div
                className={`w-3 h-3 rounded-full border-2 transition-all duration-300 ${
                  isActive ? 'scale-125' : ''
                }`}
                style={{
                  borderColor: isActive || isPast ? color : '#1e1e2e',
                  backgroundColor: isActive || isPast ? color : 'transparent',
                  boxShadow: isActive ? `0 0 8px ${color}40` : 'none',
                }}
              />
              <span
                className="font-mono text-xs mt-1"
                style={{ color: isActive ? color : '#6b6b80', fontSize: '9px' }}
              >
                {s.slice(0, 3).toUpperCase()}
              </span>
            </div>
            {i < states.length - 1 && (
              <div
                className="w-4 h-px mb-3"
                style={{ backgroundColor: isPast ? stateColors[states[i + 1]] : '#1e1e2e' }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

function ConfidenceRing({ confidence }: { confidence: number }) {
  const circumference = 2 * Math.PI * 20;
  const offset = circumference - confidence * circumference;

  return (
    <div className="relative w-14 h-14">
      <svg viewBox="0 0 48 48" className="w-full h-full -rotate-90">
        <circle cx="24" cy="24" r="20" fill="none" stroke="#1e1e2e" strokeWidth="3" />
        <circle
          cx="24" cy="24" r="20"
          fill="none"
          stroke={confidence > 0.7 ? '#ff3344' : confidence > 0.4 ? '#ffb800' : '#00f0ff'}
          strokeWidth="3"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-500"
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center font-mono text-xs text-text-primary font-semibold">
        {(confidence * 100).toFixed(0)}%
      </span>
    </div>
  );
}

function MarketImpactCard({ event, playerName }: { event: SignalEvent; playerName: string }) {
  const dirArrow = event.marketImpact.playerPropDirection === 'under' ? '\u2193' : '\u2192';
  const magnitudeColor: Record<string, string> = {
    minor: 'text-amber',
    moderate: 'text-amber',
    major: 'text-red',
  };

  const topFeatureStr = event.topFeatures
    .slice(0, 2)
    .map((f: FeatureContribution) => f.featureName)
    .join(', ');

  return (
    <div className="rounded border border-red/30 bg-red/5 p-3 space-y-2">
      <div className="flex items-start gap-3">
        <ConfidenceRing confidence={event.confidence} />
        <div className="flex-1">
          <p className="text-text-primary text-sm font-sans font-semibold leading-tight">
            Gait anomaly detected {'\u2014'} {playerName} {topFeatureStr.toLowerCase()}
          </p>
          <p className="text-text-secondary text-xs font-mono mt-1">
            Onset: {formatTime(event.timestampMs)}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {event.marketImpact.affectedMarkets.map((m) => (
          <span
            key={m}
            className={`font-mono text-xs px-2 py-0.5 rounded bg-bg border border-border ${magnitudeColor[event.marketImpact.magnitudeEstimate]}`}
          >
            {m} {dirArrow}
          </span>
        ))}
      </div>

      <p className="font-mono text-xs text-text-secondary">
        Est. impact: ~{event.marketImpact.estimatedPossessionsToImpact} possessions
      </p>
    </div>
  );
}

function SignalHistoryItem({ event }: { event: SignalEvent }) {
  const typeLabels: Record<string, string> = {
    alert_triggered: 'ALERT',
    signal_confirmed: 'CONFIRMED',
    signal_actionable: 'ACTIONABLE',
    signal_cleared: 'CLEARED',
  };
  const typeColors: Record<string, string> = {
    alert_triggered: 'text-amber',
    signal_confirmed: 'text-amber',
    signal_actionable: 'text-red',
    signal_cleared: 'text-cyan',
  };

  return (
    <div className="flex items-center justify-between py-1.5 border-b border-border last:border-0">
      <div className="flex items-center gap-2">
        <span className={`font-mono text-xs ${typeColors[event.type]}`}>
          {typeLabels[event.type]}
        </span>
        <span className="text-text-secondary font-mono text-xs">
          Score: {event.anomalyScore.toFixed(2)}
        </span>
      </div>
      <span className="text-text-secondary font-mono text-xs">
        {formatTime(event.timestampMs)}
      </span>
    </div>
  );
}

export default function BettingSignalPanel({
  signalState,
  signalHistory,
  anomalyResult,
  playerName,
}: BettingSignalPanelProps) {
  const currentState = signalState?.current ?? 'monitoring';
  const latestActionable = signalHistory.find((e) => e.type === 'signal_actionable');

  return (
    <div className="rounded-lg border border-border bg-surface p-4 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <span className="text-text-secondary font-mono text-xs tracking-widest uppercase">
          Betting Signal
        </span>
        <span className="text-text-secondary font-mono text-xs opacity-60">
          DEMO
        </span>
      </div>

      <StateMachineViz current={currentState} />

      {currentState === 'actionable' && latestActionable && (
        <MarketImpactCard event={latestActionable} playerName={playerName} />
      )}

      {currentState !== 'actionable' && anomalyResult && currentState !== 'monitoring' && (
        <div className="rounded border border-amber/20 bg-amber/5 p-3">
          <div className="flex items-center justify-between mb-1">
            <span className="font-mono text-xs text-amber uppercase tracking-wider">Signal Warming</span>
            <span className="font-mono text-xs text-text-secondary">
              {signalState?.consecutiveStridesAboveThreshold ?? 0}/5 strides
            </span>
          </div>
          <div className="w-full h-1 bg-bg rounded-full overflow-hidden">
            <div
              className="h-full bg-amber rounded-full transition-all duration-300"
              style={{
                width: `${Math.min(((signalState?.consecutiveStridesAboveThreshold ?? 0) / 5) * 100, 100)}%`,
              }}
            />
          </div>
        </div>
      )}

      {signalHistory.length > 0 && (
        <div>
          <span className="text-text-secondary font-mono text-xs tracking-wider uppercase block mb-2">
            Signal History
          </span>
          <div className="max-h-36 overflow-y-auto">
            {signalHistory.map((evt, i) => (
              <SignalHistoryItem key={i} event={evt} />
            ))}
          </div>
        </div>
      )}

      <p className="text-text-secondary font-mono text-xs text-center opacity-50">
        Simulated signals for demonstration purposes
      </p>
    </div>
  );
}
