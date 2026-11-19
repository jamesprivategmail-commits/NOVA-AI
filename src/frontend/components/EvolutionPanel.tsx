import React from 'react';
import { EvolutionCentre } from './EvolutionCentre';

export function EvolutionPanel({ onClose }: { onClose?: () => void }) {
  return <EvolutionCentre onClose={onClose} />;
}
