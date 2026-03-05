export interface DemoCuePoint {
  timestampMs: number;
  label: string;
  note: string;
  kind: 'context' | 'detection' | 'result';
}

export const DEMO_CUE_INDEX: Record<string, DemoCuePoint[]> = {
  'sga-knee': [
    { timestampMs: 0, label: 'Opening Baseline', note: 'Normal gait, monitoring state.', kind: 'context' },
    { timestampMs: 40000, label: 'Awkward Landing', note: 'Right-leg landing event.', kind: 'context' },
    { timestampMs: 60000, label: 'Alert Triggered', note: 'State changes to ALERT.', kind: 'detection' },
    { timestampMs: 80000, label: 'Signal Confirmed', note: 'State changes to CONFIRMED.', kind: 'detection' },
    { timestampMs: 95000, label: 'Actionable Signal', note: 'Betting signal becomes actionable.', kind: 'result' },
    { timestampMs: 110000, label: 'Stable Compensation', note: 'Score stabilizes around 0.55-0.65.', kind: 'context' },
    { timestampMs: 130000, label: '47s Before Broadcast', note: 'Narrative highlight callout.', kind: 'result' },
    { timestampMs: 142000, label: 'Heads To Bench', note: 'Final story beat.', kind: 'result' },
  ],
  'jokic-fatigue': [
    { timestampMs: 0, label: 'Fatigue Setup', note: 'Back-to-back context.', kind: 'context' },
    { timestampMs: 40000, label: 'Drift Becomes Visible', note: 'Gradual posture and stride drift.', kind: 'detection' },
    { timestampMs: 60000, label: 'Alert Triggered', note: 'State changes to ALERT.', kind: 'detection' },
    { timestampMs: 80000, label: 'Signal Confirmed', note: 'Lower-confidence confirmation.', kind: 'detection' },
    { timestampMs: 95000, label: 'Actionable Signal', note: 'Over/under impact story beat.', kind: 'result' },
    { timestampMs: 110000, label: 'Fatigue Narrative', note: 'Shows non-injury utility of model.', kind: 'result' },
  ],
  'tatum-false-negative': [
    { timestampMs: 0, label: 'Opening Baseline', note: 'Normal running pattern.', kind: 'context' },
    { timestampMs: 25000, label: 'Hard Foul', note: 'Transient perturbation starts.', kind: 'context' },
    { timestampMs: 30000, label: 'Brief Alert', note: 'System enters ALERT.', kind: 'detection' },
    { timestampMs: 38000, label: 'Back To Monitoring', note: 'No confirmed/actionable transition.', kind: 'result' },
    { timestampMs: 48000, label: 'False Positive Avoided', note: 'Explicit narrative callout.', kind: 'result' },
    { timestampMs: 75000, label: 'Why Thresholds Matter', note: 'Closing explanation.', kind: 'result' },
  ],
};
