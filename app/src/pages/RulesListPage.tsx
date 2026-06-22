import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { CheckMark, PageHeader } from '../components/Layout';
import { loadManifest, resolveStudyTitle } from '../lib/loadContent';
import { STUDY_TYPE_LABELS, studyKey, type Manifest, type StudyOrderItem } from '../lib/types';
import { useProgressStore } from '../store/progressStore';

interface StudyListItem extends StudyOrderItem {
  index: number;
  label: string;
}

export function RulesListPage() {
  const { level = '' } = useParams();
  const [items, setItems] = useState<StudyListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const isStudyComplete = useProgressStore((s) => s.isStudyComplete);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const manifest: Manifest = await loadManifest(level);
        const resolved = await Promise.all(
          manifest.studyOrder.map(async (item, i) => {
            const title = await resolveStudyTitle(level, item).catch(() => item.id);
            return {
              ...item,
              index: i + 1,
              label: title,
            };
          }),
        );
        if (!cancelled) setItems(resolved);
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
      <PageHeader title="Обучение" backTo={`/${level}`} backLabel="К уровню" />
      <ol className="numbered-list">
        {items.map((item) => {
          const key = studyKey(item.type, item.id);
          const done = isStudyComplete(level, key);
          return (
            <li key={key}>
              <Link to={`/${level}/rules/${encodeURIComponent(key)}`} className="list-link">
                <span className="list-num">{item.index}.</span>
                <span className="list-text">
                  <span className="list-type">{STUDY_TYPE_LABELS[item.type]}</span>
                  <span className="list-title">{item.label}</span>
                </span>
                <CheckMark done={done} />
              </Link>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
