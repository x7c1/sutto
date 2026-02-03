import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('gi://GLib', () => ({
  default: {
    DateTime: {
      new_now_local: vi.fn(() => ({
        format: vi.fn(() => '2026-01-15'),
      })),
    },
  },
}));

interface MockStorageData {
  trialDaysUsed: number;
  trialLastUsedDate: string;
  status: string;
}

interface MockStorage {
  _data: MockStorageData;
  getTrialDaysUsed: () => number;
  setTrialDaysUsed: (days: number) => void;
  getTrialLastUsedDate: () => string;
  setTrialLastUsedDate: (date: string) => void;
  getStatus: () => string;
  setStatus: (status: string) => void;
}

const createMockStorage = (): MockStorage => {
  const data: MockStorageData = {
    trialDaysUsed: 0,
    trialLastUsedDate: '',
    status: 'trial',
  };

  return {
    _data: data,
    getTrialDaysUsed: () => data.trialDaysUsed,
    setTrialDaysUsed: (days: number) => {
      data.trialDaysUsed = days;
    },
    getTrialLastUsedDate: () => data.trialLastUsedDate,
    setTrialLastUsedDate: (date: string) => {
      data.trialLastUsedDate = date;
    },
    getStatus: () => data.status,
    setStatus: (status: string) => {
      data.status = status;
    },
  };
};

describe('TrialManager', () => {
  let mockStorage: MockStorage;
  let TrialManager: typeof import('./trial-manager.js').TrialManager;

  beforeEach(async () => {
    mockStorage = createMockStorage();
    const module = await import('./trial-manager.js');
    TrialManager = module.TrialManager;
  });

  describe('getRemainingDays', () => {
    it('returns 30 when no days have been used', () => {
      const trialManager = new TrialManager(mockStorage as never);
      expect(trialManager.getRemainingDays()).toBe(30);
    });

    it('returns correct remaining days', () => {
      mockStorage._data.trialDaysUsed = 10;
      const trialManager = new TrialManager(mockStorage as never);
      expect(trialManager.getRemainingDays()).toBe(20);
    });

    it('returns 0 when all days have been used', () => {
      mockStorage._data.trialDaysUsed = 30;
      const trialManager = new TrialManager(mockStorage as never);
      expect(trialManager.getRemainingDays()).toBe(0);
    });

    it('returns 0 when more than 30 days used', () => {
      mockStorage._data.trialDaysUsed = 35;
      const trialManager = new TrialManager(mockStorage as never);
      expect(trialManager.getRemainingDays()).toBe(0);
    });
  });

  describe('isExpired', () => {
    it('returns false when days remain', () => {
      mockStorage._data.trialDaysUsed = 15;
      const trialManager = new TrialManager(mockStorage as never);
      expect(trialManager.isExpired()).toBe(false);
    });

    it('returns true when all days used', () => {
      mockStorage._data.trialDaysUsed = 30;
      const trialManager = new TrialManager(mockStorage as never);
      expect(trialManager.isExpired()).toBe(true);
    });
  });

  describe('recordUsageDay', () => {
    it('increments usage count on new day', () => {
      mockStorage._data.trialLastUsedDate = '2026-01-14';
      const trialManager = new TrialManager(mockStorage as never);

      const recorded = trialManager.recordUsageDay();

      expect(recorded).toBe(true);
      expect(mockStorage._data.trialDaysUsed).toBe(1);
      expect(mockStorage._data.trialLastUsedDate).toBe('2026-01-15');
    });

    it('does not increment if already used today', () => {
      mockStorage._data.trialLastUsedDate = '2026-01-15';
      mockStorage._data.trialDaysUsed = 5;
      const trialManager = new TrialManager(mockStorage as never);

      const recorded = trialManager.recordUsageDay();

      expect(recorded).toBe(false);
      expect(mockStorage._data.trialDaysUsed).toBe(5);
    });

    it('sets status to expired when reaching 30 days', () => {
      mockStorage._data.trialDaysUsed = 29;
      mockStorage._data.trialLastUsedDate = '2026-01-14';
      const trialManager = new TrialManager(mockStorage as never);

      trialManager.recordUsageDay();

      expect(mockStorage._data.trialDaysUsed).toBe(30);
      expect(mockStorage._data.status).toBe('expired');
    });
  });

  describe('getDaysUsed', () => {
    it('returns current usage count', () => {
      mockStorage._data.trialDaysUsed = 12;
      const trialManager = new TrialManager(mockStorage as never);
      expect(trialManager.getDaysUsed()).toBe(12);
    });
  });

  describe('reset', () => {
    it('resets all trial data', () => {
      mockStorage._data.trialDaysUsed = 15;
      mockStorage._data.trialLastUsedDate = '2026-01-15';
      mockStorage._data.status = 'expired';
      const trialManager = new TrialManager(mockStorage as never);

      trialManager.reset();

      expect(mockStorage._data.trialDaysUsed).toBe(0);
      expect(mockStorage._data.trialLastUsedDate).toBe('');
      expect(mockStorage._data.status).toBe('trial');
    });
  });
});
