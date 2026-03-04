import type {
  PlayerProfileJSON,
  PlayerInfo,
  DeviationReport,
} from '../types/index';
import { FEATURE_COUNT } from '../types/index';

/**
 * Manages the long-term "normal" gait profile for a specific player.
 * Loaded from pre-computed JSON (Worker 5 provides baseline data).
 */
export class PlayerBaseline {
  private readonly profile: PlayerProfileJSON;
  private readonly mean: number[];
  private readonly stdDev: number[];

  constructor(profileData: PlayerProfileJSON) {
    this.profile = profileData;
    this.mean = profileData.baselineMean;
    this.stdDev = profileData.baselineStdDev;
  }

  getBaselineMean(): number[] {
    return [...this.mean];
  }

  getBaselineStdDev(): number[] {
    return [...this.stdDev];
  }

  getPlayerInfo(): PlayerInfo {
    return this.profile.player;
  }

  getProfile(): PlayerProfileJSON {
    return this.profile;
  }

  /**
   * Computes deviation of current feature vector from this player's baseline.
   * Returns per-feature deviations, z-scores, and an overall distance metric.
   */
  computeDeviation(currentFeatures: number[]): DeviationReport {
    const featureDeviations: number[] = new Array(FEATURE_COUNT);
    const zScores: number[] = new Array(FEATURE_COUNT);

    let mahalanobisSum = 0;
    let totalDeviation = 0;

    for (let i = 0; i < FEATURE_COUNT; i++) {
      const diff = currentFeatures[i] - this.mean[i];
      featureDeviations[i] = diff;

      const sd = this.stdDev[i];
      if (sd > 1e-9) {
        zScores[i] = diff / sd;
        // Simplified Mahalanobis (diagonal covariance = independent z-scores squared)
        mahalanobisSum += zScores[i] * zScores[i];
      } else {
        zScores[i] = 0;
      }

      totalDeviation += Math.abs(zScores[i]);
    }

    const mahalanobisDistance = Math.sqrt(mahalanobisSum);
    const overallDeviation = totalDeviation / FEATURE_COUNT;

    return {
      featureDeviations,
      zScores,
      mahalanobisDistance,
      overallDeviation,
    };
  }
}
