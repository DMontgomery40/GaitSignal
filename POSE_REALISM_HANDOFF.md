# HANDOFF PROMPT — Make The Pose Look Real

Use this as the opening prompt for a fresh Codex session.

---

You are working in:

`/Users/davidmontgomery/GaitSignal`

This is for a private job-interview demo, not a production or commercial launch. That relaxes the business stakes, but it does **not** remove the need to be explicit about licensing. Prefer MIT / Apache-2.0 / BSD where possible. If you seriously consider AGPL, non-commercial-only, research-only, or unclear licensing, you must call that out explicitly and justify it.

## Mission

The current “pose estimation” visual is not credible. It reads like a cartoon squid robot, not a human athlete.

The mission is to replace it with something that is:

1. recognizably human
2. ideally recognizably athletic / sport-like
3. bonus points: recognizably association football / soccer

If possible, make it **real** by using actual pose extraction from a real human sports clip or a real open-source pose stack. If full real-time or fully integrated “live” pose extraction is too much for the demo, then the fallback is:

- use real extracted pose data offline and replay it in the demo, or
- use a far more realistic human pose / avatar system driven by real motion

Do **not** spend this session polishing the current fake trapezoid skeleton. That is not the task. The task is to make the motion read as a person.

## Current Failure Mode

Read these files first:

- `/Users/davidmontgomery/GaitSignal/src/ui/SkeletonOverlay.tsx`
- `/Users/davidmontgomery/GaitSignal/src/demo/SyntheticGaitData.ts`
- `/Users/davidmontgomery/GaitSignal/src/types/index.ts`
- `/Users/davidmontgomery/GaitSignal/src/ui/VideoPanel.tsx`
- `/Users/davidmontgomery/GaitSignal/src/demo/DemoScenarios.ts`

What is happening now:

- the “pose” is mostly fabricated in `featureVectorToKeypoints(...)` in `SyntheticGaitData.ts`
- the renderer in `SkeletonOverlay.tsx` is inferring a head and arms from ankle swing
- the keypoint model is too sparse to read as a human body
- the result does not pass a basic human-recognition test

The likely correct move is to replace the pose source and possibly the pose data model, not just tweak colors or line widths.

## Strong Preferences

### Prefer this order of attack

1. **Best case**: real pose extracted from real soccer footage, then integrated into the demo
2. **Good fallback**: offline pose extraction from real footage, then replayed as demo data
3. **Acceptable fallback**: realistic human kinematic animation driven by a real motion source or substantially richer joint model
4. **Bad outcome**: keep the same fake geometry and merely style it differently

### Important practical note

This is a demo. Offline precomputation is acceptable if it materially improves realism.

You do **not** need a production-grade real-time inference pipeline if an offline pipeline gives a dramatically better result for the interview.

## Research Requirements

Do extensive research first. Use web, official docs, GitHub repos, and license files. Use agents if helpful.

You must produce a short research memo before you commit to an implementation path. That memo should compare:

- realism / quality
- implementation complexity
- browser friendliness vs offline pipeline
- multi-person support
- soccer suitability
- license fit for an interview demo

### Starting candidates to verify from official sources

These are starting points, not approved conclusions. Re-verify all of them:

#### Candidate A: MediaPipe Pose / Pose Landmarker

- likely fit: easiest route to real human motion quickly
- likely strengths: mature, fast, 33 landmarks, browser and Python options
- likely license family: Apache-2.0
- official starting points:
  - https://ai.google.dev/edge/mediapipe/solutions/vision/pose_landmarker
  - https://github.com/google-ai-edge/mediapipe

#### Candidate B: OpenMMLab MMPose / RTMPose

- likely fit: stronger pose quality, especially if you are okay with offline extraction
- likely strengths: modern top-down pose stack, strong open-source ecosystem
- likely license family: Apache-2.0
- official starting points:
  - https://github.com/open-mmlab/mmpose
  - https://mmpose.readthedocs.io/

#### Candidate C: Detectron2 keypoint models

- likely fit: stable fallback if other pipelines are awkward
- likely strengths: established ecosystem, COCO keypoints
- likely license family: Apache-2.0
- official starting point:
  - https://github.com/facebookresearch/detectron2

#### Candidate D: Sports2D

- likely fit: promising if it can accelerate the biomechanics / angle-extraction side for sports clips
- likely strengths: sports-motion analysis framing, can sit on top of existing pose backends
- likely license family: BSD-3-Clause
- official starting point:
  - https://github.com/davidpagnon/Sports2D

### Candidates to treat cautiously unless explicitly justified

- Ultralytics pose stack:
  check current license carefully before using
- OpenPose:
  check current license and commercial / non-commercial restrictions carefully before using
- anything with AGPL, research-only, or ambiguous model-weight licensing:
  do not adopt casually

## What I Suspect Is The Right Solution

My bias is that the fastest credible route is one of these:

### Option 1

Use real soccer footage, extract pose offline with MediaPipe or MMPose, convert it into a richer demo pose format, and replay that in the app.

### Option 2

Use a real pose backend live or semi-live for a single-player clip and cache the results for the demo scenario.

### Option 3

If true pose extraction is too much for the session, build a richer human render driven by real motion reference:

- more joints
- real arm motion
- head / torso orientation
- better gait phase
- actual athletic silhouette
- better ball interaction

But only do this if you can defend why true extraction is not the best use of time.

## Constraints

- This repo already has the football scenarios and demo flow. Do not break them.
- You may change the pose data model if needed.
- You may add preprocessing scripts if needed.
- You may use offline extraction and check in derived demo assets if that is the best result.
- Preserve the rest of the football demo unless a change is necessary for pose realism.

## Definition Of Done

This is not done when it “looks a bit better.”

It is done when all of the following are true:

1. The pose/motion no longer reads as an abstract robot.
2. A zero-context agent, shown only a short clip of the pose layer, can tell it is a human.
3. Ideally, that same zero-context agent can tell it is a sport or athletic movement.
4. Bonus points if that same zero-context agent can infer soccer / football.
5. The implementation path is documented with licensing notes from official sources.
6. The final result is integrated into the demo, not just left as an experiment in a temp folder.

## Required Verification

At the end, perform a blind test:

1. Export a short clip showing only the new pose / pose-like motion layer if possible.
2. Show it to another agent with **zero context**.
3. Ask:
   - “What is this?”
   - “Is this a human?”
   - “Does it look like a sport?”
   - “If so, which sport?”
4. Include the exact response in your final report.

If the blind agent does not clearly identify it as human, you are not done.

## Deliverables

You must leave behind:

1. the implementation
2. a short source-verified license memo
3. before/after screenshots or clips
4. the blind-test result
5. a concise explanation of why you chose this path over the other candidates

## What Not To Do

- Do not just smooth the current lines and declare victory.
- Do not spend the session tweaking title cards, README copy, or unrelated UI polish.
- Do not assume a library is usable without verifying license and maintenance state.
- Do not optimize for theoretical elegance over what will look credible in the interview.
- Do not stop at research only. Ship the improvement.

## Helpful Local Artifacts

- Current repo screenshot:
  `/Users/davidmontgomery/GaitSignal/screenshots/saka-baseline.png`
- Current football video:
  `/Users/davidmontgomery/local-explainer-video/projects/bet365_gaitsignal_football/bet365_gaitsignal_football.mp4`

Focus on the pose quality. The question is simple:

**Can we make this read as a real human footballer instead of a fake geometry demo?**

That is the bar.
