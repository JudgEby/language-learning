import type {
  Lexicon,
  LevelSummary,
  Manifest,
  Rule,
  StudyOrderItem,
  StudyType,
  TestQuestion,
} from './types';
import { studyKey } from './types';

const CONTENT_BASE = '/content';

/**
 * In-memory request cache. Content is immutable for the lifetime of a page session
 * (the Vite content-sync plugin forces a full reload when it changes), so a resolved
 * payload can be shared by every caller — this is what collapses the N+1 fetches in
 * the list pages. Rejected entries are evicted so a retry can still succeed.
 */
const jsonCache = new Map<string, Promise<unknown>>();

async function fetchJson<T>(path: string): Promise<T> {
  const cached = jsonCache.get(path) as Promise<T> | undefined;
  if (cached) return cached;

  const pending = (async () => {
    const res = await fetch(path);
    if (!res.ok) {
      throw new Error(`Failed to load ${path}: ${res.status}`);
    }
    return res.json() as Promise<T>;
  })();

  jsonCache.set(path, pending);
  pending.catch(() => jsonCache.delete(path));
  return pending;
}

export async function listLevels(): Promise<LevelSummary[]> {
  let levels: string[];
  try {
    levels = await fetchJson<string[]>(`${CONTENT_BASE}/index.json`);
  } catch {
    return [];
  }

  const summaries = await Promise.all(
    levels.map(async (level): Promise<LevelSummary | null> => {
      try {
        const manifest = await loadManifest(level);
        return {
          level: manifest.level,
          title: manifest.title,
          lessonCount: new Set(manifest.studyOrder.map((item) => item.id)).size,
          testDayCount: manifest.testDays.length,
        };
      } catch {
        // skip broken level
        return null;
      }
    }),
  );

  return summaries.filter((s): s is LevelSummary => s !== null);
}

export async function loadManifest(level: string): Promise<Manifest> {
  return fetchJson<Manifest>(`${CONTENT_BASE}/${level}/manifest.json`);
}

export async function loadRule(level: string, lessonId: string): Promise<Rule> {
  const file = await findDataFile(level, 'rules', lessonId);
  return fetchJson<Rule>(`${CONTENT_BASE}/${level}/data/rules/${file}`);
}

export async function loadLexicon(
  level: string,
  type: Exclude<StudyType, 'rule'>,
  lessonId: string,
): Promise<Lexicon> {
  const file = await findDataFile(level, type, lessonId);
  return fetchJson<Lexicon>(`${CONTENT_BASE}/${level}/data/${type}/${file}`);
}

export async function loadTestDay(
  level: string,
  dayId: string,
): Promise<TestQuestion[]> {
  return fetchJson<TestQuestion[]>(`${CONTENT_BASE}/${level}/tests/${dayId}.json`);
}

export async function loadRulesForIds(
  level: string,
  ruleIds: string[],
): Promise<Rule[]> {
  const rules = await Promise.all(
    ruleIds.map((id) => loadRule(level, id).catch(() => null)),
  );
  return rules.filter((r): r is Rule => r !== null);
}

/** Study items (rules, vocabulary, phrases, idioms) for lessons referenced in test day questions. */
export function collectStudyItemsForTestDay(
  questions: TestQuestion[],
  studyOrder: StudyOrderItem[],
): StudyOrderItem[] {
  const lessonIds = new Set<string>();
  for (const q of questions) {
    for (const id of q.relatedRuleIds) {
      lessonIds.add(id);
    }
  }

  const seen = new Set<string>();
  const items: StudyOrderItem[] = [];
  for (const item of studyOrder) {
    if (!lessonIds.has(item.id)) continue;
    const key = studyKey(item.type, item.id);
    if (seen.has(key)) continue;
    seen.add(key);
    items.push(item);
  }
  return items;
}

export async function resolveStudyTitle(
  level: string,
  item: StudyOrderItem,
): Promise<string> {
  if (item.type === 'rule') {
    const rule = await loadRule(level, item.id);
    return `${rule.unit} — ${rule.title}`;
  }
  const lexicon = await loadLexicon(level, item.type, item.id);
  return lexicon.title;
}

/** Resolve a lessonId to its `{NN}-{slug}.json` filename via the category index. */
async function findDataFile(
  level: string,
  category: string,
  lessonId: string,
): Promise<string> {
  const files = await fetchJson<string[]>(
    `${CONTENT_BASE}/${level}/data/${category}/index.json`,
  ).catch(() => null);

  if (files) {
    const match =
      files.find((f) => f.endsWith(`${lessonId}.json`)) ??
      files.find((f) => f.includes(lessonId));
    if (match) return match;
  }
  throw new Error(`File not found for ${category}/${lessonId}`);
}
