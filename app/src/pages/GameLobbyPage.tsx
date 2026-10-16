import { useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ConfirmModal } from '../components/ConfirmModal';
import { PageHeader } from '../components/Layout';
import { gameRunKey, useGameRun, useGameSessionStore } from '../store/gameSessionStore';
import { useCompletedGame, useProgressStore } from '../store/progressStore';

export function GameLobbyPage() {
  const { level = '' } = useParams();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const lesson = params.get('lesson');

  const [confirmRestart, setConfirmRestart] = useState(false);

  const run = useGameRun(level, lesson);
  const completedGame = useCompletedGame(level);
  const clearRun = useGameSessionStore((s) => s.clearRun);
  const resetGame = useProgressStore((s) => s.resetGame);

  const playPath = useMemo(
    () => `/${level}/game/play${lesson ? `?lesson=${encodeURIComponent(lesson)}` : ''}`,
    [level, lesson],
  );

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
    return { to: `/${level}`, label: 'К уровню' };
  }, [lesson, level]);

  const hasData = run !== null || completedGame.length > 0;

  function startFresh(): void {
    clearRun(gameRunKey(level, lesson));
    resetGame(level);
    navigate(playPath);
  }

  function handleStart(): void {
    if (hasData) {
      setConfirmRestart(true);
      return;
    }
    navigate(playPath);
  }

  const percent =
    run && run.totalRounds > 0 ? Math.round((run.roundIndex / run.totalRounds) * 100) : 0;

  return (
    <div className="page">
      <PageHeader title="Игра" backTo={backTarget.to} backLabel={backTarget.label} />
      <div className="action-list">
        <button
          type="button"
          className="action-btn"
          disabled={run === null}
          onClick={() => navigate(playPath)}
        >
          Продолжить
        </button>
        {run && (
          <p className="status">
            Пройдено {percent}% · Потрачено жизней: {run.heartsLost}
          </p>
        )}
        <button type="button" className="action-btn" onClick={handleStart}>
          Начать с начала
        </button>
      </div>
      <ConfirmModal
        open={confirmRestart}
        title="Начать с начала?"
        message="Вы действительно хотите начать с самого начала? Весь предыдущий прогресс будет удалён."
        confirmLabel="Начать с начала"
        onConfirm={() => {
          setConfirmRestart(false);
          startFresh();
        }}
        onCancel={() => setConfirmRestart(false)}
      />
    </div>
  );
}
