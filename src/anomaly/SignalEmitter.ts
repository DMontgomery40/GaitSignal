import type {
  AnomalyResult,
  SignalState,
  SignalStateType,
  SignalEvent,
  SignalEventType,
  FeatureContribution,
  MarketImpact,
} from '../types/index';

// Thresholds for state transitions
const ALERT_THRESHOLD = 0.3;
const ACTIONABLE_SCORE_HIGH = 0.7;
const ACTIONABLE_SCORE_LOW = 0.5;
const ACTIONABLE_CONFIDENCE = 0.7;
const CONFIRMED_CONFIDENCE = 0.5;
const CONFIRMED_STRIDES = 5;

/**
 * Translates anomaly scores into actionable betting signals via a state machine.
 * monitoring -> alert -> confirmed -> actionable
 * Requires sustained deviation to prevent false positives.
 */
export class SignalEmitter {
  private state: SignalState;
  private signalHistory: SignalEvent[] = [];

  constructor() {
    this.state = {
      current: 'monitoring',
      enteredAt: 0,
      consecutiveStridesAboveThreshold: 0,
      lastAnomalyResult: null,
    };
  }

  update(anomalyResult: AnomalyResult): SignalState {
    const prev = this.state.current;
    this.state.lastAnomalyResult = anomalyResult;

    const score = anomalyResult.compositeScore;
    const confidence = anomalyResult.confidence;

    // Track consecutive strides above alert threshold
    if (score >= ALERT_THRESHOLD) {
      this.state.consecutiveStridesAboveThreshold++;
    } else {
      this.state.consecutiveStridesAboveThreshold = 0;
    }

    // State machine transitions
    let next: SignalStateType = this.state.current;

    switch (this.state.current) {
      case 'monitoring':
        if (score >= ALERT_THRESHOLD) {
          next = 'alert';
        }
        break;

      case 'alert':
        if (score < ALERT_THRESHOLD) {
          // Dropped back below threshold — return to monitoring
          next = 'monitoring';
        } else if (
          this.state.consecutiveStridesAboveThreshold >= CONFIRMED_STRIDES &&
          confidence >= CONFIRMED_CONFIDENCE
        ) {
          next = 'confirmed';
        }
        break;

      case 'confirmed':
        if (score < ALERT_THRESHOLD) {
          next = 'monitoring';
        } else if (
          (score >= ACTIONABLE_SCORE_LOW && confidence >= ACTIONABLE_CONFIDENCE) ||
          score >= ACTIONABLE_SCORE_HIGH
        ) {
          next = 'actionable';
        }
        break;

      case 'actionable':
        if (score < ALERT_THRESHOLD) {
          next = 'monitoring';
        }
        // Once actionable, stay actionable unless anomaly clears entirely
        break;
    }

    // Emit events on state transitions
    if (next !== prev) {
      this.state.current = next;
      this.state.enteredAt = anomalyResult.timestampMs;

      const eventType = this.transitionToEventType(prev, next);
      if (eventType) {
        const event = this.buildSignalEvent(
          anomalyResult,
          eventType,
        );
        this.signalHistory.push(event);
      }
    }

    return { ...this.state };
  }

  getCurrentState(): SignalState {
    return { ...this.state };
  }

  getSignalHistory(): SignalEvent[] {
    return [...this.signalHistory];
  }

  reset(): void {
    this.state = {
      current: 'monitoring',
      enteredAt: 0,
      consecutiveStridesAboveThreshold: 0,
      lastAnomalyResult: null,
    };
    this.signalHistory = [];
  }

  private transitionToEventType(
    from: SignalStateType,
    to: SignalStateType,
  ): SignalEventType | null {
    if (to === 'alert' && from === 'monitoring') return 'alert_triggered';
    if (to === 'confirmed') return 'signal_confirmed';
    if (to === 'actionable') return 'signal_actionable';
    if (to === 'monitoring' && from !== 'monitoring') return 'signal_cleared';
    return null;
  }

  private buildSignalEvent(
    anomalyResult: AnomalyResult,
    type: SignalEventType,
  ): SignalEvent {
    const topFeatures = anomalyResult.contributingFeatures.slice(0, 3);
    const marketImpact = this.estimateMarketImpact(anomalyResult, topFeatures);

    return {
      timestampMs: anomalyResult.timestampMs,
      type,
      anomalyScore: anomalyResult.compositeScore,
      confidence: anomalyResult.confidence,
      marketImpact,
      topFeatures,
    };
  }

  private estimateMarketImpact(
    anomalyResult: AnomalyResult,
    topFeatures: FeatureContribution[],
  ): MarketImpact {
    const score = anomalyResult.compositeScore;

    // Determine magnitude from score
    let magnitudeEstimate: MarketImpact['magnitudeEstimate'];
    if (score >= 0.7) {
      magnitudeEstimate = 'major';
    } else if (score >= 0.5) {
      magnitudeEstimate = 'moderate';
    } else {
      magnitudeEstimate = 'minor';
    }

    // Determine affected markets based on which features are deviating
    const affectedMarkets: string[] = [];
    const featureIndices = new Set(topFeatures.map((f) => f.featureIndex));

    // Lower-body features affect scoring/movement
    const lowerBodyFeatures = new Set([0, 1, 2, 3, 4, 5, 6, 7, 8]);
    const strideFeatures = new Set([9, 10, 11, 12, 13, 14, 15, 16, 17]);

    const hasLowerBody = [...featureIndices].some((i) => lowerBodyFeatures.has(i));
    const hasStride = [...featureIndices].some((i) => strideFeatures.has(i));

    if (hasLowerBody) {
      affectedMarkets.push('Anytime Scorer', 'Shots On Target');
    }
    if (hasStride) {
      affectedMarkets.push('Next Goal', 'Team Total Goals');
    }
    if (affectedMarkets.length === 0) {
      affectedMarkets.push('Match Odds');
    }

    // Estimate attacking phases to impact: higher score = sooner impact
    const estimatedPhasesToImpact = Math.max(
      1,
      Math.round(8 - score * 5),
    );

    // Direction is always "under" for gait anomalies (performance degradation)
    const playerPropDirection: MarketImpact['playerPropDirection'] =
      score >= ALERT_THRESHOLD ? 'under' : 'neutral';

    return {
      playerPropDirection,
      magnitudeEstimate,
      affectedMarkets,
      estimatedPhasesToImpact,
    };
  }
}
