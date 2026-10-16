import { buildDeck, CARD_TYPES, type Flashcard } from './flashcards';

/**
 * Neutral word-game engine modelling the studied loop of the reference game
 * (reconstructed from its package: `WordAddingPanel` → `GuessGamePanel`
 * ("FIND THE TRANSLATION") → `PairGame` board → `InputGame` spelling,
 * ordered per round by `RoundManager` from a game-type list):
 *
 * - new words are learned in blocks of 4 (intro cards with the association);
 * - right after a block, each word is quizzed: the word is shown and the
 *   learner picks its translation;
 * - then the block is played as matching pairs;
 * - then each word is spelled from shuffled letters;
 * - then the next block starts.
 *
 * Pure logic — no React, no speech calls. The page layer renders rounds and
 * speaks English text through the existing `SpeakButton` / `lib/speech.ts`.
 *
 * Decks reuse flashcard ids (`{level}|{type}:{lessonId}#{itemIndex}`) so cards
 * stay stable, but game progress lives in its own `progressStore` field and
 * never mixes with SRS state. There are deliberately no lives/fail states:
 * progress means *answered*, like tests.
 */

export const BLOCK_SIZE = 4;
/** A fail checkpoint covers two deal blocks (8 cards). */
export const CHECKPOINT_EVERY_BLOCKS = 2;

export interface MatchPair {
  cardId: string;
  en: string;
  ru: string;
}

export interface IntroRound {
  kind: 'intro';
  card: Flashcard;
}

export interface MatchRound {
  kind: 'match';
  pairs: MatchPair[];
}

export interface ChoiceRound {
  kind: 'choice';
  card: Flashcard;
  options: string[];
  correctIndex: number;
}

export interface SpellingRound {
  kind: 'spelling';
  card: Flashcard;
  /** Shuffled letters the learner assembles (lowercase a-z only). */
  letters: string[];
  /** Normalized answer: lowercase a-z only. */
  target: string;
}

export type GameRound = IntroRound | MatchRound | ChoiceRound | SpellingRound;

export interface GameSession {
  level: string;
  cards: Flashcard[];
  rounds: GameRound[];
  /** Round indexes where each 8-card checkpoint starts (two deal blocks). */
  checkpoints: number[];
}

/** FNV-1a hash — deterministic session seed from level/lesson ids. */
export function hashSeed(text: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

/** Deterministic PRNG so a level always deals the same session order. */
export function mulberry32(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function seededShuffle<T>(items: T[], rand: () => number): T[] {
  const shuffled = [...items];
  for (let i = shuffled.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rand() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

function pickDistractors(
  pool: string[],
  correct: string,
  count: number,
  rand: () => number,
): string[] {
  const unique = [...new Set(pool.filter((text) => text !== correct))];
  return seededShuffle(unique, rand).slice(0, count);
}

/** Letters usable for spelling: lowercase a-z only (spaces/punctuation skipped). */
export function normalizeSpelling(text: string): string {
  return text.toLowerCase().replace(/[^a-z]/g, '');
}

/**
 * Load all playable cards for a level in textbook order (strict,
 * no skipping). `lesson` is a flashcards-style filter (`{level}|{studyKey}`)
 * for a fixed single-lesson deck, or null for the whole level.
 */
export async function takeGameCards(
  level: string,
  lesson: string | null,
): Promise<Flashcard[]> {
  const deck = await buildDeck({
    levels: [level],
    lessons: lesson ? [lesson] : null,
    types: [...CARD_TYPES],
  });
  return deck;
}

/**
 * Build the full round list: per block of 4 cards — intros, then
 * word→translation choices, then a matching board, then spelling.
 */
export function buildGameSession(
  level: string,
  cards: Flashcard[],
  seedText: string,
): GameSession {
  const rand = mulberry32(hashSeed(seedText));
  const rounds: GameRound[] = [];
  const checkpoints: number[] = [];
  const ruPool = cards.map((card) => card.backRu);

  for (let start = 0, block = 0; start < cards.length; start += BLOCK_SIZE, block += 1) {
    const blockCards = cards.slice(start, start + BLOCK_SIZE);
    if (block % CHECKPOINT_EVERY_BLOCKS === 0) checkpoints.push(rounds.length);

    for (const card of blockCards) {
      rounds.push({ kind: 'intro', card });
    }

    for (const card of blockCards) {
      const options = seededShuffle(
        [card.backRu, ...pickDistractors(ruPool, card.backRu, 3, rand)],
        rand,
      );
      rounds.push({
        kind: 'choice',
        card,
        options,
        correctIndex: options.indexOf(card.backRu),
      });
    }

    if (blockCards.length >= 2) {
      rounds.push({
        kind: 'match',
        pairs: blockCards.map((card) => ({
          cardId: card.id,
          en: card.frontEn,
          ru: card.backRu,
        })),
      });
    }

    for (const card of blockCards) {
      const target = normalizeSpelling(card.frontEn);
      if (!target) continue;
      rounds.push({
        kind: 'spelling',
        card,
        letters: seededShuffle(target.split(''), rand),
        target,
      });
    }
  }

  return { level, cards, rounds, checkpoints };
}
