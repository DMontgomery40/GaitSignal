import type {
  AnomalyResult,
  FootballContext,
  FootballContextKeyframe,
  MarketUrgencyType,
  PitchCoordinate,
  PricingEdge,
  RoleDemandType,
} from '../types/index.ts';

const PITCH_LENGTH_M = 105;
const PITCH_WIDTH_M = 68;

const POSSESSION_WEIGHT: Record<FootballContext['possession'], number> = {
  player_team: 1.0,
  contested: 0.78,
  opponent: 0.42,
};

const BALL_ACCESS_WEIGHT: Record<FootballContext['ballAccess'], number> = {
  far: 0.28,
  support: 0.58,
  involved: 0.82,
  on_ball: 1.0,
};

const ROLE_DEMAND_WEIGHT: Record<RoleDemandType, number> = {
  low: 0.35,
  moderate: 0.58,
  high: 0.82,
  extreme: 1.0,
};

const ZONE_WEIGHT: Record<FootballContext['pitchZone'], number> = {
  'defensive-third': 0.4,
  'middle-third': 0.55,
  'left-wing': 0.62,
  'right-wing': 0.62,
  'half-space': 0.78,
  'final-third': 0.9,
  'box-edge': 1.0,
};

const URGENCY_WEIGHT: Record<MarketUrgencyType, number> = {
  watch: 0.42,
  active: 0.72,
  immediate: 1.0,
};

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function lerpPosition(a: PitchCoordinate, b: PitchCoordinate, t: number): PitchCoordinate {
  return {
    x: lerp(a.x, b.x, t),
    y: lerp(a.y, b.y, t),
  };
}

function distanceMeters(a: PitchCoordinate, b: PitchCoordinate): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}

function getContextIndex(
  timeline: FootballContextKeyframe[],
  timestampMs: number,
): number {
  let index = 0;
  for (let i = 0; i < timeline.length; i++) {
    if (timestampMs >= timeline[i].startTimestampMs) {
      index = i;
    } else {
      break;
    }
  }
  return index;
}

export function getFootballContext(
  timestampMs: number,
  timeline: FootballContextKeyframe[],
): FootballContext {
  const index = getContextIndex(timeline, timestampMs);
  const active = timeline[index];
  const next = timeline[index + 1] ?? null;

  let playerPosition = active.playerPosition;
  let ballPosition = active.ballPosition;

  if (next && next.startTimestampMs > active.startTimestampMs) {
    const progress = clamp(
      (timestampMs - active.startTimestampMs) / (next.startTimestampMs - active.startTimestampMs),
      0,
      1,
    );
    playerPosition = lerpPosition(active.playerPosition, next.playerPosition, progress);
    ballPosition = lerpPosition(active.ballPosition, next.ballPosition, progress);
  }

  return {
    timestampMs,
    playerPosition: {
      x: clamp(playerPosition.x, 0, PITCH_LENGTH_M),
      y: clamp(playerPosition.y, 0, PITCH_WIDTH_M),
    },
    ballPosition: {
      x: clamp(ballPosition.x, 0, PITCH_LENGTH_M),
      y: clamp(ballPosition.y, 0, PITCH_WIDTH_M),
    },
    possession: active.possession,
    ballAccess: active.ballAccess,
    ballDistanceMeters: distanceMeters(playerPosition, ballPosition),
    pitchZone: active.pitchZone,
    phaseOfPlay: active.phaseOfPlay,
    roleDemand: active.roleDemand,
    sourceConfidence: active.sourceConfidence,
    marketUrgency: active.marketUrgency,
    marketFamily: active.marketFamily,
    feedLabel: active.feedLabel,
    note: active.note,
  };
}

export function createInitialPricingEdge(): PricingEdge {
  return {
    edgeScore: 0,
    edgeState: 'monitoring',
    stateEnteredAt: 0,
    qualifiedStrides: 0,
    movementSurprise: 0,
    contextGate: 0,
    sourceConfidence: 0,
    marketFamily: [],
    timeToMarketImpact: 18,
    rationale: ['Movement remains inside the player-specific baseline envelope.'],
  };
}

export function computeContextGate(context: FootballContext): number {
  const possession = POSSESSION_WEIGHT[context.possession];
  const access = BALL_ACCESS_WEIGHT[context.ballAccess];
  const demand = ROLE_DEMAND_WEIGHT[context.roleDemand];
  const zone = ZONE_WEIGHT[context.pitchZone];
  const urgency = URGENCY_WEIGHT[context.marketUrgency];

  const raw =
    possession * 0.26 +
    access * 0.24 +
    demand * 0.24 +
    zone * 0.16 +
    urgency * 0.1;

  return clamp(raw * (0.82 + context.sourceConfidence * 0.18), 0, 1);
}

function computeMovementSurprise(anomaly: AnomalyResult): number {
  return clamp(
    anomaly.compositeScore * 0.72 +
      anomaly.rateOfChangeScore * 0.18 +
      anomaly.shortTermDeviationScore * 0.1,
    0,
    1,
  );
}

function computeTimeToMarketImpact(
  edgeScore: number,
  urgency: MarketUrgencyType,
): number {
  const urgencyBias = URGENCY_WEIGHT[urgency];
  return Math.max(3, Math.round(20 - edgeScore * 11 - urgencyBias * 4));
}

function buildRationale(
  context: FootballContext,
  movementSurprise: number,
  contextGate: number,
): string[] {
  const notes: string[] = [];

  if (movementSurprise >= 0.58) {
    notes.push('Player-specific movement surprise is sustained above baseline.');
  } else if (movementSurprise >= 0.35) {
    notes.push('Movement surprise is rising but not yet decisive on its own.');
  } else {
    notes.push('Movement surprise remains mild relative to the player baseline.');
  }

  if (context.possession === 'player_team') {
    notes.push('Team possession is live, so degraded movement can hit pricing immediately.');
  } else if (context.possession === 'contested') {
    notes.push('Possession is contested, so the edge is still conditional.');
  } else {
    notes.push('Opposition possession suppresses immediate market value.');
  }

  if (contextGate >= 0.72) {
    notes.push('Football context qualifies the signal for near-term pricing impact.');
  } else {
    notes.push('Football context is limiting the pricing edge despite the movement signal.');
  }

  notes.push(`${context.feedLabel} confidence ${(context.sourceConfidence * 100).toFixed(0)}%.`);
  return notes;
}

export function updatePricingEdge(
  previous: PricingEdge,
  anomaly: AnomalyResult,
  context: FootballContext,
  isNewStride: boolean,
): PricingEdge {
  const movementSurprise = computeMovementSurprise(anomaly);
  const contextGate = computeContextGate(context);
  const sourceConfidence = context.sourceConfidence;
  const edgeScore = clamp(
    movementSurprise *
      (0.2 + contextGate * 0.8) *
      (0.55 + sourceConfidence * 0.45),
    0,
    1,
  );

  let qualifiedStrides = previous.qualifiedStrides;
  if (isNewStride) {
    if (edgeScore >= 0.28) {
      qualifiedStrides += 1;
    } else {
      qualifiedStrides = Math.max(0, qualifiedStrides - 1);
    }
  }

  let edgeState = previous.edgeState;
  if (edgeScore < 0.22 && qualifiedStrides === 0) {
    edgeState = 'monitoring';
  } else if (
    edgeState === 'monitoring' &&
    edgeScore >= 0.28 &&
    qualifiedStrides >= 2
  ) {
    edgeState = 'warming';
  } else if (
    (edgeState === 'monitoring' || edgeState === 'warming') &&
    edgeScore >= 0.42 &&
    qualifiedStrides >= 5 &&
    sourceConfidence >= 0.74
  ) {
    edgeState = 'confirmed';
  } else if (
    (edgeState === 'warming' || edgeState === 'confirmed') &&
    (
      (edgeScore >= 0.56 && contextGate >= 0.72 && sourceConfidence >= 0.8) ||
      edgeScore >= 0.68
    )
  ) {
    edgeState = 'priceable';
  } else if (
    (edgeState === 'warming' || edgeState === 'confirmed' || edgeState === 'priceable') &&
    edgeScore < 0.24 &&
    qualifiedStrides <= 1
  ) {
    edgeState = 'monitoring';
  }

  return {
    edgeScore,
    edgeState,
    stateEnteredAt:
      edgeState === previous.edgeState ? previous.stateEnteredAt : anomaly.timestampMs,
    qualifiedStrides,
    movementSurprise,
    contextGate,
    sourceConfidence,
    marketFamily: context.marketFamily,
    timeToMarketImpact: computeTimeToMarketImpact(edgeScore, context.marketUrgency),
    rationale: buildRationale(context, movementSurprise, contextGate),
  };
}
