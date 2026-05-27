export type DeskStatus = 'free' | 'occupied' | 'reserved';

export interface DeskState {
  id: string;
  status: DeskStatus;
  updatedAt: string;
}
