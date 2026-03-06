// ============================================================
// DemoController — Orchestrates demo scenario playback
// ============================================================

import type { DemoFrame, ScenarioInfo } from '../types/index.ts';
import { SCENARIOS, generateFramesForScenario, getScenarioById } from './DemoScenarios.ts';

export type PlaybackSpeed = 0.5 | 1 | 2;

export interface DemoControllerCallbacks {
  onFrame?: (frame: DemoFrame) => void;
  onScenarioChange?: (scenario: ScenarioInfo) => void;
  onComplete?: () => void;
  onPlayStateChange?: (playing: boolean) => void;
}

export class DemoController {
  private frames: DemoFrame[] = [];
  private currentScenario: ScenarioInfo | null = null;
  private currentFrameIndex = 0;
  private playing = false;
  private speed: PlaybackSpeed = 1;
  private animationFrameId: number | null = null;
  private lastTickTime: number | null = null;
  private accumulatedTime = 0;
  private callbacks: DemoControllerCallbacks = {};
  private readonly fps = 30;
  private readonly frameDurationMs = 1000 / 30;

  constructor(callbacks?: DemoControllerCallbacks) {
    if (callbacks) this.callbacks = callbacks;
  }

  // --- Scenario management ---

  getAvailableScenarios(): ScenarioInfo[] {
    return SCENARIOS;
  }

  getCurrentScenario(): ScenarioInfo | null {
    return this.currentScenario;
  }

  loadScenario(scenarioId: string): void {
    const scenario = getScenarioById(scenarioId);
    if (!scenario) {
      throw new Error(`Unknown scenario: ${scenarioId}`);
    }

    this.pause();
    this.currentScenario = scenario;
    this.frames = generateFramesForScenario(scenario, this.fps);
    this.currentFrameIndex = 0;
    this.accumulatedTime = 0;
    this.lastTickTime = null;

    this.callbacks.onScenarioChange?.(scenario);

    // Emit first frame immediately
    if (this.frames.length > 0) {
      this.callbacks.onFrame?.(this.frames[0]);
    }
  }

  // --- Playback controls ---

  play(): void {
    if (this.playing || this.frames.length === 0) return;
    this.playing = true;
    this.lastTickTime = null;
    this.callbacks.onPlayStateChange?.(true);
    this.tick();
  }

  pause(): void {
    this.playing = false;
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    this.lastTickTime = null;
    this.callbacks.onPlayStateChange?.(false);
  }

  togglePlayPause(): void {
    if (this.playing) {
      this.pause();
    } else {
      this.play();
    }
  }

  isPlaying(): boolean {
    return this.playing;
  }

  setSpeed(speed: PlaybackSpeed): void {
    this.speed = speed;
  }

  getSpeed(): PlaybackSpeed {
    return this.speed;
  }

  // --- Seeking ---

  seek(timestampMs: number): void {
    if (this.frames.length === 0) return;

    // Find the frame closest to the requested timestamp
    let targetIndex = 0;
    for (let i = 0; i < this.frames.length; i++) {
      if (this.frames[i].timestampMs <= timestampMs) {
        targetIndex = i;
      } else {
        break;
      }
    }

    this.currentFrameIndex = targetIndex;
    this.accumulatedTime = this.frames[targetIndex].timestampMs;
    this.lastTickTime = null;
    this.callbacks.onFrame?.(this.frames[targetIndex]);
  }

  seekToNextEvent(): void {
    if (this.frames.length === 0) return;

    // Find next frame where pricing state changes or narrative overlay starts
    const currentState = this.frames[this.currentFrameIndex].pricingEdge.edgeState;
    for (let i = this.currentFrameIndex + 1; i < this.frames.length; i++) {
      const frame = this.frames[i];
      if (
        frame.pricingEdge.edgeState !== currentState ||
        (frame.narrativeOverlay &&
          (i === 0 || !this.frames[i - 1].narrativeOverlay ||
            this.frames[i - 1].narrativeOverlay?.text !== frame.narrativeOverlay.text))
      ) {
        this.currentFrameIndex = i;
        this.accumulatedTime = frame.timestampMs;
        this.lastTickTime = null;
        this.callbacks.onFrame?.(frame);
        return;
      }
    }
  }

  // --- State queries ---

  getCurrentFrame(): DemoFrame | null {
    if (this.frames.length === 0) return null;
    return this.frames[this.currentFrameIndex] ?? null;
  }

  getCurrentTimestampMs(): number {
    return this.frames[this.currentFrameIndex]?.timestampMs ?? 0;
  }

  getTotalDurationMs(): number {
    if (this.frames.length === 0) return 0;
    return this.frames[this.frames.length - 1].timestampMs;
  }

  getProgress(): number {
    const total = this.getTotalDurationMs();
    if (total === 0) return 0;
    return this.getCurrentTimestampMs() / total;
  }

  getTotalFrames(): number {
    return this.frames.length;
  }

  getCurrentFrameIndex(): number {
    return this.currentFrameIndex;
  }

  /** Get a slice of recent frames for timeline rendering */
  getRecentFrames(count: number): DemoFrame[] {
    const start = Math.max(0, this.currentFrameIndex - count + 1);
    return this.frames.slice(start, this.currentFrameIndex + 1);
  }

  /** Get all frames up to current for full timeline */
  getAllFramesUpToCurrent(): DemoFrame[] {
    return this.frames.slice(0, this.currentFrameIndex + 1);
  }

  // --- Callbacks ---

  setCallbacks(callbacks: DemoControllerCallbacks): void {
    this.callbacks = callbacks;
  }

  updateCallback<K extends keyof DemoControllerCallbacks>(
    key: K,
    cb: DemoControllerCallbacks[K],
  ): void {
    this.callbacks[key] = cb;
  }

  // --- Cleanup ---

  destroy(): void {
    this.pause();
    this.frames = [];
    this.currentScenario = null;
    this.callbacks = {};
  }

  // --- Internal tick loop ---

  private tick = (): void => {
    if (!this.playing) return;

    const now = performance.now();
    if (this.lastTickTime !== null) {
      const delta = (now - this.lastTickTime) * this.speed;
      this.accumulatedTime += delta;

      // Advance frames based on accumulated time
      while (
        this.currentFrameIndex < this.frames.length - 1 &&
        this.frames[this.currentFrameIndex + 1].timestampMs <= this.accumulatedTime
      ) {
        this.currentFrameIndex++;
      }

      this.callbacks.onFrame?.(this.frames[this.currentFrameIndex]);

      // Check for completion
      if (this.currentFrameIndex >= this.frames.length - 1) {
        this.pause();
        this.callbacks.onComplete?.();
        return;
      }
    }
    this.lastTickTime = now;
    this.animationFrameId = requestAnimationFrame(this.tick);
  };
}
