import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { ConfirmModal } from '../components/ConfirmModal';
import { PageHeader } from '../components/Layout';
import { ScreenFeedback, type FeedbackSignal } from '../components/ScreenFeedback';
import { SpeakButton } from '../components/SpeakButton';
import {
  buildGameSession,
  takeGameCards,
  type ChoiceRound,
  type GameRound,
  type GameSession,
  type MatchRound,
  type SpellingRound,
} from '../lib/associationGame';
import { cancelSpeech } from '../lib/speech';
import { gameRunKey, useGameSessionStore } from '../store/gameSessionStore';
import { useCompletedGame, useProgressStore } from '../store/progressStore';

const ROUND_LABELS: Record<GameRound['kind'], string> = {
  intro: 'Новые слова',
  choice: 'Найди перевод',
  match: 'Пары',
  spelling: 'Собери слово',
};

/** Hearts per session (approximation — the reference keeps exact numbers server-side). */
const MAX_HEARTS = 3;

/** Pixel-art heart map (11x8): '#' outline, 'R' red, 'D' dark shade, 'W' highlight. */
const HEART_MAP = [
  '..##...##..',
  '..#RR#RR#..',
  '.#RRRRRRR#.',
  '.#WRRRRRD#.',
  '.#WWRRRDD#.',
  '..#RRRDD#..',
  '...#RRD#...',
  '....#R#....',
];

const HEART_FULL = { outline: '#401414', red: '#ee2c24', dark: '#b3121f', hi: '#ffffff' };
const HEART_LOST = { outline: '#8a939c', red: '#c3ccd4', dark: '#a7b0b9', hi: '#eef1f4' };

function PixelHeart({ lost }: { lost: boolean }) {
  const p = lost ? HEART_LOST : HEART_FULL;
  return (
    <svg className="game-heart-svg" viewBox="0 0 11 8" aria-hidden="true">
      {HEART_MAP.flatMap((row, y) =>
        [...row].map((ch, x) => {
          const fill =
            ch === '#' ? p.outline : ch === 'R' ? p.red : ch === 'D' ? p.dark : ch === 'W' ? p.hi : null;
          return fill ? <rect key={`${x}-${y}`} x={x} y={y} width={1.02} height={1.02} fill={fill} /> : null;
        }),
      )}
    </svg>
  );
}

function Hearts({ hearts }: { hearts: number }) {
  return (
    <span className="game-hearts" aria-label={`Жизни: ${hearts} из ${MAX_HEARTS}`}>
      {Array.from({ length: MAX_HEARTS }, (_, i) => (
        <span key={i} className={i < hearts ? 'game-heart' : 'game-heart game-heart--lost'}>
          <PixelHeart lost={i >= hearts} />
        </span>
      ))}
    </span>
  );
}

function shuffledPairOrder<T>(items: T[], seedText: string): T[] {
  let hash = 0;
  const key = `${seedText}:${items.length}`;
  for (let i = 0; i < key.length; i += 1) hash = (hash * 31 + key.charCodeAt(i)) | 0;
  const order = [...items];
  let state = hash === 0 ? 1 : hash;
  for (let i = order.length - 1; i > 0; i -= 1) {
    state = (Math.imul(state, 1103515245) + 12345) & 0x7fffffff;
    const j = state % (i + 1);
    [order[i], order[j]] = [order[j], order[i]];
  }
  return order;
}

function ChoiceView({
  round,
  onAnswered,
}: {
  round: ChoiceRound;
  onAnswered: (correctFirstTry: boolean) => void;
}) {
  const [selected, setSelected] = useState<number | null>(null);
  const [confirmed, setConfirmed] = useState(false);

  function handleCheck(): void {
    if (selected === null || confirmed) return;
    setConfirmed(true);
    onAnswered(selected === round.correctIndex);
  }

  function optionClass(index: number): string {
    if (!confirmed) return selected === index ? 'option-btn selected' : 'option-btn';
    if (index === round.correctIndex) return 'option-btn correct';
    if (index === selected) return 'option-btn incorrect';
    return 'option-btn';
  }

  return (
    <div className="test-main" data-correctindex={round.correctIndex}>
      <p className="game-round-kind">{ROUND_LABELS.choice}</p>
      <p className="test-question" lang="en">
        {round.card.frontEn}{' '}
        <SpeakButton text={round.card.frontEn} label="Озвучить слово" small />
      </p>
      <div className="options" role="group" aria-label="Варианты перевода">
        {round.options.map((option, index) => (
          <button
            key={`${index}-${option}`}
            type="button"
            className={optionClass(index)}
            disabled={confirmed}
            onClick={() => setSelected(index)}
          >
            <span lang="ru">{option}</span>
          </button>
        ))}
      </div>
      {!confirmed ? (
        <button
          type="button"
          className="btn btn-primary"
          disabled={selected === null}
          onClick={handleCheck}
        >
          Проверить
        </button>
      ) : (
        <div className="test-feedback">
          <p className="feedback">
            {selected === round.correctIndex ? (
              <span className="correct-text">Верно!</span>
            ) : (
              <span className="incorrect-text">Неверно.</span>
            )}
          </p>
          <p className="explanation" lang="en">
            {round.card.frontEn} — {round.card.backRu}
          </p>
        </div>
      )}
    </div>
  );
}

function MatchView({
  round,
  onSolved,
  onMistake,
}: {
  round: MatchRound;
  onSolved: () => void;
  onMistake: () => void;
}) {
  const [pickedEn, setPickedEn] = useState<string | null>(null);
  const [solved, setSolved] = useState<string[]>([]);
  const [wrong, setWrong] = useState<string | null>(null);

  const enOrder = useMemo(
    () => shuffledPairOrder(round.pairs, `en:${round.pairs[0]?.cardId ?? ''}`),
    [round],
  );
  const ruOrder = useMemo(
    () => shuffledPairOrder(round.pairs, `ru:${round.pairs[0]?.cardId ?? ''}`),
    [round],
  );

  const done = solved.length === round.pairs.length;

  function pickRu(cardId: string): void {
    if (done) return;
    if (pickedEn === null) return;
    if (pickedEn === cardId) {
      const next = [...solved, cardId];
      setSolved(next);
      setPickedEn(null);
      setWrong(null);
      if (next.length === round.pairs.length) onSolved();
    } else {
      setWrong(cardId);
      onMistake();
    }
  }

  function enClass(cardId: string): string {
    if (solved.includes(cardId)) return 'option-btn correct';
    if (pickedEn === cardId) return 'option-btn selected';
    return 'option-btn';
  }

  function ruClass(cardId: string): string {
    if (solved.includes(cardId)) return 'option-btn correct';
    if (wrong === cardId) return 'option-btn incorrect';
    return 'option-btn';
  }

  return (
    <div className="test-main">
      <p className="game-round-kind">{ROUND_LABELS.match}</p>
      <p className="test-question">Соедините пары: сначала английское слово, затем перевод</p>
      <div className="game-match">
        <div className="options" aria-label="Английские слова">
          {enOrder.map((pair) => (
            <button
              key={pair.cardId}
              type="button"
              className={enClass(pair.cardId)}
              data-side="en"
              data-cardid={pair.cardId}
              disabled={solved.includes(pair.cardId)}
              onClick={() => {
                setPickedEn(pair.cardId);
                setWrong(null);
              }}
            >
              <span lang="en">{pair.en}</span>
            </button>
          ))}
        </div>
        <div className="options" aria-label="Переводы">
          {ruOrder.map((pair) => (
            <button
              key={pair.cardId}
              type="button"
              className={ruClass(pair.cardId)}
              data-side="ru"
              data-cardid={pair.cardId}
              disabled={solved.includes(pair.cardId)}
              onClick={() => pickRu(pair.cardId)}
            >
              <span lang="ru">{pair.ru}</span>
            </button>
          ))}
        </div>
      </div>
      {done && <p className="feedback correct-text">Все пары собраны!</p>}
    </div>
  );
}

function SpellingView({
  round,
  onSolved,
  onMistake,
}: {
  round: SpellingRound;
  onSolved: (correctFirstTry: boolean) => void;
  onMistake: () => void;
}) {
  const [picked, setPicked] = useState<number[]>([]);
  const [mistakes, setMistakes] = useState(0);
  const [done, setDone] = useState(false);

  function pickLetter(index: number): void {
    if (done || picked.includes(index) || picked.length >= round.target.length) return;
    setPicked((prev) => [...prev, index]);
  }

  function check(): void {
    if (done || picked.length !== round.target.length) return;
    const answer = picked.map((i) => round.letters[i]).join('');
    if (answer === round.target) {
      setDone(true);
      onSolved(mistakes === 0);
    } else {
      setMistakes((n) => n + 1);
      onMistake();
      setPicked([]);
    }
  }

  function undo(): void {
    if (done) return;
    setPicked((prev) => prev.slice(0, -1));
  }

  return (
    <div className="test-main" data-answer={round.target}>
      <p className="game-round-kind">{ROUND_LABELS.spelling}</p>
      <p className="test-question" lang="ru">
        {round.card.backRu}{' '}
        <SpeakButton text={round.card.frontEn} label="Озвучить слово" small />
      </p>
      <p className="game-spelling-answer" aria-label="Собранное слово">
        {round.target.split('').map((_, i) => (
          <span key={i} className="game-letter-slot">
            {picked[i] !== undefined ? round.letters[picked[i]] : ' '}
          </span>
        ))}
      </p>
      <div className="game-letters" role="group" aria-label="Буквы">
        {round.letters.map((letter, index) => (
          <button
            key={index}
            type="button"
            className={`btn btn-secondary btn-sm game-letter${
              picked.includes(index) ? ' game-letter--used' : ''
            }`}
            data-letter={letter}
            data-used={picked.includes(index)}
            disabled={done || picked.includes(index)}
            onClick={() => pickLetter(index)}
          >
            {letter}
          </button>
        ))}
      </div>
      <div className="game-continue">
        <button type="button" className="btn btn-secondary btn-sm" disabled={done || picked.length === 0} onClick={undo}>
          Стереть букву
        </button>{' '}
        <button
          type="button"
          className="btn btn-primary btn-sm"
          disabled={done || picked.length !== round.target.length}
          onClick={check}
        >
          Проверить
        </button>
      </div>
      {done && <p className="feedback correct-text">Верно: {round.target}</p>}
      {!done && mistakes > 0 && (
        <p className="feedback">
          <span className="incorrect-text">Неверно. Попробуйте ещё раз.</span>
        </p>
      )}
    </div>
  );
}

export function GamePage() {
  const { level = '' } = useParams();
  const [params] = useSearchParams();
  const lesson = params.get('lesson');

  const [session, setSession] = useState<GameSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [roundIndex, setRoundIndex] = useState(0);
  const [roundDone, setRoundDone] = useState(false);
  const [perfectCount, setPerfectCount] = useState(0);
  const [spanStartLost, setSpanStartLost] = useState(0);
  const [answered, setAnswered] = useState(0);
  const [hearts, setHearts] = useState(MAX_HEARTS);
  const [heartsLost, setHeartsLost] = useState(0);
  const [failed, setFailed] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const [feedback, setFeedback] = useState<FeedbackSignal | null>(null);
  const feedbackId = useRef(0);
  const clearFeedback = useCallback(() => setFeedback(null), []);

  function flash(kind: FeedbackSignal['kind'], shake: boolean): void {
    feedbackId.current += 1;
    setFeedback({ kind, shake, id: feedbackId.current });
  }

  const completedGame = useCompletedGame(level);
  const markGameComplete = useProgressStore((s) => s.markGameComplete);
  const markGameCompleteBulk = useProgressStore((s) => s.markGameCompleteBulk);
  const resetGame = useProgressStore((s) => s.resetGame);

  const seedText = lesson ?? level;

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    takeGameCards(level, lesson)
      .then((cards) => {
        if (cancelled) return;
        if (cards.length === 0) {
          setError('Для этого уровня пока нет слов.');
          return;
        }
        const built = buildGameSession(level, cards, seedText);
        setSession(built);
        const snap =
          useGameSessionStore.getState().runs[gameRunKey(level, lesson)] ?? null;
        if (snap && snap.roundIndex < built.rounds.length) {
          setRoundIndex(snap.roundIndex);
          setRoundDone(false);
          setPerfectCount(snap.perfectCount ?? 0);
          setSpanStartLost(snap.spanStartLost ?? snap.heartsLost ?? 0);
          setAnswered(snap.answered);
          setHearts(Math.min(snap.hearts, MAX_HEARTS));
          setHeartsLost(snap.heartsLost);
          setFailed(false);
        } else {
          resetSession();
        }
      })
      .catch((e) => {
        if (!cancelled) setError(String(e));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // New session per level/lesson entry.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [level, lesson]);

  useEffect(() => {
    cancelSpeech();
  }, [roundIndex]);

  useEffect(() => {
    if (hearts === 0) setFailed(true);
  }, [hearts]);

  // Persist the run snapshot on every change; clear it once finished.
  // Round 0 with no answers is not a run yet — nothing to resume.
  useEffect(() => {
    if (!session || loading) return;
    const scope = gameRunKey(level, lesson);
    const store = useGameSessionStore.getState();
    if (roundIndex >= session.rounds.length) {
      store.clearRun(scope);
      return;
    }
    if (roundIndex === 0 && answered === 0 && heartsLost === 0) return;
    store.saveRun({
      scope,
      level,
      lesson,
      roundIndex,
      hearts,
      heartsLost,
      spanStartLost,
      perfectCount,
      answered,
      totalRounds: session.rounds.length,
    });
  }, [session, loading, level, lesson, roundIndex, hearts, heartsLost, spanStartLost, perfectCount, answered]);

  const backTarget = useMemo(() => {
    if (lesson) {
      const sep = lesson.indexOf('|');
      if (sep > 0) {
        return {
          to: `/${lesson.slice(0, sep)}/rules/${encodeURIComponent(lesson.slice(sep + 1))}`,
          label: 'К списку',
        };
      }
    }
    return { to: `/${level}/game`, label: 'К игре' };
  }, [lesson, level]);

  if (loading) return <p className="status">Загрузка...</p>;
  if (error || !session) {
    return (
      <div className="page">
        <PageHeader title="Игра" backTo={backTarget.to} backLabel={backTarget.label} />
        <p className="status error">{error ?? 'Игра не найдена'}</p>
      </div>
    );
  }

  const round: GameRound | undefined = session.rounds[roundIndex];
  const finished = round === undefined;
  const isCheckpoint = !finished && session.checkpoints.includes(roundIndex);
  const checkpointNumber = session.checkpoints.filter((cp) => cp <= roundIndex).length;
  const checkpointTotal = session.checkpoints.length;

  function handleAnswered(cardId: string, correctFirstTry: boolean): void {
    setAnswered((n) => n + 1);
    if (!correctFirstTry) {
      flash('error', true);
      loseHeart();
    } else {
      flash('success', false);
    }
    markGameComplete(level, cardId);
    setRoundDone(true);
  }

  function handleSpellingSolved(cardId: string): void {
    // Hearts for failed spelling checks were already lost via onMistake —
    // success itself must never cost a heart.
    setAnswered((n) => n + 1);
    flash('success', false);
    markGameComplete(level, cardId);
    setRoundDone(true);
  }

  function handleMatchSolved(pairs: MatchRound['pairs']): void {
    flash('success', false);
    markGameCompleteBulk(
      level,
      pairs.map((pair) => pair.cardId),
    );
    setRoundDone(true);
  }

  function loseHeart(): void {
    setHearts((h) => Math.max(0, h - 1));
    setHeartsLost((n) => n + 1);
  }

  function handleMistake(): void {
    flash('error', true);
    loseHeart();
  }

  function resetSession(): void {
    setRoundIndex(0);
    setRoundDone(false);
    setPerfectCount(0);
    setSpanStartLost(0);
    setAnswered(0);
    setHearts(MAX_HEARTS);
    setHeartsLost(0);
    setFailed(false);
  }

  /** Resume at the current block start with full hearts (fail checkpoint). */
  function resumeFromCheckpoint(): void {
    const past = session?.checkpoints.filter((cp) => cp <= roundIndex) ?? [0];
    setRoundIndex(past[past.length - 1] ?? 0);
    setRoundDone(false);
    setHearts(MAX_HEARTS);
    setSpanStartLost(heartsLost);
    setFailed(false);
  }

  function advance(): void {
    const next = roundIndex + 1;
    setRoundDone(false);
    setRoundIndex(next);
    // Checkpoint arrival heals: a new 8-card span starts with full hearts.
    // A span finished without fresh mistakes counts as perfect.
    if (session?.checkpoints.includes(next)) {
      if (heartsLost === spanStartLost) setPerfectCount((n) => n + 1);
      setSpanStartLost(heartsLost);
      setHearts(MAX_HEARTS);
    }
  }

  return (
    <div className="page">
      <ScreenFeedback signal={feedback} onDone={clearFeedback} />
      <PageHeader title="Игра" backTo={backTarget.to} backLabel={backTarget.label} />
      {failed ? (
        <div className="test-main">
          <h2>Жизни закончились!</h2>
          <p>
            <Hearts hearts={0} />
          </p>
          <p>Слова уже знакомы — попробуйте ещё раз, получится.</p>
          <div className="action-list">
            <button type="button" className="action-btn" onClick={resumeFromCheckpoint}>
              Продолжить с блока
            </button>
            <button type="button" className="action-btn" onClick={resetSession}>
              С начала
            </button>
            <Link to={`/${level}`} className="action-btn">
              К уровню
            </Link>
          </div>
        </div>
      ) : !finished && round ? (
        <>
          <p className="game-progress" aria-live="polite">
            <Hearts hearts={hearts} />{' '}
            Чекпоинт {checkpointNumber} из {checkpointTotal} · Идеально: {perfectCount} · Слов
            пройдено: {completedGame.length}
          </p>
          {isCheckpoint && (
            <p className="game-checkpoint" aria-label="Чекпоинт">
              ★ Чекпоинт · прогресс сохранён — при поражении вернётесь сюда
            </p>
          )}
          {round.kind === 'intro' && (
            <div className="test-main" key={`intro-${round.card.id}`}>
              <p className="game-round-kind">{ROUND_LABELS.intro}</p>
              <p className="test-question" lang="en">
                {round.card.frontEn}{' '}
                <SpeakButton text={round.card.frontEn} label="Озвучить слово" small />
              </p>
              <p lang="ru">{round.card.backRu}</p>
              {round.card.keyword && round.card.mnemonic && (
                <div className="flash-mnemonic">
                  <p>
                    <strong>Созвучие:</strong> {round.card.keyword}
                  </p>
                  <p>{round.card.mnemonic}</p>
                </div>
              )}
              {round.card.example && (
                <p className="flash-example">
                  <em lang="en">{round.card.example}</em>{' '}
                  <SpeakButton text={round.card.example} label="Озвучить пример" small />
                </p>
              )}
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => setRoundIndex((i) => i + 1)}
              >
                Запомнил, дальше
              </button>
            </div>
          )}
          {round.kind === 'choice' && (
            <div key={`choice-${round.card.id}-${roundIndex}`}>
              <ChoiceView
                round={round}
                onAnswered={(correctFirstTry) =>
                  handleAnswered(round.card.id, correctFirstTry)
                }
              />
              <div className="game-continue">
                <button
                  type="button"
                  className="btn btn-primary"
                  disabled={!roundDone}
                  onClick={advance}
                >
                  Продолжить
                </button>
              </div>
            </div>
          )}
          {round.kind === 'match' && (
            <div key={`match-${roundIndex}`}>
              <MatchView
                round={round}
                onSolved={() => handleMatchSolved(round.pairs)}
                onMistake={handleMistake}
              />
              <div className="game-continue">
                <button
                  type="button"
                  className="btn btn-primary"
                  disabled={!roundDone}
                  onClick={advance}
                >
                  Продолжить
                </button>
              </div>
            </div>
          )}
          {round.kind === 'spelling' && (
            <div key={`spelling-${round.card.id}-${roundIndex}`}>
              <SpellingView
                round={round}
                onSolved={() => handleSpellingSolved(round.card.id)}
                onMistake={handleMistake}
              />
              <div className="game-continue">
                <button
                  type="button"
                  className="btn btn-primary"
                  disabled={!roundDone}
                  onClick={advance}
                >
                  Продолжить
                </button>
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="test-main">
          <h2>Сессия завершена!</h2>
          <p>
            Слов в сессии: {session.cards.length} · Ответов: {answered} · Идеально:{' '}
            {perfectCount}
          </p>
          <div className="action-list">
            <Link
              to={`/${level}/game${lesson ? `?lesson=${encodeURIComponent(lesson)}` : ''}`}
              className="action-btn"
              onClick={resetSession}
            >
              Играть ещё раз
            </Link>
            <Link to={`/${level}`} className="action-btn">
              К уровню
            </Link>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => setConfirmReset(true)}
            >
              Сбросить прогресс игры
            </button>
          </div>
        </div>
      )}
      <ConfirmModal
        open={confirmReset}
        title="Сбросить прогресс?"
        message="Пройденные в игре слова будут забыты, сессия начнётся заново."
        confirmLabel="Сбросить"
        onConfirm={() => {
          resetGame(level);
          setConfirmReset(false);
        }}
        onCancel={() => setConfirmReset(false)}
      />
    </div>
  );
}
