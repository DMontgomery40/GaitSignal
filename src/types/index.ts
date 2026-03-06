// ============================================================
// GaitSignal — Shared Type Definitions
// ALL workers import from here. Never redefine these elsewhere.
// ============================================================

// --- Geometry ---

export interface Point3D {
  x: number;
  y: number;
  z: number;
}

export interface Keypoint extends Point3D {
  visibility: number;
  name: string;
}

export interface PoseDisplayLandmark extends Point3D {
  visibility: number;
}

export interface PoseDisplayContourPoint {
  x: number;
  y: number;
}

// --- Pose (Worker 1) ---

export interface PoseResult {
  landmarks: Keypoint[];
  worldLandmarks: Keypoint[];
  timestampMs: number;
  inferenceTimeMs: number;
}

/** Lower-body + torso keypoints after smoothing and confidence filtering */
export interface FilteredKeypoints {
  timestampMs: number;
  frameIndex: number;
  leftHip: Point3D;
  rightHip: Point3D;
  leftKnee: Point3D;
  rightKnee: Point3D;
  leftAnkle: Point3D;
  rightAnkle: Point3D;
  leftHeel: Point3D;
  rightHeel: Point3D;
  leftFootIndex: Point3D;
  rightFootIndex: Point3D;
  leftShoulder: Point3D;
  rightShoulder: Point3D;
  /** Confidence score 0-1 for overall pose quality this frame */
  confidence: number;
}

export interface KeypointFrame {
  timestampMs: number;
  frameIndex: number;
  keypoints: FilteredKeypoints;
}

export interface ProcessedFrame {
  timestampMs: number;
  frameIndex: number;
  keypoints: FilteredKeypoints;
  rawPose: PoseResult | null;
}

// --- Gait Metrics (Worker 2) ---

export interface JointAngles {
  leftKneeFlexion: number;
  rightKneeFlexion: number;
  leftHipFlexion: number;
  rightHipFlexion: number;
  leftAnkleDorsiflexion: number;
  rightAnkleDorsiflexion: number;
  trunkLean: number;
  lateralTrunkTilt: number;
}

export interface StrideData {
  side: 'left' | 'right';
  startTimestampMs: number;
  endTimestampMs: number;
  strideLength: number;
  strideTimeMs: number;
  groundContactTimeMs: number;
  flightTimeMs: number;
  peakKneeFlexion: number;
  peakHipFlexion: number;
  peakAnkleDorsiflexion: number;
}

export interface StrideUpdate {
  newStride: StrideData;
  strideCount: number;
  currentCadence: number;
}

export interface SymmetryReport {
  strideLengthAsymmetry: number;
  strideTimeAsymmetry: number;
  kneeFlexionAsymmetry: number;
  hipFlexionAsymmetry: number;
  ankleAsymmetry: number;
  groundContactAsymmetry: number;
}

/**
 * Per-frame output of gait analysis.
 * The featureVector is a 20-element array — the contract between gait/ and anomaly/.
 *
 * Feature vector order:
 *  0: Left knee flexion peak (deg)
 *  1: Right knee flexion peak (deg)
 *  2: Knee flexion asymmetry (%)
 *  3: Left hip flexion peak (deg)
 *  4: Right hip flexion peak (deg)
 *  5: Hip flexion asymmetry (%)
 *  6: Left ankle dorsiflexion peak (deg)
 *  7: Right ankle dorsiflexion peak (deg)
 *  8: Ankle asymmetry (%)
 *  9: Stride length left (normalized)
 * 10: Stride length right (normalized)
 * 11: Stride length asymmetry (%)
 * 12: Stride time left (ms)
 * 13: Stride time right (ms)
 * 14: Stride time asymmetry (%)
 * 15: Ground contact time left (ms)
 * 16: Ground contact time right (ms)
 * 17: Ground contact asymmetry (%)
 * 18: Trunk lean (deg)
 * 19: Lateral trunk tilt (deg)
 */
export interface GaitMetricsSnapshot {
  timestampMs: number;
  frameIndex: number;
  jointAngles: JointAngles;
  currentStride: StrideUpdate | null;
  symmetry: SymmetryReport;
  overallGaitScore: number;
  symmetryScore: number;
  fluidityScore: number;
  featureVector: number[];
}

// --- Anomaly Detection (Worker 3) ---

export interface FeatureContribution {
  featureName: string;
  featureIndex: number;
  currentValue: number;
  baselineValue: number;
  zScore: number;
  rateOfChange: number;
  contribution: number;
}

export type SeverityLevel = 'normal' | 'elevated' | 'significant' | 'critical';

export interface AnomalyResult {
  timestampMs: number;
  compositeScore: number;
  severity: SeverityLevel;
  confidence: number;
  rateOfChangeScore: number;
  baselineDeviationScore: number;
  shortTermDeviationScore: number;
  contributingFeatures: FeatureContribution[];
}

export interface DeviationReport {
  featureDeviations: number[];
  zScores: number[];
  mahalanobisDistance: number;
  overallDeviation: number;
}

// --- Player Profiles (Worker 5 creates, Worker 3 consumes) ---

export interface PlayerInfo {
  name: string;
  team: string;
  position: string;
  height: string;
  weight: string;
  jerseyNumber: number;
}

export interface PlayerProfileJSON {
  player: PlayerInfo;
  baselineMean: number[];
  baselineStdDev: number[];
  gamesInBaseline: number;
  lastBaselineUpdate: string;
  modelVersion: string;
  modelParams: string;
}

// --- Demo (Worker 5) ---

export type AnomalyType = 'knee_compensation' | 'ankle_guarding' | 'hip_compensation' | 'fatigue_drift';

export interface AnomalyConfig {
  type: AnomalyType;
  onsetTimestampMs: number;
  rampDurationMs: number;
  peakSeverity: number;
  affectedSide: 'left' | 'right' | 'bilateral';
  affectedFeatures: number[];
}

export interface NarrativeOverlay {
  timestampMs: number;
  durationMs: number;
  text: string;
  type: 'context' | 'detection' | 'result';
}

export type PoseSegmentId = 'steadyCarry' | 'hardPlant' | 'guardedRecovery';

export interface ScenarioPoseCue {
  startTimestampMs: number;
  segmentId: PoseSegmentId;
  playbackRate?: number;
  strideScale?: number;
  leanBias?: number;
}

export interface PoseClipSource {
  title: string;
  pageUrl: string;
  mediaUrl: string;
  licenseName: string;
  licenseUrl: string;
  creator: string;
  notes: string;
}

export interface PoseClipSegment {
  startFrame: number;
  endFrame: number;
  notes?: string;
}

export interface PoseDisplayFrame {
  timestampMs: number;
  frameIndex: number;
  confidence: number;
  landmarks: PoseDisplayLandmark[];
  silhouette: PoseDisplayContourPoint[] | null;
  segmentId: PoseSegmentId;
  segmentTimeMs: number;
  ballAnchor: Point3D | null;
}

export interface PoseClipAsset {
  id: string;
  label: string;
  fps: number;
  width: number;
  height: number;
  frameCount: number;
  source: PoseClipSource;
  segments: Record<PoseSegmentId, PoseClipSegment>;
  frames: PoseDisplayFrame[];
}

export interface PitchCoordinate {
  x: number;
  y: number;
}

export type PossessionState = 'player_team' | 'opponent' | 'contested';
export type BallAccessType = 'far' | 'support' | 'involved' | 'on_ball';
export type PitchZoneType =
  | 'defensive-third'
  | 'middle-third'
  | 'left-wing'
  | 'right-wing'
  | 'half-space'
  | 'final-third'
  | 'box-edge';
export type PhaseOfPlayType =
  | 'defensive-recovery'
  | 'transition-attack'
  | 'settled-attack'
  | 'high-press'
  | 'counterpress'
  | 'ball-carry';
export type RoleDemandType = 'low' | 'moderate' | 'high' | 'extreme';
export type MarketUrgencyType = 'watch' | 'active' | 'immediate';

export interface FootballContextKeyframe {
  startTimestampMs: number;
  playerPosition: PitchCoordinate;
  ballPosition: PitchCoordinate;
  possession: PossessionState;
  ballAccess: BallAccessType;
  pitchZone: PitchZoneType;
  phaseOfPlay: PhaseOfPlayType;
  roleDemand: RoleDemandType;
  sourceConfidence: number;
  marketUrgency: MarketUrgencyType;
  marketFamily: string[];
  feedLabel: string;
  note: string;
}

export interface FootballContext {
  timestampMs: number;
  playerPosition: PitchCoordinate;
  ballPosition: PitchCoordinate;
  possession: PossessionState;
  ballAccess: BallAccessType;
  ballDistanceMeters: number;
  pitchZone: PitchZoneType;
  phaseOfPlay: PhaseOfPlayType;
  roleDemand: RoleDemandType;
  sourceConfidence: number;
  marketUrgency: MarketUrgencyType;
  marketFamily: string[];
  feedLabel: string;
  note: string;
}

export type EdgeStateType = 'monitoring' | 'warming' | 'confirmed' | 'priceable';

export interface PricingEdge {
  edgeScore: number;
  edgeState: EdgeStateType;
  stateEnteredAt: number;
  qualifiedStrides: number;
  movementSurprise: number;
  contextGate: number;
  sourceConfidence: number;
  marketFamily: string[];
  timeToMarketImpact: number;
  rationale: string[];
}

export type EdgeEventType =
  | 'edge_opened'
  | 'edge_confirmed'
  | 'edge_priceable'
  | 'edge_cleared';

export interface EdgeEvent {
  timestampMs: number;
  type: EdgeEventType;
  edgeScore: number;
  movementSurprise: number;
  contextGate: number;
  sourceConfidence: number;
  marketFamily: string[];
  timeToMarketImpact: number;
  topFeatures: FeatureContribution[];
}

export interface ScenarioInfo {
  id: string;
  name: string;
  description: string;
  playerProfile: PlayerProfileJSON;
  durationMs: number;
  anomalyConfig: AnomalyConfig | null;
  narrativeOverlays: NarrativeOverlay[];
  contextTimeline: FootballContextKeyframe[];
  poseTimeline: ScenarioPoseCue[];
}

export interface DemoFrame {
  timestampMs: number;
  frameIndex: number;
  keypoints: FilteredKeypoints;
  displayPose: PoseDisplayFrame;
  gaitMetrics: GaitMetricsSnapshot;
  anomalyResult: AnomalyResult;
  footballContext: FootballContext;
  pricingEdge: PricingEdge;
  narrativeOverlay: NarrativeOverlay | null;
}

// --- Feature vector index constants ---

export const FEATURE_NAMES: readonly string[] = [
  'L Knee Load',
  'R Knee Load',
  'Knee Load Asym.',
  'L Hip Drive',
  'R Hip Drive',
  'Hip Drive Asym.',
  'L Ankle Spring',
  'R Ankle Spring',
  'Ankle Spring Asym.',
  'Stride Length L',
  'Stride Length R',
  'Stride Compression',
  'Stride Time L',
  'Stride Time R',
  'Cadence Asym.',
  'Ground Contact L',
  'Ground Contact R',
  'Ground Contact Asym.',
  'Forward Lean',
  'Lateral Tilt',
] as const;

export const FEATURE_COUNT = 20;
