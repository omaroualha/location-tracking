import { create } from 'zustand';
import { Mission, MissionStatus, MissionStore } from './types';
import { useDutyStore } from '@features/duty/dutyStore';
import { saveState, loadState, clearState } from '@features/queue/database';
import { withErrorHandling } from '@/utils/errorHandler';

const TAG = 'MissionStore';
const MISSION_STATE_KEY = 'mission_state';

interface PersistedMissionState {
  status: MissionStatus;
  currentMission: Mission | null;
  acceptedAt: number | null;
  arrivedAt: number | null;
}

function isRestorable(state: PersistedMissionState | null): state is PersistedMissionState {
  return (
    state !== null &&
    state.currentMission !== null &&
    (state.status === 'accepted' || state.status === 'arrived')
  );
}

/**
 * Persist mission state to SQLite
 * Only persists 'accepted' and 'arrived' states
 */
function persistMissionState(state: PersistedMissionState): void {
  if (state.status === 'accepted' || state.status === 'arrived') {
    withErrorHandling(
      TAG,
      () => saveState(MISSION_STATE_KEY, state),
      { context: { action: 'persist', status: state.status } }
    );
  } else {
    // Clear persisted state when mission ends
    withErrorHandling(
      TAG,
      () => clearState(MISSION_STATE_KEY),
      { context: { action: 'clear' } }
    );
  }
}

export const useMissionStore = create<MissionStore>((set, get) => ({
  status: 'idle',
  currentMission: null,
  pendingMission: null,
  acceptedAt: null,
  arrivedAt: null,

  receiveMission: (mission: Mission) => {
    const currentStatus = get().status;
    if (currentStatus !== 'idle') {
      console.warn(`[${TAG}] Cannot receive mission while not idle`);
      return;
    }

    set({
      status: 'pending',
      pendingMission: mission,
    });
    // Don't persist pending state - it will timeout if app closes
  },

  acceptMission: () => {
    const { status, pendingMission } = get();
    if (status !== 'pending' || !pendingMission) {
      console.warn(`[${TAG}] Cannot accept: no pending mission`);
      return;
    }

    useDutyStore.getState().setDutyState('ON_MISSION');

    const newState: PersistedMissionState = {
      status: 'accepted',
      currentMission: pendingMission,
      acceptedAt: Date.now(),
      arrivedAt: null,
    };

    set({
      ...newState,
      pendingMission: null,
    });
    persistMissionState(newState);
  },

  declineMission: () => {
    const { status } = get();
    if (status !== 'pending') {
      console.warn(`[${TAG}] Cannot decline: no pending mission`);
      return;
    }

    set({
      status: 'idle',
      pendingMission: null,
    });
  },

  timeoutMission: () => {
    const { status } = get();
    if (status !== 'pending') {
      return;
    }

    set({
      status: 'idle',
      pendingMission: null,
    });
  },

  markArrived: () => {
    const { status, currentMission, acceptedAt } = get();
    if (status !== 'accepted') {
      console.warn(`[${TAG}] Cannot mark arrived: mission not accepted`);
      return;
    }

    const arrivedAt = Date.now();
    const newState: PersistedMissionState = {
      status: 'arrived',
      currentMission,
      acceptedAt,
      arrivedAt,
    };

    set({ status: 'arrived', arrivedAt });
    persistMissionState(newState);
  },

  completeMission: () => {
    const { status } = get();
    if (status !== 'arrived' && status !== 'accepted') {
      console.warn(`[${TAG}] Cannot complete: invalid state`);
      return;
    }

    useDutyStore.getState().setDutyState('ON_DUTY');

    const newState: PersistedMissionState = {
      status: 'idle',
      currentMission: null,
      acceptedAt: null,
      arrivedAt: null,
    };

    set({
      ...newState,
      pendingMission: null,
    });
    persistMissionState(newState);
  },

  reset: () => {
    useDutyStore.getState().setDutyState('ON_DUTY');

    const newState: PersistedMissionState = {
      status: 'idle',
      currentMission: null,
      acceptedAt: null,
      arrivedAt: null,
    };

    set({
      ...newState,
      pendingMission: null,
    });
    persistMissionState(newState);
  },
}));

/**
 * Restore mission state from SQLite on app start
 */
export async function restoreMissionState(): Promise<MissionStatus> {
  const result = await withErrorHandling(
    TAG,
    async () => {
      const saved = await loadState<PersistedMissionState>(MISSION_STATE_KEY);

      if (isRestorable(saved) && saved.currentMission) {
        console.log(`[${TAG}] Restored state:`, saved.status, 'mission:', saved.currentMission.id);
        useMissionStore.setState({
          status: saved.status,
          currentMission: saved.currentMission,
          pendingMission: null,
          acceptedAt: saved.acceptedAt,
          arrivedAt: saved.arrivedAt,
        });
        return saved.status;
      }

      return 'idle' as MissionStatus;
    },
    { fallback: 'idle' as MissionStatus, context: { action: 'restore' } }
  );

  return result ?? 'idle';
}
