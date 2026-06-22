import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { PageHeader } from '../components/Layout';
import { loadManifest } from '../lib/loadContent';
import type { Manifest } from '../lib/types';

export function LevelPage() {
  const { level = '' } = useParams();
  const [manifest, setManifest] = useState<Manifest | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadManifest(level)
      .then(setManifest)
      .catch((e) => setError(String(e)))
      .finally(() => setLoading(false));
  }, [level]);

  if (loading) return <p className="status">Загрузка...</p>;
  if (error || !manifest) return <p className="status error">{error ?? 'Уровень не найден'}</p>;

  return (
    <div className="page">
      <PageHeader title={manifest.title} backTo="/" backLabel="Ко всем уровням" />
      <div className="action-list">
        {manifest.studyOrder.length > 0 && (
          <Link to={`/${level}/rules`} className="action-btn">
            Изучать правила
          </Link>
        )}
        {manifest.testDays.length > 0 && (
          <Link to={`/${level}/tests`} className="action-btn">
            Проходить тесты
          </Link>
        )}
        {manifest.studyOrder.length === 0 && manifest.testDays.length === 0 && (
          <p className="status">Для этого уровня пока нет материалов.</p>
        )}
      </div>
    </div>
  );
}
