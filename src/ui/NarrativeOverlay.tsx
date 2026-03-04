import { useEffect, useState } from 'react';
import type { NarrativeOverlay as NarrativeOverlayType } from '../types/index.ts';

interface NarrativeOverlayProps {
  overlay: NarrativeOverlayType | null;
}

export default function NarrativeOverlay({ overlay }: NarrativeOverlayProps) {
  const [visible, setVisible] = useState(false);
  const [currentText, setCurrentText] = useState('');
  const [currentType, setCurrentType] = useState<NarrativeOverlayType['type']>('context');

  useEffect(() => {
    if (overlay) {
      setCurrentText(overlay.text);
      setCurrentType(overlay.type);
      setVisible(true);
    } else {
      setVisible(false);
    }
  }, [overlay]);

  const typeStyles: Record<NarrativeOverlayType['type'], string> = {
    context: 'border-l-cyan',
    detection: 'border-l-amber',
    result: 'border-l-red',
  };

  const typeLabels: Record<NarrativeOverlayType['type'], string> = {
    context: 'CONTEXT',
    detection: 'DETECTION',
    result: 'RESULT',
  };

  return (
    <div
      className={`absolute bottom-4 left-4 right-4 transition-all duration-500 ${
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'
      }`}
    >
      <div
        className={`bg-bg/90 backdrop-blur-sm border-l-4 ${typeStyles[currentType]} rounded-r px-4 py-3`}
      >
        <span className="text-text-secondary font-mono text-xs tracking-widest uppercase block mb-1">
          {typeLabels[currentType]}
        </span>
        <p className="text-text-primary font-sans text-sm leading-relaxed">
          {currentText}
        </p>
      </div>
    </div>
  );
}
