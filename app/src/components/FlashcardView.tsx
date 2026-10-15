import type { Flashcard } from '../lib/flashcards';
import type { FlashGrade } from '../lib/srs';

interface FlashcardViewProps {
  card: Flashcard;
  flipped: boolean;
  revealed: boolean;
  showExample: boolean;
  onReveal: () => void;
  onGrade: (grade: FlashGrade) => void;
}

const GRADES: Array<{ grade: FlashGrade; label: string; hint: string }> = [
  { grade: 'again', label: 'Снова', hint: 'не вспомнил' },
  { grade: 'hard', label: 'Трудно', hint: 'вспомнил с трудом' },
  { grade: 'good', label: 'Хорошо', hint: 'вспомнил' },
  { grade: 'easy', label: 'Легко', hint: 'сразу вспомнил' },
];

export function FlashcardView({
  card,
  flipped,
  revealed,
  showExample,
  onReveal,
  onGrade,
}: FlashcardViewProps) {
  const front = flipped ? card.backRu : card.frontEn;
  const back = flipped ? card.frontEn : card.backRu;

  return (
    <div className="flash-session">
      <p className="flash-meta">
        {card.level} · {card.lessonTitle}
      </p>
      <div className="flash-card" lang={flipped ? 'ru' : 'en'}>
        <p className="flash-front">{front}</p>
        <div
          className={`flash-back${revealed ? '' : ' flash-back--covered'}`}
          aria-hidden={!revealed}
        >
          <p className="flash-answer">{back}</p>
          {showExample && card.example && (
            <p className="flash-example">
              <em>{card.example}</em>
            </p>
          )}
          {card.keyword && card.mnemonic && (
            <div className="flash-mnemonic">
              <p>
                <strong>Созвучие:</strong> {card.keyword}
              </p>
              <p>{card.mnemonic}</p>
            </div>
          )}
        </div>
      </div>
      {!revealed ? (
        <button type="button" className="btn btn-primary" onClick={onReveal}>
          Показать ответ
        </button>
      ) : (
        <div className="flash-grades" role="group" aria-label="Оценка запоминания">
          {GRADES.map(({ grade, label, hint }) => (
            <button
              key={grade}
              type="button"
              className={`btn flash-grade flash-grade--${grade}`}
              title={hint}
              onClick={() => onGrade(grade)}
            >
              {label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
