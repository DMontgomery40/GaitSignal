import type { EdgeEvent, PricingEdge } from '../types/index.ts';

interface BettingSignalPanelProps {
  pricingEdge: PricingEdge | null;
  edgeHistory: EdgeEvent[];
  playerName: string;
}

function stateColor(edgeState: PricingEdge['edgeState']): string {
  switch (edgeState) {
    case 'warming':
      return '#ffb800';
    case 'confirmed':
      return '#ffb800';
    case 'priceable':
      return '#ff3344';
    default:
      return '#00f0ff';
  }
}

function formatTime(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  return `${min}:${sec.toString().padStart(2, '0')}`;
}

function StateMachineViz({ current }: { current: PricingEdge['edgeState'] }) {
  const states: PricingEdge['edgeState'][] = ['monitoring', 'warming', 'confirmed', 'priceable'];

  return (
    <div className="flex items-center gap-1">
      {states.map((state, index) => {
        const isActive = state === current;
        const isPast = states.indexOf(current) > index;
        const color = stateColor(state);

        return (
          <div key={state} className="flex items-center gap-1">
            <div className="flex flex-col items-center">
              <div
                className={`w-3 h-3 rounded-full border-2 ${isActive ? 'scale-125' : ''}`}
                style={{
                  borderColor: isActive || isPast ? color : '#1e1e2e',
                  backgroundColor: isActive || isPast ? color : 'transparent',
                }}
              />
              <span
                className="font-mono text-[9px] mt-1 uppercase"
                style={{ color: isActive ? color : '#6b6b80' }}
              >
                {state === 'priceable' ? 'PRC' : state.slice(0, 3)}
              </span>
            </div>
            {index < states.length - 1 && (
              <div
                className="w-4 h-px mb-3"
                style={{ backgroundColor: isPast ? stateColor(states[index + 1]) : '#1e1e2e' }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

function EdgeSummary({
  pricingEdge,
  playerName,
}: {
  pricingEdge: PricingEdge;
  playerName: string;
}) {
  return (
    <div className="rounded border border-red/30 bg-red/10 p-3 flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-text-primary text-sm font-sans font-semibold">
            {playerName} pricing window live
          </p>
          <p className="text-text-secondary text-xs font-mono mt-1">
            Edge score {pricingEdge.edgeScore.toFixed(2)} | price-in window {pricingEdge.timeToMarketImpact}s
          </p>
        </div>
        <div className="rounded-full border border-red/30 px-3 py-1">
          <span className="text-red font-mono text-xs tracking-wider">PRICEABLE</span>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {pricingEdge.marketFamily.map((market) => (
          <span
            key={market}
            className="font-mono text-xs px-2 py-1 rounded border border-border bg-bg text-red"
          >
            {market}
          </span>
        ))}
      </div>
    </div>
  );
}

function HistoryItem({ event }: { event: EdgeEvent }) {
  const labels: Record<EdgeEvent['type'], string> = {
    edge_opened: 'OPENED',
    edge_confirmed: 'CONFIRMED',
    edge_priceable: 'PRICEABLE',
    edge_cleared: 'CLEARED',
  };

  const tones: Record<EdgeEvent['type'], string> = {
    edge_opened: 'text-amber',
    edge_confirmed: 'text-amber',
    edge_priceable: 'text-red',
    edge_cleared: 'text-cyan',
  };

  return (
    <div className="flex items-center justify-between py-1.5 border-b border-border last:border-0">
      <div className="flex items-center gap-2">
        <span className={`font-mono text-xs ${tones[event.type]}`}>{labels[event.type]}</span>
        <span className="text-text-secondary font-mono text-xs">
          {event.edgeScore.toFixed(2)} / {event.timeToMarketImpact}s
        </span>
      </div>
      <span className="text-text-secondary font-mono text-xs">
        {formatTime(event.timestampMs)}
      </span>
    </div>
  );
}

export default function BettingSignalPanel({
  pricingEdge,
  edgeHistory,
  playerName,
}: BettingSignalPanelProps) {
  if (!pricingEdge) return null;

  return (
    <div className="rounded-lg border border-border bg-surface p-4 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <span className="text-text-secondary font-mono text-xs tracking-widest uppercase">
          In-Play Pricing Edge
        </span>
        <span className="text-text-secondary font-mono text-xs opacity-60">
          DEMO
        </span>
      </div>

      <StateMachineViz current={pricingEdge.edgeState} />

      {pricingEdge.edgeState === 'priceable' ? (
        <EdgeSummary pricingEdge={pricingEdge} playerName={playerName} />
      ) : (
        <div className="rounded border border-border bg-bg/60 p-3 flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="font-mono text-xs text-text-secondary uppercase tracking-wider">
              Readiness stack
            </span>
            <span className="font-mono text-xs text-text-secondary">
              {pricingEdge.qualifiedStrides} qualifying strides
            </span>
          </div>
          <div className="w-full h-1 bg-surface rounded-full overflow-hidden">
            <div
              className="h-full bg-amber rounded-full transition-all duration-300"
              style={{ width: `${Math.min(pricingEdge.edgeScore * 100, 100)}%` }}
            />
          </div>
          <p className="text-text-secondary font-sans text-xs leading-relaxed">
            The workflow stays non-priceable until movement surprise, context gate, and source confidence agree.
          </p>
        </div>
      )}

      <div className="rounded border border-border bg-bg/60 p-3">
        <div className="flex items-center justify-between mb-2">
          <span className="text-text-secondary font-mono text-xs tracking-wider uppercase">
            Market families
          </span>
          <span className="text-text-secondary font-mono text-xs">
            {(pricingEdge.sourceConfidence * 100).toFixed(0)}% sync
          </span>
        </div>
        <div className="flex flex-wrap gap-2">
          {pricingEdge.marketFamily.map((market) => (
            <span
              key={market}
              className="rounded-full border border-cyan/20 px-2.5 py-1 font-mono text-[11px] text-cyan"
            >
              {market}
            </span>
          ))}
        </div>
      </div>

      {edgeHistory.length > 0 && (
        <div>
          <span className="text-text-secondary font-mono text-xs tracking-wider uppercase block mb-2">
            Edge History
          </span>
          <div className="max-h-36 overflow-y-auto">
            {edgeHistory.map((event) => (
              <HistoryItem
                key={`${event.type}-${event.timestampMs}`}
                event={event}
              />
            ))}
          </div>
        </div>
      )}

      <p className="text-text-secondary font-mono text-xs text-center opacity-60">
        Synthetic proxy for a venue-fed live pricing workflow
      </p>
    </div>
  );
}
