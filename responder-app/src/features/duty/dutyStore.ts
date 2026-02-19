import { create } from 'zustand';
import { DutyState, DutyConfig, DutyStore } from './types';
import { DUTY_CONFIGS } from './dutyConfig';
import { saveState, loadState } from '@features/queue/database';
import { withErrorHandling } from '@/utils/errorHandler';

const TAG = 'DutyStore';
const DUTY_STATE_KEY = 'duty_state';

const VALID_DUTY_STATES: DutyState[] = ['OFF_DUTY', 'ON_DUTY', 'ON_MISSION'];

function isValidDutyState(value: unknown): value is DutyState {
  return typeof value === 'string' && VALID_DUTY_STATES.includes(value as DutyState);
}

export const useDutyStore = create<DutyStore>((set, get) => ({
  dutyState: 'OFF_DUTY',

  setDutyState: (state: DutyState) => {
    set({ dutyState: state });
    // Persist to SQLite asynchronously
    withErrorHandling(
      TAG,
      () => saveState(DUTY_STATE_KEY, state),
      { context: { action: 'persist', state } }
    );
  },

  toggleDuty: () => {
    const current = get().dutyState;
    if (current === 'ON_MISSION') {
      console.warn(`[${TAG}] Cannot toggle duty while ON_MISSION`);
      return;
    }
    const next: DutyState = current === 'OFF_DUTY' ? 'ON_DUTY' : 'OFF_DUTY';
    get().setDutyState(next);
  },

  canToggle: (): boolean => {
    return get().dutyState !== 'ON_MISSION';
  },

  getConfig: (): DutyConfig => {
    return DUTY_CONFIGS[get().dutyState];
  },
}));

/**
 * Restore duty state from SQLite on app start
 */
export async function restoreDutyState(): Promise<DutyState> {
  const result = await withErrorHandling(
    TAG,
    async () => {
      const saved = await loadState<DutyState>(DUTY_STATE_KEY);

      if (saved && isValidDutyState(saved)) {
        console.log(`[${TAG}] Restored state:`, saved);
        useDutyStore.setState({ dutyState: saved });
        return saved;
      }

      return 'OFF_DUTY';
    },
    { fallback: 'OFF_DUTY' as DutyState, context: { action: 'restore' } }
  );

  return result ?? 'OFF_DUTY';
}
