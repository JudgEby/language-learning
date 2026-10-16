import { useEffect, useMemo, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { ConfirmModal } from '../components/ConfirmModal';
import { PageHeader, Toggle } from '../components/Layout';
import { FlashcardView } from '../components/FlashcardView';
import {
  buildDeck,
  buildSessionQueue,
  type DeckScope,
  type Flashcard,
} from '../lib/flashcards';
import { cancelSpeech } from '../lib/speech';
import { listLevels, loadManifest, resolveStudyTitle } from '../lib/loadContent';
import { cards, materials } from '../lib/plural';
import { STUDY_TYPE_LABELS, studyKey, type LevelSummary } from '../lib/types';
import { useFlashcardsStore, type CardDirection } from '../store/flashcardsStore';
import type { FlashGrade } from '../lib/srs';

interface LessonOption {
  key: string;
  label: string;
}

const DIRECTIONS: Array<{ value: CardDirection; label: string }> = [
  { value: 'en-ru', label: 'Английский → русский' },
  { value: 'ru-en', label: 'Русский → английский' },
  { value: 'mixed', label: 'Вперемешку' },
];

function flipFor(cardId: string): boolean {
  let hash = 0;
  for (let i = 0; i < cardId.length; i += 1) hash += cardId.charCodeAt(i);
  return hash % 2 === 0;
}

export function FlashcardsPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [summaries, setSummaries] = useState<LevelSummary[]>([]);
  const [levelsLoading, setLevelsLoading] = useState(true);
  const [deck, setDeck] = useState<Flashcard[]>([]);
  const [deckLoading, setDeckLoading] = useState(true);
  const [deckError, setDeckError] = useState<string | null>(null);
  const [lessonOptions, setLessonOptions] = useState<Record<string, LessonOption[]>>({});
  const [revealed, setRevealed] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);

  const initialized = useFlashcardsStore((s) => s.initialized);
  const settings = useFlashcardsStore((s) => s.settings);
  const progress = useFlashcardsStore((s) => s.progress);
  const ensureInitialized = useFlashcardsStore((s) => s.ensureInitialized);
  const setLevels = useFlashcardsStore((s) => s.setLevels);
  const enterLevel = useFlashcardsStore((s) => s.enterLevel);
  const enterLesson = useFlashcardsStore((s) => s.enterLesson);
  const clearLessonFilter = useFlashcardsStore((s) => s.clearLessonFilter);
  const toggleType = useFlashcardsStore((s) => s.toggleType);
  const setDirection = useFlashcardsStore((s) => s.setDirection);
  const setNewPerDay = useFlashcardsStore((s) => s.setNewPerDay);
  const setShowExample = useFlashcardsStore((s) => s.setShowExample);
  const grade = useFlashcardsStore((s) => s.grade);
  const resetProgress = useFlashcardsStore((s) => s.resetProgress);

  // Entry: load levels, pick the default scope, apply ?level= / ?lesson= presets.
  useEffect(() => {
    let cancelled = false;
    listLevels()
      .then((levels) => {
        if (cancelled) return;
        setSummaries(levels);
        ensureInitialized(levels.map((l) => l.level));
        const lesson = params.get('lesson');
        const level = params.get('level');
        if (lesson) enterLesson(lesson);
        else if (level) enterLevel(level);
        else clearLessonFilter();
      })
      .catch(() => {
        if (!cancelled) setSummaries([]);
      })
      .finally(() => {
        if (!cancelled) setLevelsLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // Entry params are consumed once per page visit.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // "Back" follows the entry point: a lesson deck returns to the lesson study
  // page, a level preset returns to the level page, a plain visit returns home.
  // Derived from the address (not the store), so it survives a reload.
  const backTarget = useMemo(() => {
    const lesson = params.get('lesson');
    if (lesson) {
      const sep = lesson.indexOf('|');
      if (sep > 0) {
        const level = lesson.slice(0, sep);
        const key = lesson.slice(sep + 1);
        return { to: `/${level}/rules/${encodeURIComponent(key)}`, label: 'К списку' };
      }
    }
    const level = params.get('level');
    if (level) return { to: `/${level}`, label: 'К уровню' };
    return { to: '/', label: 'Ко всем уровням' };
  }, [params]);

  const scope: DeckScope = useMemo(
    () => ({
      levels: [...settings.selectedLevels].sort(),
      lessons: settings.lessons ? [...settings.lessons].sort() : null,
      types: [...settings.types].sort(),
    }),
    [settings.selectedLevels, settings.lessons, settings.types],
  );
  const scopeKey = JSON.stringify(scope);

  useEffect(() => {
    if (!initialized) return;
    let cancelled = false;
    setDeckLoading(true);
    setDeckError(null);
    buildDeck(scope)
      .then((built) => {
        if (!cancelled) setDeck(built);
      })
      .catch((e) => {
        if (!cancelled) setDeckError(String(e));
      })
      .finally(() => {
        if (!cancelled) setDeckLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // Rebuild only when the serialised scope changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scopeKey, initialized]);

  // Lesson checklist for the selected levels.
  useEffect(() => {
    if (!initialized || settings.selectedLevels.length === 0) {
      setLessonOptions({});
      return;
    }
    let cancelled = false;
    Promise.all(
      settings.selectedLevels.map(async (level): Promise<[string, LessonOption[]]> => {
        const manifest = await loadManifest(level);
        const options: LessonOption[] = [];
        for (const entry of manifest.studyOrder) {
          if (entry.type === 'rule' || !settings.types.includes(entry.type)) continue;
          const label = await resolveStudyTitle(level, entry).catch(() => entry.id);
          options.push({ key: `${level}|${studyKey(entry.type, entry.id)}`, label });
        }
        const seen = new Set<string>();
        return [level, options.filter((o) => (seen.has(o.key) ? false : (seen.add(o.key), true)))];
      }),
    )
      .then((entries) => {
        if (!cancelled) setLessonOptions(Object.fromEntries(entries));
      })
      .catch(() => {
        if (!cancelled) setLessonOptions({});
      });
    return () => {
      cancelled = true;
    };
  }, [initialized, settings.selectedLevels, settings.types]);

  const queue = useMemo(
    () => buildSessionQueue(deck, progress, settings.newPerDay, Date.now()),
    [deck, progress, settings.newPerDay],
  );
  const session: Flashcard[] = useMemo(() => [...queue.due, ...queue.fresh], [queue]);
  const current = session[0] ?? null;

  const deckTotals = useMemo(() => {
    let vocabulary = 0;
    let phrases = 0;
    let idioms = 0;
    for (const card of deck) {
      if (card.type === 'vocabulary') vocabulary += 1;
      else if (card.type === 'phrases') phrases += 1;
      else if (card.type === 'idioms') idioms += 1;
    }
    return { total: deck.length, vocabulary, phrases, idioms };
  }, [deck]);

  useEffect(() => {
    setRevealed(false);
    cancelSpeech();
  }, [current?.id]);

  function handleGrade(gradeValue: FlashGrade): void {
    if (!current) return;
    cancelSpeech();
    grade(current.id, gradeValue, Date.now());
    setRevealed(false);
  }

  function handleClearFilter(): void {
    clearLessonFilter();
    navigate('/flashcards', { replace: true });
  }

  function toggleLevel(level: string): void {
    const next = settings.selectedLevels.includes(level)
      ? settings.selectedLevels.filter((l) => l !== level)
      : [...settings.selectedLevels, level];
    setLevels(next);
  }

  function toggleLesson(optionKey: string): void {
    const allKeys = Object.values(lessonOptions).flatMap((opts) => opts.map((o) => o.key));
    const current = settings.lessons ?? allKeys;
    const next = current.includes(optionKey)
      ? current.filter((k) => k !== optionKey)
      : [...current, optionKey];
    useFlashcardsStore.setState((state) => ({
      settings: { ...state.settings, lessons: next.length === allKeys.length ? null : next },
    }));
  }

  const flipped = current
    ? settings.direction === 'ru-en' || (settings.direction === 'mixed' && flipFor(current.id))
    : false;

  if (levelsLoading) return <p className="status">Загрузка...</p>;

  return (
    <div className="page">
      <PageHeader title="Карточки" backTo={backTarget.to} backLabel={backTarget.label} />

      <section className="flash-review" aria-label="Повторение">
        {deckLoading ? (
          <p className="status">Загрузка...</p>
        ) : deckError ? (
          <p className="status error">{deckError}</p>
        ) : deck.length === 0 ? (
          <p className="status">Выберите уровни и типы карточек, чтобы собрать колоду.</p>
        ) : !current ? (
          <p className="status">На сегодня всё! Заглядывайте завтра — карточки ждут.</p>
        ) : (
          <>
            <p className="flash-queue">
              К повторению: {queue.due.length} · Новых: {queue.fresh.length}
            </p>
            <FlashcardView
              card={current}
              flipped={flipped}
              revealed={revealed}
              showExample={settings.showExample}
              onReveal={() => setRevealed(true)}
              onGrade={handleGrade}
            />
          </>
        )}
      </section>

      {settings.fixedLesson ? (
        <div className="flash-fixed-note">
          <p>
            Подборка урока: <strong>{deck[0]?.lessonTitle ?? '...'}</strong> · {cards(deck.length)}
          </p>
          <button type="button" className="btn btn-secondary btn-sm" onClick={handleClearFilter}>
            Показать выбор уровней и уроков
          </button>
        </div>
      ) : (
        <section className="flash-scope" aria-label="Выбор материала">
          <h2>Что повторяем</h2>
          <div className="flash-levels">
            {summaries.map((lvl) => (
              <Toggle
                key={lvl.level}
                checked={settings.selectedLevels.includes(lvl.level)}
                onChange={() => toggleLevel(lvl.level)}
                label={lvl.title}
              />
            ))}
          </div>
          <div className="flash-types">
            {(['vocabulary', 'phrases', 'idioms'] as const).map((type) => (
              <Toggle
                key={type}
                checked={settings.types.includes(type)}
                onChange={() => toggleType(type)}
                label={STUDY_TYPE_LABELS[type]}
              />
            ))}
          </div>
          {Object.entries(lessonOptions).map(([level, options]) => (
            <details key={level} className="flash-lessons">
              <summary>
                {level} · {materials(options.length)}
                {settings.lessons && ' (выбраны не все)'}
              </summary>
              <div className="flash-lessons-list">
                {options.map((opt) => (
                  <Toggle
                    key={opt.key}
                    checked={settings.lessons ? settings.lessons.includes(opt.key) : true}
                    onChange={() => toggleLesson(opt.key)}
                    label={opt.label}
                  />
                ))}
              </div>
            </details>
          ))}
          {!deckLoading && !deckError && deck.length > 0 && (
            <p className="flash-total">
              Всего: {cards(deckTotals.total)} (слов: {deckTotals.vocabulary} · фраз:{' '}
              {deckTotals.phrases} · идиом: {deckTotals.idioms})
            </p>
          )}
        </section>
      )}

      <section className="flash-settings" aria-label="Настройки повторения">
        <h2>Настройки</h2>
        <label className="flash-row">
          Направление
          <select value={settings.direction} onChange={(e) => setDirection(e.target.value as CardDirection)}>
            {DIRECTIONS.map((d) => (
              <option key={d.value} value={d.value}>
                {d.label}
              </option>
            ))}
          </select>
        </label>
        <label className="flash-row">
          Новых карточек в день
          <input
            type="number"
            min={1}
            max={100}
            value={settings.newPerDay}
            onChange={(e) => setNewPerDay(Number(e.target.value))}
          />
        </label>
        <Toggle
          checked={settings.showExample}
          onChange={(checked) => setShowExample(checked)}
          label="Показывать пример после ответа"
        />
        <button type="button" className="btn btn-secondary btn-sm" onClick={() => setConfirmReset(true)}>
          Сбросить прогресс повторений
        </button>
      </section>

      <ConfirmModal
        open={confirmReset}
        title="Сбросить прогресс?"
        message="Интервалы всех карточек будут удалены, повторение начнётся заново."
        confirmLabel="Сбросить"
        onConfirm={() => {
          resetProgress();
          setConfirmReset(false);
        }}
        onCancel={() => setConfirmReset(false)}
      />
    </div>
  );
}
