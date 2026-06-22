import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import { PageHeader } from '../components/Layout';
import { loadRulesForIds, loadTestDay } from '../lib/loadContent';
import type { Rule, TestQuestion } from '../lib/types';
import { useProgressStore } from '../store/progressStore';

export function TestViewPage() {
  const { level = '', dayId = '', questionIndex = '0' } = useParams();
  const navigate = useNavigate();
  const qIndex = parseInt(questionIndex, 10);

  const [questions, setQuestions] = useState<TestQuestion[]>([]);
  const [rules, setRules] = useState<Rule[]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [showRules, setShowRules] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const markTestComplete = useProgressStore((s) => s.markTestComplete);

  const question = questions[qIndex];

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const data = await loadTestDay(level, dayId);
        if (!cancelled) setQuestions(data);
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

  useEffect(() => {
    setSelected(null);
    setConfirmed(false);
    setShowRules(false);
  }, [qIndex, dayId]);

  useEffect(() => {
    if (!question) return;
    loadRulesForIds(level, question.relatedRuleIds).then(setRules);
  }, [level, question]);

  if (loading) return <p className="status">Загрузка...</p>;
  if (error) return <p className="status error">{error}</p>;
  if (!question) return <p className="status error">Вопрос не найден</p>;

  const isCorrect = selected === question.correctIndex;

  function handleConfirm() {
    if (selected === null) return;
    setConfirmed(true);
    markTestComplete(level, question.id);
  }

  function handleContinue() {
    if (qIndex + 1 < questions.length) {
      navigate(`/${level}/tests/${dayId}/${qIndex + 1}`);
    } else {
      navigate(`/${level}/tests`);
    }
  }

  function optionClass(i: number): string {
    const base = 'option-btn';
    if (!confirmed) {
      return selected === i ? `${base} selected` : base;
    }
    if (i === question.correctIndex) return `${base} correct`;
    if (i === selected && i !== question.correctIndex) return `${base} incorrect`;
    return base;
  }

  return (
    <div className="page">
      <PageHeader
        title={`Вопрос ${qIndex + 1} из ${questions.length}`}
        backTo={`/${level}/tests`}
        backLabel="К списку"
      />

      <div className="test-layout">
        <div className="test-main">
          <p className="test-question">{question.question}</p>
          <div className="options">
            {question.options.map((opt, i) => (
              <button
                key={opt}
                type="button"
                className={optionClass(i)}
                disabled={confirmed}
                onClick={() => setSelected(i)}
              >
                {opt}
              </button>
            ))}
          </div>

          {!confirmed ? (
            <button
              type="button"
              className="btn btn-primary"
              disabled={selected === null}
              onClick={handleConfirm}
            >
              Подтвердить выбор
            </button>
          ) : (
            <div className="test-feedback">
              <p className={isCorrect ? 'feedback correct-text' : 'feedback incorrect-text'}>
                {isCorrect ? 'Верно!' : 'Неверно.'}
              </p>
              <p className="explanation">{question.explanation}</p>
              <button type="button" className="btn btn-primary" onClick={handleContinue}>
                Продолжить
              </button>
            </div>
          )}
        </div>

        <aside className="test-sidebar">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => setShowRules((v) => !v)}
          >
            Правила
          </button>
          {showRules && (
            <div className="rules-panel">
              {rules.length === 0 ? (
                <p className="status">Нет связанных правил.</p>
              ) : (
                rules.map((rule) => (
                  <div key={rule.id} className="rule-panel-item">
                    <h3>{rule.title}</h3>
                    <ReactMarkdown>{rule.contentMd}</ReactMarkdown>
                  </div>
                ))
              )}
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
