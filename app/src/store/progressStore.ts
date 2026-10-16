import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface LevelProgress {
  completedStudy: string[];
  completedTests: string[];
  /** Game card ids answered in the association game (answered, not scored). */
  completedGame: string[];
}

interface ProgressState {
  levels: Record<string, LevelProgress>;
  markStudyComplete: (level: string, key: string) => void;
  markStudyCompleteBulk: (level: string, keys: string[]) => void;
  toggleStudyComplete: (level: string, key: string) => void;
  clearStudyComplete: (level: string, keys: string[]) => void;
  markTestComplete: (level: string, testId: string) => void;
  resetTests: (level: string) => void;
  markGameComplete: (level: string, cardId: string) => void;
  markGameCompleteBulk: (level: string, cardIds: string[]) => void;
  resetGame: (level: string) => void;
  isStudyComplete: (level: string, key: string) => boolean;
  isTestComplete: (level: string, testId: string) => boolean;
  isGameComplete: (level: string, cardId: string) => boolean;
}

function getLevel(state: ProgressState, level: string): LevelProgress {
  return (
    state.levels[level] ?? { completedStudy: [], completedTests: [], completedGame: [] }
  );
}

/**
 * Level ids that were renamed after this progress format shipped. Progress is keyed
 * by the level id, so a folder rename orphans the entry unless it is moved here.
 * Keep it append-only: never edit a shipped entry, add the next id to the same target.
 */
const LEVEL_RENAMES: ReadonlyArray<readonly [from: string, to: string]> = [['A2plus', 'A2+']];

const PROGRESS_VERSION = 2;

/** Merge a moved level entry into its target, if the target already has progress. */
function mergeProgress(from: LevelProgress, to: LevelProgress | undefined): LevelProgress {
  if (!to) return from;
  return {
    completedStudy: [...new Set([...to.completedStudy, ...from.completedStudy])],
    completedTests: [...new Set([...to.completedTests, ...from.completedTests])],
    completedGame: [...new Set([...(to.completedGame ?? []), ...(from.completedGame ?? [])])],
  };
}

function migrateProgress(persisted: unknown, version: number): unknown {
  const state = persisted as ProgressState | undefined;
  if (!state?.levels || typeof state.levels !== 'object') return persisted;

  const levels = { ...state.levels };
  let changed = false;

  if (version < 1) {
    for (const [from, to] of LEVEL_RENAMES) {
      const source = levels[from];
      if (!source) continue;
      levels[to] = mergeProgress(source, levels[to]);
      delete levels[from];
      changed = true;
    }
  }

  if (version < 2) {
    for (const [level, entry] of Object.entries(levels)) {
      if (!Array.isArray((entry as LevelProgress).completedGame)) {
        levels[level] = { ...(entry as LevelProgress), completedGame: [] };
        changed = true;
      }
    }
  }

  return changed ? { ...state, levels } : persisted;
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

      resetTests: (level) =>
        set((state) => {
          const current = getLevel(state, level);
          if (current.completedTests.length === 0) return state;
          return {
            levels: {
              ...state.levels,
              [level]: { ...current, completedTests: [] },
            },
          };
        }),

      markGameComplete: (level, cardId) =>
        set((state) => {
          const current = getLevel(state, level);
          const completedGame = current.completedGame ?? [];
          if (completedGame.includes(cardId)) return state;
          return {
            levels: {
              ...state.levels,
              [level]: { ...current, completedGame: [...completedGame, cardId] },
            },
          };
        }),

      markGameCompleteBulk: (level, cardIds) =>
        set((state) => {
          const current = getLevel(state, level);
          const merged = [...new Set([...(current.completedGame ?? []), ...cardIds])];
          if (merged.length === (current.completedGame ?? []).length) return state;
          return {
            levels: {
              ...state.levels,
              [level]: { ...current, completedGame: merged },
            },
          };
        }),

      resetGame: (level) =>
        set((state) => {
          const current = getLevel(state, level);
          if ((current.completedGame ?? []).length === 0) return state;
          return {
            levels: {
              ...state.levels,
              [level]: { ...current, completedGame: [] },
            },
          };
        }),

      isStudyComplete: (level, key) =>
        getLevel(get(), level).completedStudy.includes(key),

      isTestComplete: (level, testId) =>
        getLevel(get(), level).completedTests.includes(testId),

      isGameComplete: (level, cardId) =>
        (getLevel(get(), level).completedGame ?? []).includes(cardId),
    }),
    {
      name: 'language-learning-progress',
      version: PROGRESS_VERSION,
      migrate: migrateProgress,
    },
  ),
);

const EMPTY_KEYS: string[] = [];

export function useCompletedStudy(level: string): string[] {
  return useProgressStore((s) => s.levels[level]?.completedStudy ?? EMPTY_KEYS);
}

export function useCompletedTests(level: string): string[] {
  return useProgressStore((s) => s.levels[level]?.completedTests ?? EMPTY_KEYS);
}

export function useCompletedGame(level: string): string[] {
  return useProgressStore((s) => s.levels[level]?.completedGame ?? EMPTY_KEYS);
}
