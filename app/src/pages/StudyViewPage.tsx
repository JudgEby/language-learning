import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { PageHeader } from '../components/Layout';
import { SpeakButton } from '../components/SpeakButton';
import { loadLexicon, loadRule } from '../lib/loadContent';
import { cancelSpeech } from '../lib/speech';
import { parseStudyKey, studyKey, type Lexicon, type Rule } from '../lib/types';
import { useProgressStore, useCompletedStudy } from '../store/progressStore';

export function StudyViewPage() {
  const { level = '', studyKeyParam = '', dayId } = useParams();
  const navigate = useNavigate();
  const key = decodeURIComponent(studyKeyParam);
  const { type, id } = parseStudyKey(key);
  const fromTestDay = Boolean(dayId);
  const listPath = fromTestDay
    ? `/${level}/tests/${dayId}/study`
    : `/${level}/rules`;
  const listLabel = fromTestDay ? 'К материалам дня' : 'К списку';

  const [rule, setRule] = useState<Rule | null>(null);
  const [lexicon, setLexicon] = useState<Lexicon | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const markStudyComplete = useProgressStore((s) => s.markStudyComplete);
  const completedStudy = useCompletedStudy(level);
  const done = completedStudy.includes(key);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        if (type === 'rule') {
          const data = await loadRule(level, id);
          if (!cancelled) setRule(data);
        } else {
          const data = await loadLexicon(level, type, id);
          if (!cancelled) setLexicon(data);
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
  }, [level, type, id]);

  // Stop pronunciation when leaving the study page.
  useEffect(() => () => cancelSpeech(), []);

  if (loading) return <p className="status">Загрузка...</p>;
  if (error) return <p className="status error">{error}</p>;

  const title = rule?.title ?? lexicon?.title ?? id;

  return (
    <div className="page">
      <PageHeader title={title} backTo={listPath} backLabel={listLabel} />

      <div className="study-content">
        {rule && (
          <>
            <p className="unit-label">{rule.unit}</p>
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{rule.contentMd}</ReactMarkdown>
            {rule.examples.length > 0 && (
              <div className="examples">
                <h3>Примеры</h3>
                <ul>
                  {rule.examples.map((ex) => (
                    <li key={ex}><em>{ex}</em></li>
                  ))}
                </ul>
              </div>
            )}
          </>
        )}

        {lexicon && (
          <ul className="lexicon-list">
            {lexicon.items.map((item) => {
              const text = item.term ?? item.phrase ?? item.idiom ?? '';
              return (
                <li key={text} className="lexicon-item">
                  <span className="lexicon-term-row">
                    <strong lang="en">{text}</strong>
                    <SpeakButton text={text} label="Озвучить слово" small />
                  </span>{' '}
                  — {item.translation}
                  {item.example && (
                    <div className="lexicon-example">
                      <em lang="en">{item.example}</em>{' '}
                      <SpeakButton text={item.example} label="Озвучить пример" small />
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <div className="study-actions">
        <button
          type="button"
          className="btn btn-primary"
          disabled={done}
          onClick={() => markStudyComplete(level, studyKey(type, id))}
        >
          {done ? 'Отмечено как пройденное' : 'Отметить как пройденное'}
        </button>
        <button
          type="button"
          className="btn btn-secondary"
          onClick={() => navigate(listPath)}
        >
          {listLabel}
        </button>
        {lexicon && (
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() =>
              navigate(`/flashcards?lesson=${encodeURIComponent(`${level}|${studyKey(type, id)}`)}`)
            }
          >
            Карточки
          </button>
        )}
        {lexicon && (
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() =>
              navigate(`/${level}/game?lesson=${encodeURIComponent(`${level}|${studyKey(type, id)}`)}`)
            }
          >
            Игра
          </button>
        )}
      </div>
    </div>
  );
}
