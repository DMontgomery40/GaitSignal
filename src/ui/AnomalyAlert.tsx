import type { AnomalyResult, PricingEdge, FeatureContribution } from '../types/index.ts';

interface AnomalyAlertProps {
  anomalyResult: AnomalyResult | null;
  pricingEdge: PricingEdge | null;
}

function FeatureBar({ feature }: { feature: FeatureContribution }) {
  const width = Math.min(Math.abs(feature.contribution) * 260, 100);
  const tone =
    Math.abs(feature.zScore) > 3
      ? 'bg-red'
      : Math.abs(feature.zScore) > 2
        ? 'bg-amber'
        : 'bg-cyan';

  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="text-text-secondary font-mono w-36 truncate">{feature.featureName}</span>
      <div className="flex-1 h-1.5 bg-bg rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${tone}`} style={{ width: `${width}%` }} />
      </div>
      <span className="text-text-secondary font-mono w-12 text-right">
        {feature.zScore.toFixed(1)}s
      </span>
    </div>
  );
}

function stateTone(edgeState: PricingEdge['edgeState']) {
  switch (edgeState) {
    case 'warming':
      return {
        dot: 'bg-amber',
        text: 'text-amber',
        bg: 'bg-amber/10',
        border: 'border-amber/30',
        label: 'WARMING',
      };
    case 'confirmed':
      return {
        dot: 'bg-amber',
        text: 'text-amber',
        bg: 'bg-amber/10',
        border: 'border-amber/40',
        label: 'CONFIRMED',
      };
    case 'priceable':
      return {
        dot: 'bg-red',
        text: 'text-red',
        bg: 'bg-red/10',
        border: 'border-red/40',
        label: 'PRICEABLE',
      };
    default:
      return {
        dot: 'bg-cyan',
        text: 'text-cyan',
        bg: 'bg-cyan/10',
        border: 'border-cyan/20',
        label: 'MONITORING',
      };
  }
}

export default function AnomalyAlert({
  anomalyResult,
  pricingEdge,
}: AnomalyAlertProps) {
  const edge = pricingEdge;
  const anomaly = anomalyResult;

  if (!edge || !anomaly) return null;

  const config = stateTone(edge.edgeState);
  const topFeatures = anomaly.contributingFeatures.slice(0, 3);

  return (
    <div className={`rounded-lg border ${config.border} ${config.bg} p-4 flex flex-col gap-3`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={`w-2.5 h-2.5 rounded-full ${config.dot}`} />
          <span className={`font-mono text-sm tracking-wider ${config.text}`}>{config.label}</span>
        </div>
        <span className="text-text-secondary font-mono text-xs">
          {edge.qualifiedStrides} qualified strides
        </span>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="rounded border border-border bg-bg/60 p-3">
          <span className="text-text-secondary text-xs block">Movement surprise</span>
          <span className={`font-mono text-2xl font-semibold ${config.text}`}>
            {edge.movementSurprise.toFixed(2)}
          </span>
        </div>
        <div className="rounded border border-border bg-bg/60 p-3">
          <span className="text-text-secondary text-xs block">Context gate</span>
          <span className="font-mono text-2xl font-semibold text-text-primary">
            {edge.contextGate.toFixed(2)}
          </span>
        </div>
        <div className="rounded border border-border bg-bg/60 p-3">
          <span className="text-text-secondary text-xs block">Edge confidence</span>
          <span className="font-mono text-2xl font-semibold text-text-primary">
            {(edge.sourceConfidence * 100).toFixed(0)}%
          </span>
        </div>
      </div>

      <div className="space-y-1">
        <span className="text-text-secondary text-xs uppercase tracking-wider">Model evidence</span>
        <div className="flex items-center justify-between text-xs text-text-secondary font-mono mb-1">
          <span>Composite edge score</span>
          <span>{edge.edgeScore.toFixed(2)}</span>
        </div>
        {topFeatures.map((feature, index) => (
          <FeatureBar key={`${feature.featureName}-${index}`} feature={feature} />
        ))}
      </div>

      <div className="rounded border border-border bg-bg/60 p-3">
        <span className="text-text-secondary text-xs uppercase tracking-wider block mb-2">
          Why it matters now
        </span>
        <div className="flex flex-col gap-1">
          {edge.rationale.map((item) => (
            <p key={item} className="text-text-primary text-xs leading-relaxed">
              {item}
            </p>
          ))}
        </div>
      </div>
    </div>
  );
}
