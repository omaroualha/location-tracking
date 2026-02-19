export interface IncidentLocation {
  latitude: number;
  longitude: number;
  address: string;
}

export type MissionPriority = 'critical' | 'high' | 'medium' | 'low';

export interface Mission {
  id: string;
  type: string;
  priority: MissionPriority;
  location: IncidentLocation;
  description: string;
  createdAt: number;
}

export type MissionStatus = 'idle' | 'pending' | 'accepted' | 'arrived';

export interface MissionStore {
  status: MissionStatus;
  currentMission: Mission | null;
  pendingMission: Mission | null;
  acceptedAt: number | null;
  arrivedAt: number | null;

  receiveMission: (mission: Mission) => void;
  acceptMission: () => void;
  declineMission: () => void;
  timeoutMission: () => void;
  markArrived: () => void;
  completeMission: () => void;
  reset: () => void;
}

export const ALERT_TIMEOUT_SECONDS = 30;
export const ARRIVAL_THRESHOLD_METERS = 50;
