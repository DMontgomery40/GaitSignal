import { FEATURE_COUNT } from '../types/index';

/**
 * Generic rolling window for incremental statistics over feature vectors.
 * Maintains per-feature mean, variance, min, max using Welford's algorithm.
 */
export class RollingWindow {
  private buffer: number[][];
  private head: number;
  private count: number;
  private readonly capacity: number;

  // Incremental stats (Welford's online algorithm)
  private sum: Float64Array;
  private sumSq: Float64Array;

  constructor(windowSize: number) {
    this.capacity = windowSize;
    this.buffer = [];
    this.head = 0;
    this.count = 0;
    this.sum = new Float64Array(FEATURE_COUNT);
    this.sumSq = new Float64Array(FEATURE_COUNT);
  }

  push(featureVector: number[]): void {
    if (this.count < this.capacity) {
      this.buffer.push([...featureVector]);
      for (let i = 0; i < featureVector.length; i++) {
        this.sum[i] += featureVector[i];
        this.sumSq[i] += featureVector[i] * featureVector[i];
      }
      this.count++;
    } else {
      // Remove oldest entry from running sums
      const oldest = this.buffer[this.head];
      for (let i = 0; i < featureVector.length; i++) {
        this.sum[i] -= oldest[i];
        this.sumSq[i] -= oldest[i] * oldest[i];
        this.sum[i] += featureVector[i];
        this.sumSq[i] += featureVector[i] * featureVector[i];
      }
      this.buffer[this.head] = [...featureVector];
      this.head = (this.head + 1) % this.capacity;
    }
  }

  getMean(): number[] {
    if (this.count === 0) return new Array(FEATURE_COUNT).fill(0);
    const mean: number[] = new Array(FEATURE_COUNT);
    for (let i = 0; i < FEATURE_COUNT; i++) {
      mean[i] = this.sum[i] / this.count;
    }
    return mean;
  }

  getStdDev(): number[] {
    if (this.count < 2) return new Array(FEATURE_COUNT).fill(0);
    const std: number[] = new Array(FEATURE_COUNT);
    for (let i = 0; i < FEATURE_COUNT; i++) {
      const mean = this.sum[i] / this.count;
      const variance = this.sumSq[i] / this.count - mean * mean;
      std[i] = Math.sqrt(Math.max(0, variance));
    }
    return std;
  }

  getZScores(current: number[]): number[] {
    const mean = this.getMean();
    const std = this.getStdDev();
    const z: number[] = new Array(current.length);
    for (let i = 0; i < current.length; i++) {
      z[i] = std[i] > 1e-9 ? (current[i] - mean[i]) / std[i] : 0;
    }
    return z;
  }

  getMin(): number[] {
    if (this.count === 0) return new Array(FEATURE_COUNT).fill(0);
    const min = new Array(FEATURE_COUNT).fill(Infinity);
    for (let j = 0; j < this.count; j++) {
      const vec = this.buffer[j];
      for (let i = 0; i < FEATURE_COUNT; i++) {
        if (vec[i] < min[i]) min[i] = vec[i];
      }
    }
    return min;
  }

  getMax(): number[] {
    if (this.count === 0) return new Array(FEATURE_COUNT).fill(0);
    const max = new Array(FEATURE_COUNT).fill(-Infinity);
    for (let j = 0; j < this.count; j++) {
      const vec = this.buffer[j];
      for (let i = 0; i < FEATURE_COUNT; i++) {
        if (vec[i] > max[i]) max[i] = vec[i];
      }
    }
    return max;
  }

  getMedian(): number[] {
    if (this.count === 0) return new Array(FEATURE_COUNT).fill(0);
    const median: number[] = new Array(FEATURE_COUNT);
    for (let i = 0; i < FEATURE_COUNT; i++) {
      const sorted = this.buffer
        .slice(0, this.count)
        .map((v) => v[i])
        .sort((a, b) => a - b);
      const mid = Math.floor(sorted.length / 2);
      median[i] =
        sorted.length % 2 === 0
          ? (sorted[mid - 1] + sorted[mid]) / 2
          : sorted[mid];
    }
    return median;
  }

  /** Returns the raw buffer in chronological order (oldest first). */
  getBuffer(): number[][] {
    if (this.count < this.capacity) {
      return this.buffer.slice(0, this.count);
    }
    return [
      ...this.buffer.slice(this.head),
      ...this.buffer.slice(0, this.head),
    ];
  }

  /** Returns the last N entries in chronological order. */
  getRecent(n: number): number[][] {
    const buf = this.getBuffer();
    return buf.slice(Math.max(0, buf.length - n));
  }

  isFull(): boolean {
    return this.count >= this.capacity;
  }

  size(): number {
    return this.count;
  }

  reset(): void {
    this.buffer = [];
    this.head = 0;
    this.count = 0;
    this.sum.fill(0);
    this.sumSq.fill(0);
  }
}
