import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface LevelProgress {
  completedStudy: string[];
  completedTests: string[];
}

interface ProgressState {
  levels: Record<string, LevelProgress>;
  markStudyComplete: (level: string, key: string) => void;
  markStudyCompleteBulk: (level: string, keys: string[]) => void;
  toggleStudyComplete: (level: string, key: string) => void;
  clearStudyComplete: (level: string, keys: string[]) => void;
  markTestComplete: (level: string, testId: string) => void;
  isStudyComplete: (level: string, key: string) => boolean;
  isTestComplete: (level: string, testId: string) => boolean;
}

function getLevel(state: ProgressState, level: string): LevelProgress {
  return state.levels[level] ?? { completedStudy: [], completedTests: [] };
}

export const useProgressStore = create<ProgressState>()(
  persist(
    (set, get) => ({
      levels: {},

      markStudyComplete: (level, key) =>
        set((state) => {
          const current = getLevel(state, level);
          if (current.completedStudy.includes(key)) return state;
          return {
            levels: {
              ...state.levels,
              [level]: {
                ...current,
                completedStudy: [...current.completedStudy, key],
              },
            },
          };
        }),

      markStudyCompleteBulk: (level, keys) =>
        set((state) => {
          const current = getLevel(state, level);
          const merged = [...new Set([...current.completedStudy, ...keys])];
          if (merged.length === current.completedStudy.length) return state;
          return {
            levels: {
              ...state.levels,
              [level]: {
                ...current,
                completedStudy: merged,
              },
            },
          };
        }),

      toggleStudyComplete: (level, key) =>
        set((state) => {
          const current = getLevel(state, level);
          const isComplete = current.completedStudy.includes(key);
          return {
            levels: {
              ...state.levels,
              [level]: {
                ...current,
                completedStudy: isComplete
                  ? current.completedStudy.filter((k) => k !== key)
                  : [...current.completedStudy, key],
              },
            },
          };
        }),

      clearStudyComplete: (level, keys) =>
        set((state) => {
          const current = getLevel(state, level);
          const keysSet = new Set(keys);
          const completedStudy = current.completedStudy.filter((k) => !keysSet.has(k));
          if (completedStudy.length === current.completedStudy.length) return state;
          return {
            levels: {
              ...state.levels,
              [level]: {
                ...current,
                completedStudy,
              },
            },
          };
        }),

      markTestComplete: (level, testId) =>
        set((state) => {
          const current = getLevel(state, level);
          if (current.completedTests.includes(testId)) return state;
          return {
            levels: {
              ...state.levels,
              [level]: {
                ...current,
                completedTests: [...current.completedTests, testId],
              },
            },
          };
        }),

      isStudyComplete: (level, key) =>
        getLevel(get(), level).completedStudy.includes(key),

      isTestComplete: (level, testId) =>
        getLevel(get(), level).completedTests.includes(testId),
    }),
    { name: 'language-learning-progress' },
  ),
);

const EMPTY_KEYS: string[] = [];

export function useCompletedStudy(level: string): string[] {
  return useProgressStore((s) => s.levels[level]?.completedStudy ?? EMPTY_KEYS);
}

export function useCompletedTests(level: string): string[] {
  return useProgressStore((s) => s.levels[level]?.completedTests ?? EMPTY_KEYS);
}
