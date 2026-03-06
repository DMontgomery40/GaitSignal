#!/usr/bin/env python3

import argparse
import json
import math
from pathlib import Path

import cv2
import mediapipe as mp
import numpy as np
from mediapipe.tasks import python
from mediapipe.tasks.python import vision

try:
    from mediapipe.python.solutions import pose as mp_pose  # type: ignore
except ModuleNotFoundError:
    mp_pose = None

LANDMARK_COUNT = 33
LEFT_SHOULDER = 11
RIGHT_SHOULDER = 12
LEFT_HIP = 23
RIGHT_HIP = 24
LEFT_KNEE = 25
RIGHT_KNEE = 26
LEFT_ANKLE = 27
RIGHT_ANKLE = 28
LEFT_HEEL = 29
RIGHT_HEEL = 30
LEFT_FOOT = 31
RIGHT_FOOT = 32


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Extract a normalized MediaPipe pose replay asset from a football clip.",
    )
    parser.add_argument("--input", required=True, help="Path to the source video clip.")
    parser.add_argument("--output", required=True, help="Path to the generated JSON asset.")
    parser.add_argument("--model", required=True, help="Path to pose_landmarker_full.task.")
    parser.add_argument("--asset-id", required=True, help="Stable asset identifier.")
    parser.add_argument("--label", required=True, help="Human-readable asset label.")
    parser.add_argument("--source-title", required=True, help="Source clip title.")
    parser.add_argument("--source-page-url", required=True, help="Source page URL.")
    parser.add_argument("--source-media-url", required=True, help="Direct media URL.")
    parser.add_argument("--license-name", required=True, help="License short name.")
    parser.add_argument("--license-url", required=True, help="License URL.")
    parser.add_argument("--creator", required=True, help="Creator or provider label.")
    parser.add_argument("--notes", required=True, help="Short note about reuse constraints.")
    parser.add_argument(
        "--segment",
        action="append",
        default=[],
        help="Segment definition in the form name=start:end where start/end are seconds.",
    )
    parser.add_argument(
        "--crop",
        help="Optional normalized crop rect x0,y0,x1,y1 applied before pose extraction.",
    )
    parser.add_argument("--max-gap", type=int, default=8, help="Max interpolation gap in frames.")
    parser.add_argument(
        "--detection-threshold",
        type=float,
        default=0.35,
        help="MediaPipe detection/presence/tracking threshold.",
    )
    return parser.parse_args()


def parse_crop(raw: str | None) -> tuple[float, float, float, float] | None:
    if not raw:
        return None
    values = [float(value.strip()) for value in raw.split(",")]
    if len(values) != 4:
        raise ValueError("Crop must have four comma-separated numbers.")
    x0, y0, x1, y1 = values
    if not (0 <= x0 < x1 <= 1 and 0 <= y0 < y1 <= 1):
        raise ValueError("Crop values must be normalized and ordered.")
    return x0, y0, x1, y1


def distance(a: dict, b: dict) -> float:
    return math.sqrt(
        (a["x"] - b["x"]) ** 2 +
        (a["y"] - b["y"]) ** 2 +
        (a["z"] - b["z"]) ** 2
    )


def midpoint(a: dict, b: dict) -> dict:
    return {
        "x": (a["x"] + b["x"]) / 2,
        "y": (a["y"] + b["y"]) / 2,
        "z": (a["z"] + b["z"]) / 2,
        "visibility": (a["visibility"] + b["visibility"]) / 2,
    }


def build_landmarker(model_path: str, threshold: float):
    options = vision.PoseLandmarkerOptions(
        base_options=python.BaseOptions(
            model_asset_path=model_path,
            delegate=python.BaseOptions.Delegate.CPU,
        ),
        running_mode=vision.RunningMode.VIDEO,
        num_poses=1,
        min_pose_detection_confidence=threshold,
        min_pose_presence_confidence=threshold,
        min_tracking_confidence=threshold,
    )
    return vision.PoseLandmarker.create_from_options(options)


def build_segmentation_pose(threshold: float):
    if mp_pose is None:
        return None
    return mp_pose.Pose(
        static_image_mode=False,
        model_complexity=2,
        enable_segmentation=True,
        smooth_landmarks=True,
        smooth_segmentation=True,
        min_detection_confidence=threshold,
        min_tracking_confidence=threshold,
    )


def crop_frame(
    frame,
    crop: tuple[float, float, float, float] | None,
):
    if not crop:
        return frame
    height, width = frame.shape[:2]
    x0, y0, x1, y1 = crop
    return frame[
        int(height * y0):int(height * y1),
        int(width * x0):int(width * x1),
    ]


def extract_silhouette_contour(mask: np.ndarray | None) -> list[dict] | None:
    if mask is None:
        return None

    binary = (mask > 0.35).astype(np.uint8) * 255
    binary = cv2.medianBlur(binary, 5)
    kernel = np.ones((5, 5), np.uint8)
    binary = cv2.morphologyEx(binary, cv2.MORPH_CLOSE, kernel)
    binary = cv2.morphologyEx(binary, cv2.MORPH_OPEN, kernel)

    contours, _ = cv2.findContours(binary, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    if not contours:
        return None

    contour = max(contours, key=cv2.contourArea)
    if cv2.contourArea(contour) < binary.shape[0] * binary.shape[1] * 0.01:
        return None

    epsilon = 0.0035 * cv2.arcLength(contour, True)
    simplified = cv2.approxPolyDP(contour, epsilon, True)
    height, width = binary.shape[:2]

    points = []
    for point in simplified[:, 0, :]:
        points.append({
            "x": float(point[0]) / width,
            "y": float(point[1]) / height,
        })

    if len(points) > 80:
        step = math.ceil(len(points) / 80)
        points = points[::step]

    return points if len(points) >= 8 else None


def extract_frames(
    video_path: str,
    model_path: str,
    crop: tuple[float, float, float, float] | None,
    threshold: float,
) -> tuple[dict, list[dict]]:
    cap = cv2.VideoCapture(video_path)
    fps = cap.get(cv2.CAP_PROP_FPS) or 30.0
    width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH) or 0)
    height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT) or 0)
    frame_count = int(cap.get(cv2.CAP_PROP_FRAME_COUNT) or 0)

    frames: list[dict] = []
    with build_landmarker(model_path, threshold) as landmarker:
        segmentation_pose = build_segmentation_pose(threshold)
        frame_index = 0
        last_valid_landmarks: list[dict] | None = None
        last_valid_silhouette: list[dict] | None = None
        while True:
            ok, bgr = cap.read()
            if not ok:
                break

            cropped = crop_frame(bgr, crop)
            rgb = cv2.cvtColor(cropped, cv2.COLOR_BGR2RGB)
            timestamp_ms = int((frame_index / fps) * 1000)
            result = landmarker.detect_for_video(
                mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb),
                timestamp_ms,
            )
            silhouette = None
            if segmentation_pose is not None:
                segmentation_result = segmentation_pose.process(rgb)
                silhouette = extract_silhouette_contour(segmentation_result.segmentation_mask)

            if result.pose_landmarks:
                pose = result.pose_landmarks[0]
                landmarks = []
                for point in pose[:LANDMARK_COUNT]:
                    landmarks.append({
                        "x": float(point.x),
                        "y": float(point.y),
                        "z": float(point.z),
                        "visibility": float(point.visibility),
                    })
                last_valid_landmarks = landmarks
            elif last_valid_landmarks is not None:
                landmarks = [
                    {
                        "x": point["x"],
                        "y": point["y"],
                        "z": point["z"],
                        "visibility": point["visibility"] * 0.35,
                    }
                    for point in last_valid_landmarks
                ]
            else:
                landmarks = [
                    {"x": 0.0, "y": 0.0, "z": 0.0, "visibility": 0.0}
                    for _ in range(LANDMARK_COUNT)
                ]

            if silhouette is not None:
                last_valid_silhouette = silhouette
            elif last_valid_silhouette is not None:
                silhouette = [{"x": point["x"], "y": point["y"]} for point in last_valid_silhouette]

            frames.append({
                "frameIndex": frame_index,
                "timestampMs": timestamp_ms,
                "landmarks": landmarks,
                "silhouette": silhouette,
            })
            frame_index += 1

        if segmentation_pose is not None:
            segmentation_pose.close()

    cap.release()
    return {
        "fps": fps,
        "width": width,
        "height": height,
        "frameCount": frame_count or len(frames),
        "crop": crop,
    }, frames


def interpolate_visibility_gaps(frames: list[dict], max_gap: int) -> None:
    for landmark_index in range(LANDMARK_COUNT):
        valid_indices = [
            i for i, frame in enumerate(frames)
            if frame["landmarks"][landmark_index]["visibility"] > 0.08
        ]
        if not valid_indices:
            continue

        first_index = valid_indices[0]
        for i in range(first_index):
            frames[i]["landmarks"][landmark_index] = {
                **frames[first_index]["landmarks"][landmark_index],
                "visibility": frames[first_index]["landmarks"][landmark_index]["visibility"] * 0.4,
            }

        for start_index, end_index in zip(valid_indices, valid_indices[1:]):
            gap = end_index - start_index - 1
            if gap <= 0:
                continue
            start_point = frames[start_index]["landmarks"][landmark_index]
            end_point = frames[end_index]["landmarks"][landmark_index]
            if gap > max_gap:
                for i in range(start_index + 1, end_index):
                    frames[i]["landmarks"][landmark_index] = {
                        **start_point,
                        "visibility": start_point["visibility"] * 0.35,
                    }
                continue

            for offset in range(1, gap + 1):
                t = offset / (gap + 1)
                frames[start_index + offset]["landmarks"][landmark_index] = {
                    "x": start_point["x"] + (end_point["x"] - start_point["x"]) * t,
                    "y": start_point["y"] + (end_point["y"] - start_point["y"]) * t,
                    "z": start_point["z"] + (end_point["z"] - start_point["z"]) * t,
                    "visibility": start_point["visibility"] + (end_point["visibility"] - start_point["visibility"]) * t,
                }

        last_index = valid_indices[-1]
        for i in range(last_index + 1, len(frames)):
            frames[i]["landmarks"][landmark_index] = {
                **frames[last_index]["landmarks"][landmark_index],
                "visibility": frames[last_index]["landmarks"][landmark_index]["visibility"] * 0.4,
            }


def build_normalized_frames(frames: list[dict]) -> list[dict]:
    normalized_frames: list[dict] = []
    smoothed_scale: float | None = None

    for frame in frames:
        landmarks = frame["landmarks"]
        shoulder_mid = midpoint(landmarks[LEFT_SHOULDER], landmarks[RIGHT_SHOULDER])
        hip_mid = midpoint(landmarks[LEFT_HIP], landmarks[RIGHT_HIP])
        torso_scale = distance(shoulder_mid, hip_mid)

        if smoothed_scale is None:
            smoothed_scale = torso_scale if torso_scale > 1e-6 else 0.16
        elif torso_scale > 1e-6:
            smoothed_scale = smoothed_scale * 0.88 + torso_scale * 0.12

        scale = max(smoothed_scale or 0.16, 0.06)

        normalized_landmarks = []
        for point in landmarks:
            normalized_landmarks.append({
                "x": round((point["x"] - hip_mid["x"]) / scale, 5),
                "y": round((hip_mid["y"] - point["y"]) / scale, 5),
                "z": round(point["z"] / scale, 5),
                "visibility": round(clamp(point["visibility"], 0.0, 1.0), 5),
            })

        raw_silhouette = frame.get("silhouette") or []
        normalized_silhouette = [
            {
                "x": round((point["x"] - hip_mid["x"]) / scale, 5),
                "y": round((hip_mid["y"] - point["y"]) / scale, 5),
            }
            for point in raw_silhouette
        ]

        left_foot = normalized_landmarks[LEFT_FOOT]
        right_foot = normalized_landmarks[RIGHT_FOOT]
        left_heel = normalized_landmarks[LEFT_HEEL]
        right_heel = normalized_landmarks[RIGHT_HEEL]
        ground_y = min(left_foot["y"], right_foot["y"], left_heel["y"], right_heel["y"])
        core_visibility = (
            normalized_landmarks[LEFT_SHOULDER]["visibility"] +
            normalized_landmarks[RIGHT_SHOULDER]["visibility"] +
            normalized_landmarks[LEFT_HIP]["visibility"] +
            normalized_landmarks[RIGHT_HIP]["visibility"] +
            normalized_landmarks[LEFT_KNEE]["visibility"] +
            normalized_landmarks[RIGHT_KNEE]["visibility"] +
            normalized_landmarks[LEFT_ANKLE]["visibility"] +
            normalized_landmarks[RIGHT_ANKLE]["visibility"]
        ) / 8

        normalized_frames.append({
            "frameIndex": frame["frameIndex"],
            "timestampMs": frame["timestampMs"],
            "confidence": round(core_visibility, 5),
            "landmarks": normalized_landmarks,
            "silhouette": normalized_silhouette or None,
            "ballAnchor": {
                "x": round((left_foot["x"] + right_foot["x"]) / 2, 5),
                "y": round(ground_y + 0.22, 5),
                "z": round((left_foot["z"] + right_foot["z"]) / 2, 5),
            },
        })

    return normalized_frames


def parse_segments(raw_segments: list[str], fps: float) -> dict:
    segments: dict[str, dict] = {}
    for raw in raw_segments:
        name, values = raw.split("=", 1)
        start_raw, end_raw = values.split(":", 1)
        start_frame = max(0, int(float(start_raw) * fps))
        end_frame = max(start_frame + 1, int(float(end_raw) * fps))
        segments[name] = {
            "startFrame": start_frame,
            "endFrame": end_frame,
        }
    return segments


def clamp(value: float, min_value: float, max_value: float) -> float:
    return max(min_value, min(max_value, value))


def main() -> None:
    args = parse_args()
    crop = parse_crop(args.crop)
    video_meta, frames = extract_frames(
        args.input,
        args.model,
        crop,
        args.detection_threshold,
    )
    interpolate_visibility_gaps(frames, args.max_gap)
    normalized_frames = build_normalized_frames(frames)
    segments = parse_segments(args.segment, video_meta["fps"])

    asset = {
        "id": args.asset_id,
        "label": args.label,
        "fps": round(video_meta["fps"], 5),
        "width": video_meta["width"],
        "height": video_meta["height"],
        "frameCount": len(normalized_frames),
        "source": {
            "title": args.source_title,
            "pageUrl": args.source_page_url,
            "mediaUrl": args.source_media_url,
            "licenseName": args.license_name,
            "licenseUrl": args.license_url,
            "creator": args.creator,
            "notes": args.notes,
        },
        "segments": segments,
        "frames": normalized_frames,
    }

    output_path = Path(args.output)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(json.dumps(asset, indent=2))
    print(f"Wrote {output_path} with {len(normalized_frames)} normalized pose frames.")


if __name__ == "__main__":
    main()
