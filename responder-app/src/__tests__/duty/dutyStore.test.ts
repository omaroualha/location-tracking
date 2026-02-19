import { useDutyStore } from '@features/duty/dutyStore';
import { DUTY_CONFIGS } from '@features/duty/dutyConfig';

// Mock the database functions
jest.mock('@features/queue/database', () => ({
  saveState: jest.fn(() => Promise.resolve()),
  loadState: jest.fn(() => Promise.resolve(null)),
}));

// Mock error handler
jest.mock('@/utils/errorHandler', () => ({
  withErrorHandling: jest.fn((tag, fn, opts) => fn().catch(() => opts?.fallback)),
}));

describe('dutyStore', () => {
  beforeEach(() => {
    // Reset store to initial state
    useDutyStore.setState({
      dutyState: 'OFF_DUTY',
    });
  });

  describe('initial state', () => {
    it('starts as OFF_DUTY', () => {
      expect(useDutyStore.getState().dutyState).toBe('OFF_DUTY');
    });
  });

  describe('toggleDuty', () => {
    it('toggles from OFF_DUTY to ON_DUTY', () => {
      useDutyStore.getState().toggleDuty();

      expect(useDutyStore.getState().dutyState).toBe('ON_DUTY');
    });

    it('toggles from ON_DUTY to OFF_DUTY', () => {
      useDutyStore.setState({ dutyState: 'ON_DUTY' });

      useDutyStore.getState().toggleDuty();

      expect(useDutyStore.getState().dutyState).toBe('OFF_DUTY');
    });

    it('does not toggle when ON_MISSION', () => {
      useDutyStore.setState({ dutyState: 'ON_MISSION' });

      useDutyStore.getState().toggleDuty();

      // Should stay ON_MISSION (can't toggle during mission)
      expect(useDutyStore.getState().dutyState).toBe('ON_MISSION');
    });
  });

  describe('setDutyState', () => {
    it('sets duty state directly', () => {
      useDutyStore.getState().setDutyState('ON_MISSION');

      expect(useDutyStore.getState().dutyState).toBe('ON_MISSION');
    });

    it('can set to any valid state', () => {
      useDutyStore.getState().setDutyState('ON_DUTY');
      expect(useDutyStore.getState().dutyState).toBe('ON_DUTY');

      useDutyStore.getState().setDutyState('OFF_DUTY');
      expect(useDutyStore.getState().dutyState).toBe('OFF_DUTY');

      useDutyStore.getState().setDutyState('ON_MISSION');
      expect(useDutyStore.getState().dutyState).toBe('ON_MISSION');
    });
  });

  describe('canToggle', () => {
    it('returns true when OFF_DUTY', () => {
      useDutyStore.setState({ dutyState: 'OFF_DUTY' });

      expect(useDutyStore.getState().canToggle()).toBe(true);
    });

    it('returns true when ON_DUTY', () => {
      useDutyStore.setState({ dutyState: 'ON_DUTY' });

      expect(useDutyStore.getState().canToggle()).toBe(true);
    });

    it('returns false when ON_MISSION', () => {
      useDutyStore.setState({ dutyState: 'ON_MISSION' });

      expect(useDutyStore.getState().canToggle()).toBe(false);
    });
  });

  describe('getConfig', () => {
    it('returns correct config for OFF_DUTY', () => {
      useDutyStore.setState({ dutyState: 'OFF_DUTY' });

      const config = useDutyStore.getState().getConfig();

      expect(config).toEqual(DUTY_CONFIGS.OFF_DUTY);
      expect(config.intervalMs).toBeNull();
    });

    it('returns correct config for ON_DUTY', () => {
      useDutyStore.setState({ dutyState: 'ON_DUTY' });

      const config = useDutyStore.getState().getConfig();

      expect(config).toEqual(DUTY_CONFIGS.ON_DUTY);
      expect(config.intervalMs).not.toBeNull();
    });

    it('returns correct config for ON_MISSION', () => {
      useDutyStore.setState({ dutyState: 'ON_MISSION' });

      const config = useDutyStore.getState().getConfig();

      expect(config).toEqual(DUTY_CONFIGS.ON_MISSION);
      expect(config.accuracy).toBe('high');
    });
  });
});
