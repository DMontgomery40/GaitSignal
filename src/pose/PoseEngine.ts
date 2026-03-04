import type { PoseResult, Keypoint } from '../types/index';

/**
 * Wraps MediaPipe Pose Landmarker for frame-by-frame pose estimation.
 * In demo mode, this is not actively used (pre-computed data is loaded instead),
 * but the integration exists for technical credibility.
 */
export class PoseEngine {
  private poseLandmarker: unknown = null;
  private initialized = false;
  private readonly maxRetries = 3;

  async initialize(): Promise<void> {
    if (this.initialized) return;

    let lastError: Error | null = null;
    for (let attempt = 0; attempt < this.maxRetries; attempt++) {
      try {
        // Dynamic import to avoid bundling issues when MediaPipe WASM isn't available
        const vision = await import('@mediapipe/tasks-vision');
        const { PoseLandmarker, FilesetResolver } = vision;

        const filesetResolver = await FilesetResolver.forVisionTasks(
          '/models'
        );

        this.poseLandmarker = await PoseLandmarker.createFromOptions(
          filesetResolver,
          {
            baseOptions: {
              modelAssetPath: '/models/pose_landmarker_full.task',
              delegate: 'GPU',
            },
            runningMode: 'VIDEO',
            numPoses: 1,
            minPoseDetectionConfidence: 0.5,
            minPosePresenceConfidence: 0.5,
            minTrackingConfidence: 0.5,
          }
        );

        this.initialized = true;
        return;
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err));
        // Exponential backoff: 500ms, 1000ms, 2000ms
        if (attempt < this.maxRetries - 1) {
          await new Promise((r) => setTimeout(r, 500 * Math.pow(2, attempt)));
        }
      }
    }

    console.warn(
      'PoseEngine: MediaPipe initialization failed after retries. Demo mode will use pre-computed data.',
      lastError
    );
  }

  processFrame(videoFrame: HTMLVideoElement, timestampMs: number): PoseResult {
    const startTime = performance.now();

    if (!this.initialized || !this.poseLandmarker) {
      return {
        landmarks: [],
        worldLandmarks: [],
        timestampMs,
        inferenceTimeMs: 0,
      };
    }

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const landmarker = this.poseLandmarker as any;
      const result = landmarker.detectForVideo(videoFrame, timestampMs);
      const inferenceTimeMs = performance.now() - startTime;

      const landmarks: Keypoint[] = (result.landmarks?.[0] ?? []).map(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (lm: any, i: number) => ({
          x: lm.x,
          y: lm.y,
          z: lm.z,
          visibility: lm.visibility ?? 0,
          name: `landmark_${i}`,
        })
      );

      const worldLandmarks: Keypoint[] = (
        result.worldLandmarks?.[0] ?? []
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ).map((lm: any, i: number) => ({
        x: lm.x,
        y: lm.y,
        z: lm.z,
        visibility: lm.visibility ?? 0,
        name: `world_landmark_${i}`,
      }));

      if (inferenceTimeMs > 50) {
        console.debug(`PoseEngine: inference ${inferenceTimeMs.toFixed(1)}ms`);
      }

      return { landmarks, worldLandmarks, timestampMs, inferenceTimeMs };
    } catch (err) {
      console.error('PoseEngine: frame processing error', err);
      return {
        landmarks: [],
        worldLandmarks: [],
        timestampMs,
        inferenceTimeMs: performance.now() - startTime,
      };
    }
  }

  isInitialized(): boolean {
    return this.initialized;
  }

  destroy(): void {
    if (this.poseLandmarker) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (this.poseLandmarker as any).close?.();
      this.poseLandmarker = null;
    }
    this.initialized = false;
  }
}
