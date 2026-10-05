import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Logo } from '../components/Logo';
import { PageHeader } from '../components/Layout';
import { listLevels } from '../lib/loadContent';
import { lessons, testDays } from '../lib/plural';
import type { LevelSummary } from '../lib/types';

function describeLevel(lvl: LevelSummary): string {
  if (lvl.lessonCount === 0) return 'Материал в разработке';

  const parts = [lessons(lvl.lessonCount)];
  if (lvl.testDayCount > 0) parts.push(testDays(lvl.testDayCount));
  return parts.join(' · ');
}

export function HomePage() {
  const [levels, setLevels] = useState<LevelSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listLevels()
      .then(setLevels)
      .catch((e) => setError(String(e)))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p className="status">Загрузка...</p>;
  if (error) return <p className="status error">{error}</p>;

  return (
    <div className="page">
      <PageHeader
        title="Language Learning"
        actions={<Logo width={48} height={31} aria-hidden />}
      />
      {levels.length === 0 ? (
        <p className="status">Нет доступных уровней. Добавьте контент в папку content/.</p>
      ) : (
        <ul className="card-list">
          {levels.map((lvl) => (
            <li key={lvl.level}>
              <Link to={`/${lvl.level}`} className="card">
                <span className="card-title">{lvl.title}</span>
                <span className="card-meta">{describeLevel(lvl)}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
