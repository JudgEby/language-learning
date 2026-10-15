/**
 * SM-2 spaced repetition (SuperMemo) for flashcards.
 *
 * Pure functions, no dependencies: given the previous card progress and a
 * grade from the 4-button UI, compute the next review state. All dates are
 * day-granular (midnight local time) so a card reviewed at any hour falls
 * due on the same calendar day.
 */

export type FlashGrade = 'again' | 'hard' | 'good' | 'easy';

/**
 * Classic SM-2 quality mapping. `again` (complete blackout) resets the
 * repetition chain; `hard`/`good`/`easy` are passing recalls of increasing
 * ease. 2-button mode would collapse to again/good; the 3-button middle
 * ("with difficulty") equals hard.
 */
const QUALITY: Record<FlashGrade, number> = {
  again: 0,
  hard: 3,
  good: 4,
  easy: 5,
};

export const MIN_EASINESS = 1.3;
const INITIAL_EASINESS = 2.5;
const DAY_MS = 86_400_000;

export interface CardProgress {
  /** SM-2 easiness factor. Starts at 2.5, never drops below 1.3. */
  easiness: number;
  /** Current interval in whole days. */
  interval: number;
  /** Consecutive successful recalls (reset to 0 on `again`). */
  repetitions: number;
  /** Epoch ms of the day start when the card becomes due. */
  due: number;
  /** How many times the card was forgotten. */
  lapses: number;
  /** Epoch ms of the day the card first entered review. */
  introduced: number;
}

/** Midnight (local time) of the day containing `ts`. */
export function startOfDay(ts: number): string {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Epoch ms of midnight (local time) for a `YYYY-MM-DD` day key. */
export function dayStart(dayKey: string): number {
  const [y, m, d] = dayKey.split('-').map(Number);
  return new Date(y, m - 1, d).getTime();
}

/** Fresh progress for a card entering review today. */
export function newCardProgress(now: number): CardProgress {
  const today = dayStart(startOfDay(now));
  return {
    easiness: INITIAL_EASINESS,
    interval: 0,
    repetitions: 0,
    due: today,
    lapses: 0,
    introduced: today,
  };
}

function nextEasiness(easiness: number, quality: number): number {
  const next = easiness + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
  return Math.max(MIN_EASINESS, Math.round(next * 100) / 100);
}

/** Apply a grade and return the next review state (does not mutate `prev`). */
export function gradeCard(prev: CardProgress, grade: FlashGrade, now: number): CardProgress {
  const quality = QUALITY[grade];
  const today = dayStart(startOfDay(now));
  const easiness = nextEasiness(prev.easiness, quality);

  if (quality < 3) {
    return {
      easiness,
      interval: 1,
      repetitions: 0,
      due: today + DAY_MS,
      lapses: prev.lapses + 1,
      introduced: prev.introduced,
    };
  }

  const repetitions = prev.repetitions + 1;
  const interval =
    repetitions === 1 ? 1 : repetitions === 2 ? 6 : Math.max(1, Math.round(prev.interval * easiness));

  return {
    easiness,
    interval,
    repetitions,
    due: today + interval * DAY_MS,
    lapses: prev.lapses,
    introduced: prev.introduced,
  };
}

/** A card is due when its due-day is today or earlier. */
export function isDue(card: CardProgress, now: number): boolean {
  return card.due <= dayStart(startOfDay(now));
}
