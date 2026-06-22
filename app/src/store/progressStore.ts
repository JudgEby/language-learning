import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface LevelProgress {
  completedStudy: string[];
  completedTests: string[];
}

interface ProgressState {
  levels: Record<string, LevelProgress>;
  markStudyComplete: (level: string, key: string) => void;
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
    { name: 'eng-progress' },
  ),
);
