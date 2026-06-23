import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { CheckMark, PageHeader } from '../components/Layout';
import { loadManifest, loadTestDay } from '../lib/loadContent';
import type { Manifest, TestQuestion } from '../lib/types';
import { useProgressStore } from '../store/progressStore';

interface DaySummary {
  dayId: string;
  label: string;
  questions: TestQuestion[];
}

export function TestsListPage() {
  const { level = '' } = useParams();
  const [days, setDays] = useState<DaySummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const isTestComplete = useProgressStore((s) => s.isTestComplete);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const manifest: Manifest = await loadManifest(level);
        const loaded = await Promise.all(
          manifest.testDays.map(async (dayId, i) => {
            const questions = await loadTestDay(level, dayId);
            return {
              dayId,
              label: `День ${i + 1}`,
              questions,
            };
          }),
        );
        if (!cancelled) setDays(loaded);
      } catch (e) {
        if (!cancelled) setError(String(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [level]);

  if (loading) return <p className="status">Загрузка...</p>;
  if (error) return <p className="status error">{error}</p>;

  return (
    <div className="page">
      <PageHeader title="Тесты" backTo={`/${level}`} backLabel="К уровню" />
      {days.map((day) => (
        <section key={day.dayId} className="test-day-section">
          <div className="test-day-header">
            <h2>{day.label}</h2>
            <Link
              to={`/${level}/tests/${day.dayId}/study`}
              className="btn btn-secondary btn-sm"
            >
              Правила
            </Link>
          </div>
          <ol className="numbered-list">
            {day.questions.map((q, i) => {
              const done = isTestComplete(level, q.id);
              return (
                <li key={q.id}>
                  <Link
                    to={`/${level}/tests/${day.dayId}/${i}`}
                    className="list-link"
                  >
                    <span className="list-num">{i + 1}.</span>
                    <span className="list-text list-title">{q.question}</span>
                    <CheckMark done={done} />
                  </Link>
                </li>
              );
            })}
          </ol>
        </section>
      ))}
    </div>
  );
}
