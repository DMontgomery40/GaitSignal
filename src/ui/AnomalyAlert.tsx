import type { AnomalyResult, SignalState, FeatureContribution } from '../types/index.ts';

interface AnomalyAlertProps {
  anomalyResult: AnomalyResult | null;
  signalState: SignalState | null;
}

function formatTime(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  return `${min}:${sec.toString().padStart(2, '0')}`;
}

function FeatureBar({ feature }: { feature: FeatureContribution }) {
  const barWidth = Math.min(Math.abs(feature.zScore) / 4 * 100, 100);
  const color = Math.abs(feature.zScore) > 3 ? 'bg-red' : Math.abs(feature.zScore) > 2 ? 'bg-amber' : 'bg-cyan';

  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="text-text-secondary font-mono w-36 truncate">{feature.featureName}</span>
      <div className="flex-1 h-1.5 bg-surface rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full transition-all duration-300`} style={{ width: `${barWidth}%` }} />
      </div>
      <span className="text-text-secondary font-mono w-12 text-right">{feature.zScore.toFixed(1)}σ</span>
    </div>
  );
}

export default function AnomalyAlert({ anomalyResult, signalState }: AnomalyAlertProps) {
  const state = signalState?.current ?? 'monitoring';
  const score = anomalyResult?.compositeScore ?? 0;
  const confidence = anomalyResult?.confidence ?? 0;
  const topFeatures = anomalyResult?.contributingFeatures.slice(0, 3) ?? [];

  const stateConfig: Record<string, { color: string; bg: string; border: string; pulse: boolean; label: string }> = {
    monitoring: { color: 'text-cyan', bg: 'bg-cyan/5', border: 'border-cyan/20', pulse: false, label: 'MONITORING' },
    alert: { color: 'text-amber', bg: 'bg-amber/5', border: 'border-amber/30', pulse: true, label: 'ALERT' },
    confirmed: { color: 'text-amber', bg: 'bg-amber/10', border: 'border-amber/40', pulse: true, label: 'CONFIRMED' },
    actionable: { color: 'text-red', bg: 'bg-red/10', border: 'border-red/40', pulse: true, label: 'ACTIONABLE' },
  };

  const config = stateConfig[state];

  return (
    <div className={`rounded-lg border ${config.border} ${config.bg} p-4 transition-all duration-500`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className={`w-2.5 h-2.5 rounded-full ${config.pulse ? 'animate-pulse' : ''}`}
            style={{ backgroundColor: state === 'monitoring' ? '#00f0ff' : state === 'actionable' ? '#ff3344' : '#ffb800' }}
          />
          <span className={`font-mono text-sm font-semibold tracking-wider ${config.color}`}>
            {config.label}
          </span>
        </div>
        {signalState && signalState.current !== 'monitoring' && (
          <span className="text-text-secondary font-mono text-xs">
            {signalState.consecutiveStridesAboveThreshold} strides
          </span>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3 mb-3">
        <div>
          <span className="text-text-secondary text-xs block mb-1">Score</span>
          <span className={`font-mono text-2xl font-semibold ${config.color}`}>
            {score.toFixed(2)}
          </span>
        </div>
        <div>
          <span className="text-text-secondary text-xs block mb-1">Confidence</span>
          <span className="font-mono text-2xl font-semibold text-text-primary">
            {(confidence * 100).toFixed(0)}%
          </span>
        </div>
      </div>

      {state !== 'monitoring' && (
        <div className="space-y-1 mb-3">
          <span className="text-text-secondary text-xs uppercase tracking-wider">Contributing Features</span>
          <div className="flex items-center justify-between text-xs text-text-secondary font-mono mb-1">
            <span>Rate of Change</span>
            <span>{anomalyResult?.rateOfChangeScore.toFixed(2)}</span>
          </div>
          {topFeatures.map((f, i) => (
            <FeatureBar key={i} feature={f} />
          ))}
        </div>
      )}

      {signalState && signalState.current !== 'monitoring' && signalState.enteredAt > 0 && (
        <div className="border-t border-border pt-2 mt-2">
          <span className="text-text-secondary font-mono text-xs">
            Onset: {formatTime(signalState.enteredAt)}
          </span>
        </div>
      )}
    </div>
  );
}
