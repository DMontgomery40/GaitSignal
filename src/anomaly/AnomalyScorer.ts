import type {
  GaitMetricsSnapshot,
  AnomalyResult,
  FeatureContribution,
  SeverityLevel,
} from '../types/index';
import { FEATURE_NAMES, FEATURE_COUNT } from '../types/index';
import { PlayerBaseline } from './PlayerBaseline';
import { RollingWindow } from './RollingWindow';

// Feature weights: asymmetry features (indices 2,5,8,11,14,17) are most
// diagnostically valuable, followed by trunk metrics (18,19).
const FEATURE_WEIGHTS: number[] = [
  1.0, 1.0, 2.0, // knee flex L, R, asym
  1.0, 1.0, 2.0, // hip flex L, R, asym
  1.0, 1.0, 2.0, // ankle dorsiflex L, R, asym
  1.0, 1.0, 2.0, // stride length L, R, asym
  0.8, 0.8, 2.0, // stride time L, R, asym
  0.8, 0.8, 2.0, // ground contact L, R, asym
  1.5, 1.5,       // trunk lean, lateral tilt
];

const WEIGHT_SUM = FEATURE_WEIGHTS.reduce((a, b) => a + b, 0);

// Rate-of-change scoring uses the last N feature vectors
const ROC_LOOKBACK = 10;

function severityFromScore(score: number): SeverityLevel {
  if (score >= 0.7) return 'critical';
  if (score >= 0.5) return 'significant';
  if (score >= 0.3) return 'elevated';
  return 'normal';
}

/**
 * Core anomaly detection engine.
 * Combines short-term rolling window analysis with long-term baseline comparison.
 * The key insight: score RATE OF CHANGE separately from absolute deviation.
 */
export class AnomalyScorer {
  private readonly baseline: PlayerBaseline;
  // History of feature vectors for rate-of-change computation
  private featureHistory: number[][] = [];

  constructor(baseline: PlayerBaseline) {
    this.baseline = baseline;
  }

  /**
   * Score a single gait metrics snapshot against rolling windows and baseline.
   */
  score(
    currentMetrics: GaitMetricsSnapshot,
    shortTermWindow: RollingWindow,
    mediumTermWindow: RollingWindow,
  ): AnomalyResult {
    const fv = currentMetrics.featureVector;

    // Store for rate-of-change computation
    this.featureHistory.push([...fv]);
    if (this.featureHistory.length > ROC_LOOKBACK + 1) {
      this.featureHistory.shift();
    }

    // --- 1. Baseline deviation ---
    const baselineDeviation = this.baseline.computeDeviation(fv);

    // --- 2. Short-term deviation (rolling window z-scores) ---
    const shortTermZ = shortTermWindow.size() >= 5
      ? shortTermWindow.getZScores(fv)
      : new Array(FEATURE_COUNT).fill(0);

    // --- 3. Medium-term deviation ---
    const mediumTermZ = mediumTermWindow.size() >= 5
      ? mediumTermWindow.getZScores(fv)
      : new Array(FEATURE_COUNT).fill(0);

    // --- 4. Rate of change (first derivative of features) ---
    const rateOfChange = this.computeRateOfChange();

    // --- Composite scoring ---
    const contributions: FeatureContribution[] = [];

    let baselineScoreSum = 0;
    let shortTermScoreSum = 0;
    let rocScoreSum = 0;
    let correlatedCount = 0;

    for (let i = 0; i < FEATURE_COUNT; i++) {
      const w = FEATURE_WEIGHTS[i];
      const bz = Math.abs(baselineDeviation.zScores[i]);
      const sz = Math.abs(shortTermZ[i]);
      const roc = Math.abs(rateOfChange[i]);

      // Weighted contribution from each scoring dimension
      const baselineContrib = Math.min(bz / 3.0, 1.0) * w;
      const shortTermContrib = Math.min(sz / 3.0, 1.0) * w;
      const rocContrib = Math.min(roc / 2.0, 1.0) * w;

      baselineScoreSum += baselineContrib;
      shortTermScoreSum += shortTermContrib;
      rocScoreSum += rocContrib;

      // Count correlated deviations (features where multiple signals agree)
      if (bz > 1.5 && (sz > 1.5 || roc > 1.0)) {
        correlatedCount++;
      }

      const totalContrib = (baselineContrib * 0.3 + shortTermContrib * 0.3 + rocContrib * 0.4);

      contributions.push({
        featureName: FEATURE_NAMES[i],
        featureIndex: i,
        currentValue: fv[i],
        baselineValue: this.baseline.getBaselineMean()[i],
        zScore: baselineDeviation.zScores[i],
        rateOfChange: rateOfChange[i],
        contribution: totalContrib / WEIGHT_SUM,
      });
    }

    // Normalize dimension scores to [0, 1]
    const baselineDeviationScore = Math.min(baselineScoreSum / WEIGHT_SUM, 1.0);
    const shortTermDeviationScore = Math.min(shortTermScoreSum / WEIGHT_SUM, 1.0);
    const rateOfChangeScore = Math.min(rocScoreSum / WEIGHT_SUM, 1.0);

    // Composite: rate of change is weighted most heavily (the key insight)
    const rawComposite =
      rateOfChangeScore * 0.4 +
      baselineDeviationScore * 0.3 +
      shortTermDeviationScore * 0.3;

    // Apply correlation bonus: multiple features deviating together increases score
    const correlationMultiplier = 1.0 + Math.min(correlatedCount, 6) * 0.05;
    const compositeScore = Math.min(rawComposite * correlationMultiplier, 1.0);

    // Confidence: based on data availability, correlation count, and window fullness
    const dataConfidence = Math.min(shortTermWindow.size() / 15, 1.0);
    const correlationConfidence = Math.min(correlatedCount / 4, 1.0);
    const historyConfidence = Math.min(this.featureHistory.length / ROC_LOOKBACK, 1.0);
    const confidence = dataConfidence * 0.3 + correlationConfidence * 0.4 + historyConfidence * 0.3;

    // Sort contributions by absolute contribution descending
    contributions.sort((a, b) => Math.abs(b.contribution) - Math.abs(a.contribution));

    return {
      timestampMs: currentMetrics.timestampMs,
      compositeScore,
      severity: severityFromScore(compositeScore),
      confidence,
      rateOfChangeScore,
      baselineDeviationScore,
      shortTermDeviationScore,
      contributingFeatures: contributions,
    };
  }

  /**
   * Returns the top N contributing features from an anomaly result.
   */
  getContributingFeatures(result: AnomalyResult, topN = 5): FeatureContribution[] {
    return result.contributingFeatures.slice(0, topN);
  }

  /**
   * Compute first derivative of each feature over the recent history.
   * Uses linear regression slope over the lookback window, normalized by baseline stddev.
   */
  private computeRateOfChange(): number[] {
    const roc = new Array(FEATURE_COUNT).fill(0);
    const n = this.featureHistory.length;
    if (n < 3) return roc;

    const baselineStd = this.baseline.getBaselineStdDev();

    // Linear regression slope per feature over the history window
    // slope = (n * sum(x*y) - sum(x)*sum(y)) / (n * sum(x^2) - sum(x)^2)
    const sumX = (n * (n - 1)) / 2;
    const sumX2 = (n * (n - 1) * (2 * n - 1)) / 6;
    const denom = n * sumX2 - sumX * sumX;

    if (Math.abs(denom) < 1e-12) return roc;

    for (let i = 0; i < FEATURE_COUNT; i++) {
      let sumY = 0;
      let sumXY = 0;
      for (let t = 0; t < n; t++) {
        const y = this.featureHistory[t][i];
        sumY += y;
        sumXY += t * y;
      }
      const slope = (n * sumXY - sumX * sumY) / denom;

      // Normalize slope by baseline stddev so rate-of-change is comparable across features
      const sd = baselineStd[i];
      roc[i] = sd > 1e-9 ? slope / sd : 0;
    }

    return roc;
  }

  reset(): void {
    this.featureHistory = [];
  }
}
