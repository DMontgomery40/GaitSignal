import type { KeypointFrame, ProcessedFrame } from '../types/index';
import { PoseEngine } from './PoseEngine';
import { KeypointFilter } from './KeypointFilter';
import { DEFAULT_FPS } from '../utils/constants';

type FrameCallback = (frame: ProcessedFrame) => void;

/**
 * Manages video playback and frame extraction.
 * Supports two modes:
 *  1. Real video: processes each frame through MediaPipe via PoseEngine
 *  2. Demo mode: reads pre-computed KeypointFrame[] data and emits frames on a timer
 */
export class VideoProcessor {
  private videoElement: HTMLVideoElement | null = null;
  private poseEngine: PoseEngine;
  private keypointFilter: KeypointFilter;
  private frameCallbacks: FrameCallback[] = [];

  // Demo data mode
  private demoData: KeypointFrame[] | null = null;
  private demoIndex = 0;
  private demoStartTime = 0;

  // Playback state
  private playing = false;
  private playbackSpeed = 1.0;
  private fps: number;
  private animationFrameId: number | null = null;
  private lastFrameTime = 0;

  constructor(fps: number = DEFAULT_FPS) {
    this.fps = fps;
    this.poseEngine = new PoseEngine();
    this.keypointFilter = new KeypointFilter();
  }

  async loadVideo(src: string): Promise<void> {
    this.demoData = null;
    this.demoIndex = 0;

    const video = document.createElement('video');
    video.src = src;
    video.crossOrigin = 'anonymous';
    video.playsInline = true;
    video.muted = true;

    await new Promise<void>((resolve, reject) => {
      video.onloadeddata = () => resolve();
      video.onerror = () => reject(new Error(`Failed to load video: ${src}`));
    });

    this.videoElement = video;
    await this.poseEngine.initialize();
  }

  loadDemoData(keypointData: KeypointFrame[]): void {
    this.demoData = keypointData;
    this.demoIndex = 0;
    this.videoElement = null;
    this.keypointFilter.reset();
  }

  onFrame(callback: FrameCallback): void {
    this.frameCallbacks.push(callback);
  }

  removeFrameCallback(callback: FrameCallback): void {
    this.frameCallbacks = this.frameCallbacks.filter((cb) => cb !== callback);
  }

  play(): void {
    if (this.playing) return;
    this.playing = true;
    this.demoStartTime = performance.now() - this.getCurrentTime();
    this.lastFrameTime = performance.now();
    this.tick();
  }

  pause(): void {
    this.playing = false;
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    if (this.videoElement) {
      this.videoElement.pause();
    }
  }

  seek(timeMs: number): void {
    if (this.demoData) {
      // Find the closest frame to the requested time
      let bestIdx = 0;
      let bestDiff = Infinity;
      for (let i = 0; i < this.demoData.length; i++) {
        const diff = Math.abs(this.demoData[i].timestampMs - timeMs);
        if (diff < bestDiff) {
          bestDiff = diff;
          bestIdx = i;
        }
      }
      this.demoIndex = bestIdx;
      this.demoStartTime = performance.now() - timeMs;
      this.keypointFilter.reset();

      // Emit the frame at the seeked position
      if (this.demoData[this.demoIndex]) {
        this.emitDemoFrame(this.demoData[this.demoIndex]);
      }
    } else if (this.videoElement) {
      this.videoElement.currentTime = timeMs / 1000;
    }
  }

  setPlaybackSpeed(speed: number): void {
    this.playbackSpeed = speed;
    if (this.videoElement) {
      this.videoElement.playbackRate = speed;
    }
    // Recalculate demoStartTime to maintain current position
    if (this.demoData && this.playing) {
      const currentTime = this.getCurrentTime();
      this.demoStartTime = performance.now() - currentTime / speed;
    }
  }

  getCurrentTime(): number {
    if (this.demoData) {
      if (this.demoIndex < this.demoData.length) {
        return this.demoData[this.demoIndex].timestampMs;
      }
      if (this.demoData.length > 0) {
        return this.demoData[this.demoData.length - 1].timestampMs;
      }
      return 0;
    }
    if (this.videoElement) {
      return this.videoElement.currentTime * 1000;
    }
    return 0;
  }

  getDuration(): number {
    if (this.demoData && this.demoData.length > 0) {
      return this.demoData[this.demoData.length - 1].timestampMs;
    }
    if (this.videoElement) {
      return this.videoElement.duration * 1000;
    }
    return 0;
  }

  isPlaying(): boolean {
    return this.playing;
  }

  isDemoMode(): boolean {
    return this.demoData !== null;
  }

  getFrameCount(): number {
    return this.demoData?.length ?? 0;
  }

  destroy(): void {
    this.pause();
    this.poseEngine.destroy();
    this.frameCallbacks = [];
    this.demoData = null;
    this.videoElement = null;
  }

  private tick = (): void => {
    if (!this.playing) return;

    const now = performance.now();
    const frameInterval = 1000 / this.fps;
    const elapsed = now - this.lastFrameTime;

    if (elapsed >= frameInterval / this.playbackSpeed) {
      this.lastFrameTime = now;

      if (this.demoData) {
        this.tickDemo();
      } else if (this.videoElement) {
        this.tickVideo();
      }
    }

    this.animationFrameId = requestAnimationFrame(this.tick);
  };

  private tickDemo(): void {
    if (!this.demoData || this.demoIndex >= this.demoData.length) {
      this.playing = false;
      // Notify completion
      return;
    }

    const frame = this.demoData[this.demoIndex];
    this.emitDemoFrame(frame);
    this.demoIndex++;
  }

  private emitDemoFrame(frame: KeypointFrame): void {
    const smoothed = this.keypointFilter.smoothPrecomputed(frame.keypoints);

    const processedFrame: ProcessedFrame = {
      timestampMs: frame.timestampMs,
      frameIndex: frame.frameIndex,
      keypoints: smoothed,
      rawPose: null,
    };

    for (const cb of this.frameCallbacks) {
      cb(processedFrame);
    }
  }

  private tickVideo(): void {
    if (!this.videoElement || this.videoElement.paused || this.videoElement.ended) {
      return;
    }

    const timestampMs = this.videoElement.currentTime * 1000;
    const poseResult = this.poseEngine.processFrame(this.videoElement, timestampMs);
    const filtered = this.keypointFilter.filter(poseResult);

    if (!filtered) return;

    const processedFrame: ProcessedFrame = {
      timestampMs,
      frameIndex: Math.floor(timestampMs / (1000 / this.fps)),
      keypoints: filtered,
      rawPose: poseResult,
    };

    for (const cb of this.frameCallbacks) {
      cb(processedFrame);
    }
  }
}
