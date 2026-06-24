import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Logo } from '../components/Logo';
import { PageHeader } from '../components/Layout';
import { listLevels } from '../lib/loadContent';
import type { LevelSummary } from '../lib/types';

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
        title="Languages Learning"
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
                <span className="card-meta">
                  {lvl.hasStudy && 'Обучение'}
                  {lvl.hasStudy && lvl.hasTests && ' · '}
                  {lvl.hasTests && 'Тесты'}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
