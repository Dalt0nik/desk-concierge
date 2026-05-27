export type Zone = 'quiet' | 'collaborative' | 'open';
export type Feature = 'window' | 'standing' | 'dual-monitor' | 'near-kitchen' | 'near-printer';

export interface DeskConfig {
  id: string;
  label: string;
  zone: Zone;
  floor: number;
  features: Feature[];
  physical?: true;
}

export const DESKS: DeskConfig[] = [
  // Quiet zone — window side, low-traffic
  { id: '1',  label: 'A1', zone: 'quiet',         floor: 1, features: ['window', 'standing'], physical: true },
  { id: '2',  label: 'A2', zone: 'quiet',         floor: 1, features: ['window'] },
  { id: '3',  label: 'A3', zone: 'quiet',         floor: 1, features: [] },

  // Collaborative zone — dual monitors, printer nearby
  { id: '4',  label: 'B1', zone: 'collaborative', floor: 1, features: ['dual-monitor'] },
  { id: '5',  label: 'B2', zone: 'collaborative', floor: 1, features: ['dual-monitor'] },
  { id: '6',  label: 'B3', zone: 'collaborative', floor: 1, features: ['dual-monitor', 'near-printer'] },
  { id: '7',  label: 'B4', zone: 'collaborative', floor: 1, features: ['near-printer'] },

  // Open zone — kitchen side, standing option
  { id: '8',  label: 'C1', zone: 'open',          floor: 1, features: ['near-kitchen'] },
  { id: '9',  label: 'C2', zone: 'open',          floor: 1, features: ['near-kitchen', 'standing'] },
  { id: '10', label: 'C3', zone: 'open',          floor: 1, features: [] },
];

export const DESK_BY_ID = Object.fromEntries(DESKS.map(d => [d.id, d]));
