export interface DemoCuePoint {
  timestampMs: number;
  label: string;
  note: string;
  kind: 'context' | 'detection' | 'result';
}

export const DEMO_CUE_INDEX: Record<string, DemoCuePoint[]> = {
  'saka-touchline-guarding': [
    { timestampMs: 0, label: 'Opening Baseline', note: 'Normal movement, monitoring state.', kind: 'context' },
    { timestampMs: 40000, label: 'Recovery Sprint', note: 'Touchline deceleration event.', kind: 'context' },
    { timestampMs: 60000, label: 'Alert Triggered', note: 'State changes to ALERT.', kind: 'detection' },
    { timestampMs: 80000, label: 'Signal Confirmed', note: 'State changes to CONFIRMED.', kind: 'detection' },
    { timestampMs: 95000, label: 'Actionable Signal', note: 'Live football markets become actionable.', kind: 'result' },
    { timestampMs: 110000, label: 'Stable Guarding', note: 'Score stabilizes around 0.56-0.66.', kind: 'context' },
    { timestampMs: 130000, label: '47s Before Commentary', note: 'Narrative highlight callout.', kind: 'result' },
    { timestampMs: 142000, label: 'Role Adjustment', note: 'Final tactical story beat.', kind: 'result' },
  ],
  'pedri-pressing-drift': [
    { timestampMs: 0, label: 'Pressing Setup', note: 'Late-match context.', kind: 'context' },
    { timestampMs: 40000, label: 'Drift Becomes Visible', note: 'Gradual workload drift.', kind: 'detection' },
    { timestampMs: 60000, label: 'Alert Triggered', note: 'State changes to ALERT.', kind: 'detection' },
    { timestampMs: 80000, label: 'Signal Confirmed', note: 'Lower-confidence confirmation.', kind: 'detection' },
    { timestampMs: 95000, label: 'Actionable Signal', note: 'Next-goal impact story beat.', kind: 'result' },
    { timestampMs: 110000, label: 'Fatigue Narrative', note: 'Shows non-injury utility of model.', kind: 'result' },
  ],
  'musiala-contact-reset': [
    { timestampMs: 0, label: 'Opening Baseline', note: 'Normal carrying pattern.', kind: 'context' },
    { timestampMs: 25000, label: 'Heavy Contact', note: 'Transient perturbation starts.', kind: 'context' },
    { timestampMs: 30000, label: 'Brief Alert', note: 'System enters ALERT.', kind: 'detection' },
    { timestampMs: 38000, label: 'Back To Monitoring', note: 'No confirmed/actionable transition.', kind: 'result' },
    { timestampMs: 48000, label: 'False Positive Avoided', note: 'Explicit narrative callout.', kind: 'result' },
    { timestampMs: 75000, label: 'Why Thresholds Matter', note: 'Closing explanation.', kind: 'result' },
  ],
};
