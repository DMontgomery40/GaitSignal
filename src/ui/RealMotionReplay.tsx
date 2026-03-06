import { useEffect, useMemo, useRef } from 'react';
import type { PoseDisplayFrame } from '../types/index.ts';

interface RealMotionReplayProps {
  displayPose: PoseDisplayFrame | null;
  poseOnly?: boolean;
}

const SEGMENT_VIDEO_SRC = {
  steadyCarry: '/pose-steady-carry.webm',
  hardPlant: '/pose-hard-plant.webm',
  guardedRecovery: '/pose-guarded-recovery.webm',
} as const;

export default function RealMotionReplay({
  displayPose,
  poseOnly = false,
}: RealMotionReplayProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const targetTimeRef = useRef(0);
  const segmentSrc = useMemo(
    () => (displayPose ? SEGMENT_VIDEO_SRC[displayPose.segmentId] : null),
    [displayPose],
  );

  useEffect(() => {
    targetTimeRef.current = (displayPose?.segmentTimeMs ?? 0) / 1000;
    const video = videoRef.current;
    if (!video || !segmentSrc) return;

    const syncPlayback = () => {
      const duration = Number.isFinite(video.duration) ? video.duration : 0;
      const target = duration > 0 ? targetTimeRef.current % duration : 0;
      if (Math.abs(video.currentTime - target) > 0.06) {
        video.currentTime = target;
      }
      void video.play().catch(() => {});
    };

    if (video.readyState >= 1) {
      syncPlayback();
      return;
    }

    video.addEventListener('loadedmetadata', syncPlayback);
    return () => video.removeEventListener('loadedmetadata', syncPlayback);
  }, [displayPose?.segmentTimeMs, segmentSrc]);

  if (!segmentSrc) return null;

  return (
    <div className="absolute inset-0 overflow-hidden rounded-lg">
      <video
        key={segmentSrc}
        ref={videoRef}
        className={`absolute inset-0 w-full h-full object-cover ${poseOnly ? 'opacity-100' : 'opacity-90'}`}
        src={segmentSrc}
        autoPlay
        muted
        loop
        playsInline
        preload="auto"
      />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_18%,rgba(255,255,255,0.08),transparent_42%)]" />
      <div className={poseOnly ? 'absolute inset-0 bg-black/6' : 'absolute inset-0 bg-[linear-gradient(180deg,rgba(5,7,12,0.12),rgba(5,7,12,0.38))]'} />
    </div>
  );
}
