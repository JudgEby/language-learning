export type StudyType = 'rule' | 'vocabulary' | 'phrases' | 'idioms';

export interface StudyOrderItem {
  type: StudyType;
  id: string;
}

export interface Manifest {
  level: string;
  title: string;
  source: { sb?: string; wb?: string };
  studyOrder: StudyOrderItem[];
  testDays: string[];
}

export interface Rule {
  id: string;
  order: number;
  unit: string;
  title: string;
  contentMd: string;
  examples: string[];
}

export interface LexiconItem {
  term?: string;
  phrase?: string;
  idiom?: string;
  translation: string;
  example: string;
}

export interface Lexicon {
  lessonId: string;
  title: string;
  items: LexiconItem[];
}

export interface TestQuestion {
  id: string;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  relatedRuleIds: string[];
}

export interface LevelSummary {
  level: string;
  title: string;
  hasStudy: boolean;
  hasTests: boolean;
}

export function studyKey(type: StudyType, id: string): string {
  return `${type}:${id}`;
}

export function parseStudyKey(key: string): { type: StudyType; id: string } {
  const [type, ...rest] = key.split(':');
  return { type: type as StudyType, id: rest.join(':') };
}

export const STUDY_TYPE_LABELS: Record<StudyType, string> = {
  rule: 'Правило',
  vocabulary: 'Новые слова',
  phrases: 'Фразы',
  idioms: 'Идиомы',
};
