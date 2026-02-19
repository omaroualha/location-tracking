export type DutyState = 'OFF_DUTY' | 'ON_DUTY' | 'ON_MISSION';

export interface DutyConfig {
  intervalMs: number | null;
  distanceMeters: number | null;
  accuracy: 'balanced' | 'high';
}

export interface DutyStore {
  dutyState: DutyState;
  setDutyState: (state: DutyState) => void;
  toggleDuty: () => void;
  canToggle: () => boolean;
  getConfig: () => DutyConfig;
}
