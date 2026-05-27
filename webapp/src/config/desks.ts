export type Zone = 'quiet' | 'collaborative' | 'open';
export type Feature = 'window' | 'standing' | 'dual-monitor' | 'near-kitchen' | 'near-printer';

export interface PodConfig {
  id: string;
  name: string;
  zone: Zone;
}

export interface DeskConfig {
  id: string;
  label: string;
  zone: Zone;
  floor: number;
  features: Feature[];
  pod: string;
  physical?: true;
}

export const PODS: PodConfig[] = [
  { id: 'alpha',   name: 'Alpha',   zone: 'quiet' },
  { id: 'bravo',   name: 'Bravo',   zone: 'collaborative' },
  { id: 'charlie', name: 'Charlie', zone: 'collaborative' },
  { id: 'delta',   name: 'Delta',   zone: 'open' },
  { id: 'echo',    name: 'Echo',    zone: 'quiet' },
  { id: 'foxtrot', name: 'Foxtrot', zone: 'open' },
  { id: 'golf',    name: 'Golf',    zone: 'collaborative' },
  { id: 'hotel',   name: 'Hotel',   zone: 'open' },
];

export const DESKS: DeskConfig[] = [
  // Alpha — quiet, 4 desks
  { id: '1',  label: 'A1', zone: 'quiet', floor: 1, pod: 'alpha', features: ['window', 'standing'], physical: true },
  { id: '2',  label: 'A2', zone: 'quiet', floor: 1, pod: 'alpha', features: ['window'] },
  { id: '3',  label: 'A3', zone: 'quiet', floor: 1, pod: 'alpha', features: [] },
  { id: '4',  label: 'A4', zone: 'quiet', floor: 1, pod: 'alpha', features: ['standing'] },

  // Bravo — collaborative, 5 desks
  { id: '5',  label: 'B1', zone: 'collaborative', floor: 1, pod: 'bravo', features: ['dual-monitor'] },
  { id: '6',  label: 'B2', zone: 'collaborative', floor: 1, pod: 'bravo', features: ['dual-monitor'] },
  { id: '7',  label: 'B3', zone: 'collaborative', floor: 1, pod: 'bravo', features: ['dual-monitor', 'near-printer'] },
  { id: '8',  label: 'B4', zone: 'collaborative', floor: 1, pod: 'bravo', features: ['near-printer'] },
  { id: '9',  label: 'B5', zone: 'collaborative', floor: 1, pod: 'bravo', features: [] },

  // Charlie — collaborative, 6 desks
  { id: '10', label: 'C1', zone: 'collaborative', floor: 1, pod: 'charlie', features: ['dual-monitor'] },
  { id: '11', label: 'C2', zone: 'collaborative', floor: 1, pod: 'charlie', features: ['dual-monitor'] },
  { id: '12', label: 'C3', zone: 'collaborative', floor: 1, pod: 'charlie', features: ['dual-monitor'] },
  { id: '13', label: 'C4', zone: 'collaborative', floor: 1, pod: 'charlie', features: ['near-printer'] },
  { id: '14', label: 'C5', zone: 'collaborative', floor: 1, pod: 'charlie', features: ['near-printer'] },
  { id: '15', label: 'C6', zone: 'collaborative', floor: 1, pod: 'charlie', features: [] },

  // Delta — open, 5 desks
  { id: '16', label: 'D1', zone: 'open', floor: 1, pod: 'delta', features: ['near-kitchen'] },
  { id: '17', label: 'D2', zone: 'open', floor: 1, pod: 'delta', features: ['near-kitchen'] },
  { id: '18', label: 'D3', zone: 'open', floor: 1, pod: 'delta', features: ['near-kitchen', 'standing'] },
  { id: '19', label: 'D4', zone: 'open', floor: 1, pod: 'delta', features: ['standing'] },
  { id: '20', label: 'D5', zone: 'open', floor: 1, pod: 'delta', features: [] },

  // Echo — quiet, 4 desks
  { id: '21', label: 'E1', zone: 'quiet', floor: 1, pod: 'echo', features: ['window'] },
  { id: '22', label: 'E2', zone: 'quiet', floor: 1, pod: 'echo', features: ['window'] },
  { id: '23', label: 'E3', zone: 'quiet', floor: 1, pod: 'echo', features: ['standing'] },
  { id: '24', label: 'E4', zone: 'quiet', floor: 1, pod: 'echo', features: [] },

  // Foxtrot — open, 6 desks
  { id: '25', label: 'F1', zone: 'open', floor: 1, pod: 'foxtrot', features: ['near-kitchen'] },
  { id: '26', label: 'F2', zone: 'open', floor: 1, pod: 'foxtrot', features: ['near-kitchen'] },
  { id: '27', label: 'F3', zone: 'open', floor: 1, pod: 'foxtrot', features: ['near-kitchen'] },
  { id: '28', label: 'F4', zone: 'open', floor: 1, pod: 'foxtrot', features: ['standing'] },
  { id: '29', label: 'F5', zone: 'open', floor: 1, pod: 'foxtrot', features: ['standing'] },
  { id: '30', label: 'F6', zone: 'open', floor: 1, pod: 'foxtrot', features: [] },

  // Golf — collaborative, 5 desks
  { id: '31', label: 'G1', zone: 'collaborative', floor: 1, pod: 'golf', features: ['dual-monitor'] },
  { id: '32', label: 'G2', zone: 'collaborative', floor: 1, pod: 'golf', features: ['dual-monitor'] },
  { id: '33', label: 'G3', zone: 'collaborative', floor: 1, pod: 'golf', features: ['dual-monitor', 'near-printer'] },
  { id: '34', label: 'G4', zone: 'collaborative', floor: 1, pod: 'golf', features: ['near-printer'] },
  { id: '35', label: 'G5', zone: 'collaborative', floor: 1, pod: 'golf', features: [] },

  // Hotel — open, 5 desks
  { id: '36', label: 'H1', zone: 'open', floor: 1, pod: 'hotel', features: ['near-kitchen'] },
  { id: '37', label: 'H2', zone: 'open', floor: 1, pod: 'hotel', features: ['near-kitchen'] },
  { id: '38', label: 'H3', zone: 'open', floor: 1, pod: 'hotel', features: ['standing'] },
  { id: '39', label: 'H4', zone: 'open', floor: 1, pod: 'hotel', features: ['near-kitchen', 'standing'] },
  { id: '40', label: 'H5', zone: 'open', floor: 1, pod: 'hotel', features: [] },
];

export const DESK_BY_ID = Object.fromEntries(DESKS.map(d => [d.id, d]));
