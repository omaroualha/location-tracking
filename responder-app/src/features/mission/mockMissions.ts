import { Mission, MissionPriority } from './types';
import { useMissionStore } from './missionStore';

// Default location: Düsseldorf, Germany (Altstadt)
export const DEFAULT_LOCATION = {
  latitude: 51.2277,
  longitude: 6.7735,
};

// Simulated responder starting position in Düsseldorf
export const SIMULATOR_LOCATION = {
  latitude: 51.2254,
  longitude: 6.7763,
};

const MOCK_MISSIONS: Omit<Mission, 'id' | 'createdAt'>[] = [
  {
    type: 'Medical Emergency',
    priority: 'critical',
    location: {
      latitude: 51.2330,
      longitude: 6.7726,
      address: 'Königsallee 60, 40212 Düsseldorf',
    },
    description: 'Person unconscious, not breathing. CPR in progress by bystander.',
  },
  {
    type: 'Fire',
    priority: 'high',
    location: {
      latitude: 51.2275,
      longitude: 6.7816,
      address: 'Rheinuferpromenade, 40213 Düsseldorf',
    },
    description: 'Small fire reported in commercial building. Evacuation underway.',
  },
  {
    type: 'Traffic Accident',
    priority: 'high',
    location: {
      latitude: 51.2205,
      longitude: 6.7932,
      address: 'Oberkasseler Brücke, 40221 Düsseldorf',
    },
    description: 'Vehicle collision with possible injuries. Two cars involved.',
  },
  {
    type: 'Welfare Check',
    priority: 'medium',
    location: {
      latitude: 51.2312,
      longitude: 6.7875,
      address: 'Carlsplatz 1, 40213 Düsseldorf',
    },
    description: 'Elderly person not responding to calls. Last seen 2 days ago.',
  },
  {
    type: 'Assist Police',
    priority: 'low',
    location: {
      latitude: 51.2243,
      longitude: 6.7652,
      address: 'Hofgarten, 40213 Düsseldorf',
    },
    description: 'Police request medical standby for crowd control event.',
  },
];

function generateMissionId(): string {
  return `mission-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

export function getRandomMockMission(): Mission {
  const template = MOCK_MISSIONS[Math.floor(Math.random() * MOCK_MISSIONS.length)];
  return {
    ...template,
    id: generateMissionId(),
    createdAt: Date.now(),
  };
}

export function triggerMockMission(priority?: MissionPriority): void {
  let template: Omit<Mission, 'id' | 'createdAt'>;

  if (priority) {
    const filtered = MOCK_MISSIONS.filter((m) => m.priority === priority);
    template = filtered.length > 0
      ? filtered[Math.floor(Math.random() * filtered.length)]
      : MOCK_MISSIONS[0];
  } else {
    template = MOCK_MISSIONS[Math.floor(Math.random() * MOCK_MISSIONS.length)];
  }

  const mission: Mission = {
    ...template,
    id: generateMissionId(),
    createdAt: Date.now(),
  };

  useMissionStore.getState().receiveMission(mission);
}

export function createMissionNearLocation(
  latitude: number,
  longitude: number,
  offsetMeters: number = 500
): Mission {
  const metersPerDegree = 111320;
  const latOffset = (offsetMeters / metersPerDegree) * (Math.random() > 0.5 ? 1 : -1);
  const lngOffset =
    (offsetMeters / (metersPerDegree * Math.cos(latitude * (Math.PI / 180)))) *
    (Math.random() > 0.5 ? 1 : -1);

  const template = MOCK_MISSIONS[Math.floor(Math.random() * MOCK_MISSIONS.length)];

  return {
    ...template,
    id: generateMissionId(),
    createdAt: Date.now(),
    location: {
      latitude: latitude + latOffset,
      longitude: longitude + lngOffset,
      address: 'Near your current location',
    },
  };
}
