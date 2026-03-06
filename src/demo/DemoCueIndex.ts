export interface DemoCuePoint {
  timestampMs: number;
  label: string;
  note: string;
  kind: 'context' | 'detection' | 'result';
}

export const DEMO_CUE_INDEX: Record<string, DemoCuePoint[]> = {
  'saka-touchline-guarding': [
    { timestampMs: 0, label: 'Recovery Baseline', note: 'Out-of-possession baseline with no live edge.', kind: 'context' },
    { timestampMs: 40000, label: 'Sprint Logged', note: 'Movement surprise rises after the recovery run.', kind: 'detection' },
    { timestampMs: 76000, label: 'Turnover Window', note: 'Context gate strengthens as Saka becomes the outlet.', kind: 'context' },
    { timestampMs: 92000, label: 'Priceable Edge', note: 'Movement and football context align.', kind: 'result' },
    { timestampMs: 126000, label: 'Role Cools', note: 'Role adjustment compresses the edge.', kind: 'result' },
  ],
  'pedri-pressing-drift': [
    { timestampMs: 0, label: 'Press Setup', note: 'High-demand role from the opening frame.', kind: 'context' },
    { timestampMs: 36000, label: 'Drift Appears', note: 'Fatigue drift is visible but not yet priceable.', kind: 'detection' },
    { timestampMs: 65000, label: 'Role Holds', note: 'Context gate stays high because Pedri keeps counterpressing.', kind: 'context' },
    { timestampMs: 90000, label: 'Edge Confirmed', note: 'Sustained decay reaches confirmed state.', kind: 'result' },
    { timestampMs: 108000, label: 'Priceable Edge', note: 'Role demand stays high long enough to matter.', kind: 'result' },
  ],
  'musiala-contact-reset': [
    { timestampMs: 0, label: 'Hot Context', note: 'On-ball carry at the box edge.', kind: 'context' },
    { timestampMs: 26000, label: 'Contact Noise', note: 'Transient spike with lower source confidence.', kind: 'detection' },
    { timestampMs: 42000, label: 'Edge Closed', note: 'Signal clears before the workflow can confirm.', kind: 'result' },
    { timestampMs: 62000, label: 'No Overreaction', note: 'Pricing engine stays disciplined.', kind: 'result' },
  ],
};
