# GaitSignal

> Per-player movement anomaly detection from football video: turn pose-derived biomechanics into a live, confidence-scored signal.

**Status: idea stage.** This repository is a concept demo, not a production model. It uses synthetic movement streams and deterministic anomaly logic to show what a real football pipeline could output in real time. There is no live video ingestion, no trained pose model, and no deployed inference service in this repo.

This is the companion concept to [Acoustic Momentum](https://github.com/dmontgomery40/acoustic-momentum): one signal from the crowd, one signal from the player. The common theme is alternative in-play intelligence from data that already exists in the venue.

![GaitSignal - Saka actionable movement signal](screenshots/saka-actionable.png)

Football broadcasts already capture every sprint, deceleration, recovery run, and contact event. Standard tracking tells you where a player is. GaitSignal is aimed at the missing layer: how that player is moving relative to their own baseline.

## What It Is

GaitSignal is a per-player movement deviation framework.

- Each player has a personal baseline.
- Live movement is converted into a 20-feature biomechanical vector.
- The system scores change against that player's own normal pattern.
- Sustained multi-feature drift escalates through a 4-state machine:

`monitoring -> alert -> confirmed -> actionable`

## What It Is Not

This is not an injury diagnosis engine.

The point is to detect movement change, not to claim why the change happened. Fatigue, contact, tactical role change, or an emerging physical issue can all produce a signal. Interpretation is downstream.

## Why Football Video

Football is the right stress test because the signal has to survive real noise:

- frequent contact and transient limps
- changing camera angle, zoom, and occlusion
- player-specific movement signatures
- match-state shifts between settled possession, transition, pressing, and recovery

A useful system should escalate on sustained correlated drift and clear quickly on one-off contact artifacts. That distinction is built into the demo.

## Architecture

### Demo (this repository)

Synthetic per-frame movement data is generated for each scenario, scored against the selected player's baseline, and rendered in a React dashboard with:

- skeleton overlay on a football pitch
- live movement metric timeline
- scenario cue index for fast scrubbing
- trading signal panel tied to football markets

```text
Synthetic movement frames
        ->
20-D biomechanical feature vector
        ->
Anomaly scorer + state machine
        ->
Football trading signal UI
```

### Production Direction (proposed)

A real system would add:

- player and ball detection / tracking
- pitch calibration and homography into pitch coordinates
- lower-body and trunk pose estimation
- per-player temporal models
- online anomaly scoring with confidence calibration
- event-aware gating to suppress obvious false positives after short contact events

## Research Framing

The practical research sequence is:

1. Recover player tracks, ball track, and pitch coordinates from match video.
2. Measure pose quality and decide what movement features are actually stable enough to trust from broadcast footage.
3. Compare simple baselines first: rolling z-score, one-class models, and sequence anomaly models.
4. Optimize for false-positive rate, lead time, and stability, not just raw accuracy.
5. Only after the extraction layer is trustworthy, move to higher-order outputs such as fatigue, tactical role drift, or market-facing signals.

The central question is not "can a model detect everything?" It is "what can be extracted reliably enough from football video to be decision-useful in real time?"

## Demo Scenarios

### 1. Saka Touchline Guarding

Primary demo. A subtle right-side guarding pattern appears after a long recovery sprint and hard deceleration. The system progresses cleanly from `monitoring` to `actionable`.

| Baseline | Actionable |
| --- | --- |
| ![Saka baseline monitoring](screenshots/saka-baseline.png) | ![Saka actionable signal](screenshots/saka-actionable.png) |

### 2. Pedri Pressing Drift

Late-match workload accumulation produces a slower, lower-confidence signal. This is not an acute-event story. It is a "something is degrading over repeated actions" story.

### 3. Musiala Contact Reset

Heavy contact creates a brief perturbation and a short alert, but the signal clears before confirmation. That is intentional. A system like this is only useful if it knows when not to fire.

![Musiala transient alert reset](screenshots/musiala-reset.png)

## Current Branch Goal

This branch reframes the original basketball concept around European football:

- football-specific scenarios
- football market mappings
- football pitch visualization
- player profiles for Saka, Pedri, and Musiala
- cue points tuned for demo recording and explainer video production

## Running The Demo

```bash
npm install
npm run dev
```

Then open the local Vite app, choose a scenario, and use the timeline to scrub directly to the key moments.
