import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { CARD_TYPES, type LexiconType } from '../lib/flashcards';
import { gradeCard, newCardProgress, type CardProgress, type FlashGrade } from '../lib/srs';

export type CardDirection = 'en-ru' | 'ru-en' | 'mixed';

export interface FlashcardsSettings {
  selectedLevels: string[];
  /**
   * Lesson filter as `{level}|{studyKey}` strings; null means all lessons of
   * the selected levels. Set when entering from a lesson page.
   */
  lessons: string[] | null;
  /** True in single-lesson mode: the scope picker is hidden. */
  fixedLesson: boolean;
  types: LexiconType[];
  direction: CardDirection;
  newPerDay: number;
  showExample: boolean;
}

interface FlashcardsState {
  /** False until the first visit selects the default scope (all levels). */
  initialized: boolean;
  settings: FlashcardsSettings;
  /** SRS state per card id. */
  progress: Record<string, CardProgress>;
  ensureInitialized: (allLevels: string[]) => void;
  setLevels: (levels: string[]) => void;
  enterLevel: (level: string) => void;
  enterLesson: (lessonKey: string) => void;
  clearLessonFilter: () => void;
  toggleType: (type: LexiconType) => void;
  setDirection: (direction: CardDirection) => void;
  setNewPerDay: (count: number) => void;
  setShowExample: (show: boolean) => void;
  grade: (cardId: string, grade: FlashGrade, now: number) => void;
  resetProgress: () => void;
}

const DEFAULT_SETTINGS: FlashcardsSettings = {
  selectedLevels: [],
  lessons: null,
  fixedLesson: false,
  types: [...CARD_TYPES],
  direction: 'en-ru',
  newPerDay: 20,
  showExample: true,
};

function patchSettings(
  set: (fn: (state: FlashcardsState) => Partial<FlashcardsState>) => void,
  patch: Partial<FlashcardsSettings>,
): void {
  set((state) => ({ settings: { ...state.settings, ...patch } }));
}

export const useFlashcardsStore = create<FlashcardsState>()(
  persist(
    (set) => ({
      initialized: false,
      settings: DEFAULT_SETTINGS,
      progress: {},

      ensureInitialized: (allLevels) =>
        set((state) => {
          if (state.initialized) return state;
          return {
            initialized: true,
            settings: { ...state.settings, selectedLevels: [...allLevels] },
          };
        }),

      setLevels: (levels) =>
        patchSettings(set, { selectedLevels: levels, lessons: null, fixedLesson: false }),

      enterLevel: (level) =>
        patchSettings(set, { selectedLevels: [level], lessons: null, fixedLesson: false }),

      enterLesson: (lessonKey) => {
        const level = lessonKey.split('|')[0];
        patchSettings(set, {
          selectedLevels: [level],
          lessons: [lessonKey],
          fixedLesson: true,
        });
      },

      clearLessonFilter: () => patchSettings(set, { lessons: null, fixedLesson: false }),

      toggleType: (type) =>
        set((state) => {
          const types = state.settings.types.includes(type)
            ? state.settings.types.filter((t) => t !== type)
            : [...state.settings.types, type];
          return { settings: { ...state.settings, types } };
        }),

      setDirection: (direction) => patchSettings(set, { direction }),

      setNewPerDay: (count) =>
        patchSettings(set, { newPerDay: Math.max(1, Math.min(100, Math.floor(count) || 20)) }),

      setShowExample: (show) => patchSettings(set, { showExample: show }),

      grade: (cardId, grade, now) =>
        set((state) => ({
          progress: {
            ...state.progress,
            [cardId]: gradeCard(state.progress[cardId] ?? newCardProgress(now), grade, now),
          },
        })),

      resetProgress: () => set({ progress: {} }),
    }),
    {
      name: 'language-learning-flashcards',
      version: 0,
    },
  ),
);
