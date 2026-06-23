import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { CheckMark, PageHeader } from '../components/Layout';
import { StudyListToolbar } from '../components/StudyListToolbar';
import {
  collectStudyItemsForTestDay,
  loadManifest,
  loadTestDay,
  resolveStudyTitle,
} from '../lib/loadContent';
import { STUDY_TYPE_LABELS, studyKey, type StudyOrderItem } from '../lib/types';
import { useProgressStore, useCompletedStudy } from '../store/progressStore';

interface StudyListItem extends StudyOrderItem {
  index: number;
  label: string;
}

export function TestDayStudyListPage() {
  const { level = '', dayId = '' } = useParams();
  const [items, setItems] = useState<StudyListItem[]>([]);
  const [dayLabel, setDayLabel] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const completedStudy = useCompletedStudy(level);
  const toggleStudyComplete = useProgressStore((s) => s.toggleStudyComplete);

  const itemKeys = items.map((item) => studyKey(item.type, item.id));

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const manifest = await loadManifest(level);
        const dayIndex = manifest.testDays.indexOf(dayId);
        if (dayIndex === -1) {
          throw new Error(`День ${dayId} не найден`);
        }

        const questions = await loadTestDay(level, dayId);
        const studyItems = collectStudyItemsForTestDay(questions, manifest.studyOrder);
        const resolved = await Promise.all(
          studyItems.map(async (item, i) => {
            const title = await resolveStudyTitle(level, item).catch(() => item.id);
            return {
              ...item,
              index: i + 1,
              label: title,
            };
          }),
        );

        if (!cancelled) {
          setDayLabel(`День ${dayIndex + 1}`);
          setItems(resolved);
        }
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
  }, [level, dayId]);

  if (loading) return <p className="status">Загрузка...</p>;
  if (error) return <p className="status error">{error}</p>;

  return (
    <div className="page">
      <PageHeader
        title={`Материалы — ${dayLabel}`}
        backTo={`/${level}/tests`}
        backLabel="К тестам"
        actions={<StudyListToolbar level={level} keys={itemKeys} />}
      />
      {items.length === 0 ? (
        <p className="status">Нет материалов для этого дня.</p>
      ) : (
        <ol className="numbered-list">
          {items.map((item) => {
            const key = studyKey(item.type, item.id);
            const done = completedStudy.includes(key);
            return (
              <li key={key}>
                <Link
                  to={`/${level}/tests/${dayId}/study/${encodeURIComponent(key)}`}
                  className="list-link"
                >
                  <span className="list-num">{item.index}.</span>
                  <span className="list-text">
                    <span className="list-type">{STUDY_TYPE_LABELS[item.type]}</span>
                    <span className="list-title">{item.label}</span>
                  </span>
                  <CheckMark
                    done={done}
                    onChange={() => toggleStudyComplete(level, key)}
                  />
                </Link>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
