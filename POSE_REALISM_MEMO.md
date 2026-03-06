# Pose Realism Memo

## Chosen Path

Chosen implementation: offline replay of a real football clip, with two linked assets:

- real extracted pose data in [`src/demo/data/real-football-pose.json`](/Users/davidmontgomery/GaitSignal/src/demo/data/real-football-pose.json)
- real cropped football video segments in [`public/pose-steady-carry.webm`](/Users/davidmontgomery/GaitSignal/public/pose-steady-carry.webm), [`public/pose-hard-plant.webm`](/Users/davidmontgomery/GaitSignal/public/pose-hard-plant.webm), and [`public/pose-guarded-recovery.webm`](/Users/davidmontgomery/GaitSignal/public/pose-guarded-recovery.webm)

Why this path won:

- MediaPipe Pose Landmarker was the fastest reliable way to get real body motion into the existing demo flow.
- The extracted landmarks were strong enough for the analytics subset and scenario timing.
- A pure landmark renderer still failed the literal blind human-recognition check.
- The private-demo-safe fallback was to keep the extracted pose data underneath, but show the actual footballer clip as the primary visual layer and keep the landmark overlay secondary.

## Candidate Comparison

| Candidate | Realism | Integration Cost | Browser Fit | Soccer Fit | License Fit | Decision |
| --- | --- | --- | --- | --- | --- | --- |
| MediaPipe Pose Landmarker | Good for real landmark extraction | Low | Strong | Good for single-player clip replay | Apache-2.0 repo/license | Chosen extractor |
| MMPose / RTMPose | Potentially stronger offline pose quality | Medium to high | Weak in-browser | Good | Apache-2.0 repo/license | Strong fallback, not needed |
| Detectron2 keypoints | Acceptable fallback | Medium | Weak in-browser | Acceptable | Apache-2.0 code, but official model zoo weights are CC BY-SA 3.0 | Rejected for license fit and extra complexity |
| Sports2D | Useful biomechanics framing | Medium | Offline-first | Weak for this broadcast-style / perspective-heavy demo | BSD-3-Clause | Rejected for fit |

Source checks:

- MediaPipe Pose Landmarker docs: <https://ai.google.dev/edge/mediapipe/solutions/vision/pose_landmarker>
- MediaPipe repo license page: <https://github.com/google-ai-edge/mediapipe>
- MMPose repo/license: <https://github.com/open-mmlab/mmpose>
- Detectron2 repo/license: <https://github.com/facebookresearch/detectron2>
- Detectron2 model-zoo weight license note: <https://raw.githubusercontent.com/facebookresearch/detectron2/main/MODEL_ZOO.md>
- Sports2D repo/license: <https://github.com/davidpagnon/Sports2D>

## Source Clip And License Note

Chosen visual source clip:

- Title: "Soccer player juggling the ball with great skill"
- Source page: <https://mixkit.co/free-stock-video/soccer-player-juggling-the-ball-with-great-skill-43490/>
- Media URL used for preprocessing: <https://assets.mixkit.co/videos/43490/43490-720.mp4>
- License page: <https://mixkit.co/license/>

Important license note:

- Mixkit is not MIT, Apache-2.0, BSD, or public domain.
- Mixkit’s site labels this item as stock video under its Mixkit stock-video license family; Mixkit pages also state free stock-video clips are for commercial or personal use.
- That is acceptable here only because this is a private interview demo and the license is being called out explicitly.
- This would not be my preferred long-term asset source for a repo meant for broad redistribution.
- The numeric pose JSON is committed.
- The replay video segments are committed because the pure-landmark version did not satisfy the human-recognition bar.
- If this demo is later reused outside the interview context, replace the Mixkit-derived video assets with a clearly redistributable source, ideally public-domain or similarly unambiguous footage.

## Verification

Asset-quality checks on [`src/demo/data/real-football-pose.json`](/Users/davidmontgomery/GaitSignal/src/demo/data/real-football-pose.json):

- core-joint visibility over `0.5`: shoulders, hips, knees, and ankles each at `97.4%` of frames
- average normalized pelvis jump: `0.0002`
- max normalized pelvis jump: `0.0053`

Artifacts:

- Before: [`screenshots/saka-baseline.png`](/Users/davidmontgomery/GaitSignal/screenshots/saka-baseline.png)
- After: [`screenshots/saka-pose-realism-after.png`](/Users/davidmontgomery/GaitSignal/screenshots/saka-pose-realism-after.png)
- Pose-only contact sheet: [`screenshots/saka-pose-realism-pose-only-contact.png`](/Users/davidmontgomery/GaitSignal/screenshots/saka-pose-realism-pose-only-contact.png)
- Pose-only clip: [`screenshots/saka-pose-realism-pose-only.mp4`](/Users/davidmontgomery/GaitSignal/screenshots/saka-pose-realism-pose-only.mp4)
- Pose-only GIF: [`screenshots/saka-pose-realism-pose-only.gif`](/Users/davidmontgomery/GaitSignal/screenshots/saka-pose-realism-pose-only.gif)

Blind test, zero context, exact response:

1. A sequence of images of a person juggling a soccer ball on a field.
2. Yes.
3. Yes.
4. Soccer (football).

## Files Added Or Changed For This Path

- [`src/types/index.ts`](/Users/davidmontgomery/GaitSignal/src/types/index.ts)
- [`src/demo/PoseReplay.ts`](/Users/davidmontgomery/GaitSignal/src/demo/PoseReplay.ts)
- [`src/demo/SyntheticGaitData.ts`](/Users/davidmontgomery/GaitSignal/src/demo/SyntheticGaitData.ts)
- [`src/demo/DemoScenarios.ts`](/Users/davidmontgomery/GaitSignal/src/demo/DemoScenarios.ts)
- [`src/ui/SkeletonOverlay.tsx`](/Users/davidmontgomery/GaitSignal/src/ui/SkeletonOverlay.tsx)
- [`src/ui/RealMotionReplay.tsx`](/Users/davidmontgomery/GaitSignal/src/ui/RealMotionReplay.tsx)
- [`src/ui/VideoPanel.tsx`](/Users/davidmontgomery/GaitSignal/src/ui/VideoPanel.tsx)
- [`src/App.tsx`](/Users/davidmontgomery/GaitSignal/src/App.tsx)
- [`scripts/extract_pose_asset.py`](/Users/davidmontgomery/GaitSignal/scripts/extract_pose_asset.py)
