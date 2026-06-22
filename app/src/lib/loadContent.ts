import type {
  Lexicon,
  LevelSummary,
  Manifest,
  Rule,
  StudyOrderItem,
  StudyType,
  TestQuestion,
} from './types';

const CONTENT_BASE = '/content';

async function fetchJson<T>(path: string): Promise<T> {
  const res = await fetch(path);
  if (!res.ok) {
    throw new Error(`Failed to load ${path}: ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export async function listLevels(): Promise<LevelSummary[]> {
  const indexRes = await fetch(`${CONTENT_BASE}/index.json`);
  if (!indexRes.ok) {
    return [];
  }
  const levels: string[] = await indexRes.json();
  const summaries: LevelSummary[] = [];

  for (const level of levels) {
    try {
      const manifest = await loadManifest(level);
      summaries.push({
        level: manifest.level,
        title: manifest.title,
        hasStudy: manifest.studyOrder.length > 0,
        hasTests: manifest.testDays.length > 0,
      });
    } catch {
      // skip broken level
    }
  }

  return summaries;
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

async function findDataFile(
  level: string,
  category: string,
  lessonId: string,
): Promise<string> {
  const indexRes = await fetch(
    `${CONTENT_BASE}/${level}/data/${category}/index.json`,
  );
  if (indexRes.ok) {
    const files: string[] = await indexRes.json();
    const match =
      files.find((f) => f.endsWith(`${lessonId}.json`)) ??
      files.find((f) => f.includes(lessonId));
    if (match) return match;
  }
  throw new Error(`File not found for ${category}/${lessonId}`);
}
