import type { FootballContext, PitchCoordinate } from '../types/index.ts';

interface MatchStatePanelProps {
  context: FootballContext | null;
  playerName: string;
  teamName: string;
}

const PITCH_LENGTH = 105;
const PITCH_WIDTH = 68;

function toSvgPoint(point: PitchCoordinate) {
  return {
    x: (point.x / PITCH_LENGTH) * 100,
    y: (point.y / PITCH_WIDTH) * 64,
  };
}

function pillTone(value: string): string {
  if (value === 'player_team' || value === 'on_ball' || value === 'immediate' || value === 'extreme') {
    return 'border-red/30 text-red bg-red/10';
  }
  if (value === 'contested' || value === 'involved' || value === 'active' || value === 'high') {
    return 'border-amber/30 text-amber bg-amber/10';
  }
  return 'border-cyan/20 text-cyan bg-cyan/10';
}

function formatLabel(value: string): string {
  return value.replace(/_/g, ' ').replace(/-/g, ' ');
}

export default function MatchStatePanel({
  context,
  playerName,
  teamName,
}: MatchStatePanelProps) {
  if (!context) return null;

  const player = toSvgPoint(context.playerPosition);
  const ball = toSvgPoint(context.ballPosition);

  return (
    <div className="rounded-lg border border-border bg-surface p-4 flex flex-col gap-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-text-secondary font-mono text-xs tracking-widest uppercase">
            Match-State / Venue Feed
          </p>
          <h3 className="font-sans text-text-primary text-sm font-semibold mt-1">
            {playerName} live context
          </h3>
        </div>
        <div className="rounded border border-cyan/20 bg-cyan/10 px-2 py-1">
          <span className="text-cyan font-mono text-[11px]">
            {(context.sourceConfidence * 100).toFixed(0)}% venue sync
          </span>
        </div>
      </div>

      <div className="rounded-md border border-border bg-[#0c1713] overflow-hidden">
        <svg viewBox="0 0 100 64" className="w-full h-auto">
          <defs>
            <linearGradient id="pitchShade" x1="0" x2="1">
              <stop offset="0%" stopColor="#0f2a1d" />
              <stop offset="100%" stopColor="#143526" />
            </linearGradient>
          </defs>
          <rect width="100" height="64" fill="url(#pitchShade)" />
          <rect x="2" y="2" width="96" height="60" fill="none" stroke="#9ef8ca" strokeWidth="0.5" opacity="0.4" />
          <line x1="50" y1="2" x2="50" y2="62" stroke="#9ef8ca" strokeWidth="0.4" opacity="0.35" />
          <circle cx="50" cy="32" r="7.5" fill="none" stroke="#9ef8ca" strokeWidth="0.4" opacity="0.35" />
          <rect x="2" y="18" width="13" height="28" fill="none" stroke="#9ef8ca" strokeWidth="0.4" opacity="0.35" />
          <rect x="85" y="18" width="13" height="28" fill="none" stroke="#9ef8ca" strokeWidth="0.4" opacity="0.35" />
          <circle cx={player.x} cy={player.y} r="2.2" fill="#00f0ff" />
          <circle cx={player.x} cy={player.y} r="4.6" fill="none" stroke="#00f0ff" strokeWidth="0.5" opacity="0.3" />
          <circle cx={ball.x} cy={ball.y} r="1.3" fill="#f6f7fb" />
          <line
            x1={player.x}
            y1={player.y}
            x2={ball.x}
            y2={ball.y}
            stroke="#ffb800"
            strokeDasharray="1.6 1.6"
            strokeWidth="0.45"
            opacity="0.7"
          />
        </svg>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="rounded border border-border bg-bg/60 p-3">
          <p className="text-text-secondary font-mono text-[11px] uppercase tracking-wider">Feed stack</p>
          <p className="text-text-primary font-sans text-sm mt-1">{context.feedLabel}</p>
          <p className="text-text-secondary font-sans text-xs mt-2">{context.note}</p>
        </div>
        <div className="rounded border border-border bg-bg/60 p-3">
          <p className="text-text-secondary font-mono text-[11px] uppercase tracking-wider">Ball distance</p>
          <p className="text-text-primary font-mono text-xl mt-1">
            {context.ballDistanceMeters.toFixed(1)}m
          </p>
          <p className="text-text-secondary font-sans text-xs mt-2">
            {teamName} phase: {formatLabel(context.phaseOfPlay)}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <span className={`rounded-full border px-2.5 py-1 font-mono text-[11px] ${pillTone(context.possession)}`}>
          {formatLabel(context.possession)}
        </span>
        <span className={`rounded-full border px-2.5 py-1 font-mono text-[11px] ${pillTone(context.ballAccess)}`}>
          {formatLabel(context.ballAccess)}
        </span>
        <span className={`rounded-full border px-2.5 py-1 font-mono text-[11px] ${pillTone(context.roleDemand)}`}>
          role {formatLabel(context.roleDemand)}
        </span>
        <span className={`rounded-full border px-2.5 py-1 font-mono text-[11px] ${pillTone(context.marketUrgency)}`}>
          {formatLabel(context.marketUrgency)}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
        <div>
          <span className="text-text-secondary font-mono block">Pitch zone</span>
          <span className="text-text-primary font-sans">{formatLabel(context.pitchZone)}</span>
        </div>
        <div>
          <span className="text-text-secondary font-mono block">Ball access</span>
          <span className="text-text-primary font-sans">{formatLabel(context.ballAccess)}</span>
        </div>
      </div>
    </div>
  );
}
