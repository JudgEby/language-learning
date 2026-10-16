import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface GameRunSnapshot {
  /** Scope key: `{level}|{studyKey}` for a lesson deck, or the level id. */
  scope: string;
  level: string;
  lesson: string | null;
  roundIndex: number;
  hearts: number;
  heartsLost: number;
  /** Hearts lost when the current checkpoint span started. */
  spanStartLost: number;
  /** Checkpoints finished without losing a single heart. */
  perfectCount: number;
  answered: number;
  totalRounds: number;
  updatedAt: number;
}

export type GameRunDraft = Omit<GameRunSnapshot, 'updatedAt'>;

interface GameSessionState {
  runs: Record<string, GameRunSnapshot>;
  saveRun: (draft: GameRunDraft) => void;
  clearRun: (scope: string) => void;
}

function runKey(level: string, lesson: string | null): string {
  return lesson ?? level;
}

export function gameRunKey(level: string, lesson: string | null): string {
  return runKey(level, lesson);
}

export const useGameSessionStore = create<GameSessionState>()(
  persist(
    (set) => ({
      runs: {},

      saveRun: (draft) =>
        set((state) => ({
          runs: {
            ...state.runs,
            [draft.scope]: { ...draft, updatedAt: Date.now() },
          },
        })),

      clearRun: (scope) =>
        set((state) => {
          if (!state.runs[scope]) return state;
          const runs = { ...state.runs };
          delete runs[scope];
          return { runs };
        }),
    }),
    {
      name: 'language-learning-game',
      version: 0,
    },
  ),
);

export function useGameRun(level: string, lesson: string | null): GameRunSnapshot | null {
  return useGameSessionStore((s) => s.runs[runKey(level, lesson)] ?? null);
}
