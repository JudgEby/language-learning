import { loadLexicon, loadManifest } from './loadContent';
import { isDue, type CardProgress } from './srs';
import { studyKey, type StudyType } from './types';

export type LexiconType = Exclude<StudyType, 'rule'>;

export const CARD_TYPES: LexiconType[] = ['vocabulary', 'phrases', 'idioms'];

export interface Flashcard {
  /** Stable id: `{level}|{type}:{lessonId}#{itemIndex}`. */
  id: string;
  level: string;
  type: LexiconType;
  lessonId: string;
  lessonTitle: string;
  /** Foreign text (term / phrase / idiom). */
  frontEn: string;
  /** Translation (language of instruction). */
  backRu: string;
  example: string;
  keyword?: string;
  mnemonic?: string;
}

export interface DeckScope {
  levels: string[];
  /** Lesson filter as `studyKey` strings; null means all lessons of the levels. */
  lessons: string[] | null;
  types: LexiconType[];
}

function cardText(item: { term?: string; phrase?: string; idiom?: string }): string {
  return item.term ?? item.phrase ?? item.idiom ?? '';
}

/**
 * Build the card deck for a scope, in textbook order (manifest studyOrder,
 * then item order within each lesson). One lexicon file is fetched per
 * lesson; the loadContent request cache dedupes repeated calls.
 */
export async function buildDeck(scope: DeckScope): Promise<Flashcard[]> {
  const lessonFilter = scope.lessons ? new Set(scope.lessons) : null;
  const cards: Flashcard[] = [];

  for (const level of scope.levels) {
    const manifest = await loadManifest(level);
    const seen = new Set<string>();

    for (const entry of manifest.studyOrder) {
      if (entry.type === 'rule' || !scope.types.includes(entry.type as LexiconType)) continue;
      const type = entry.type as LexiconType;
      const key = studyKey(entry.type, entry.id);
      if (lessonFilter && !lessonFilter.has(`${level}|${key}`)) continue;
      if (seen.has(key)) continue;
      seen.add(key);

      const lexicon = await loadLexicon(level, type, entry.id).catch(() => null);
      if (!lexicon) continue;

      lexicon.items.forEach((item, index) => {
        const text = cardText(item);
        if (!text || !item.translation) return;
        cards.push({
          id: `${level}|${key}#${index}`,
          level,
          type,
          lessonId: entry.id,
          lessonTitle: lexicon.title,
          frontEn: text,
          backRu: item.translation,
          example: item.example,
          keyword: item.keyword,
          mnemonic: item.mnemonic,
        });
      });
    }
  }

  return cards;
}

export interface SessionQueue {
  due: Flashcard[];
  fresh: Flashcard[];
}

/**
 * Split a deck into due cards (oldest first) and fresh cards (deck order),
 * capped at `newPerDay`. Cards already introduced but not yet due are
 * skipped — they return on their due day.
 */
export function buildSessionQueue(
  deck: Flashcard[],
  progress: Record<string, CardProgress>,
  newPerDay: number,
  now: number,
): SessionQueue {
  const due: Array<{ card: Flashcard; due: number }> = [];
  const fresh: Flashcard[] = [];

  for (const card of deck) {
    const state = progress[card.id];
    if (!state) {
      if (fresh.length < newPerDay) fresh.push(card);
      continue;
    }
    if (isDue(state, now)) due.push({ card, due: state.due });
  }

  due.sort((a, b) => a.due - b.due);
  return { due: due.map((d) => d.card), fresh };
}
