import type { Flashcard } from '../lib/flashcards';
import type { FlashGrade } from '../lib/srs';
import { SpeakButton } from './SpeakButton';

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
  // Exactly one side is English: the pronunciation button always speaks
  // card.frontEn, wherever it is currently shown.
  const frontIsEnglish = !flipped;
  const backIsEnglish = flipped;

  return (
    <div className="flash-session">
      <p className="flash-meta">
        {card.level} · {card.lessonTitle}
      </p>
      <div className="flash-card" lang={flipped ? 'ru' : 'en'}>
        <p className="flash-front">
          <span className="flash-front-row">
            <span lang={flipped ? 'ru' : 'en'}>{front}</span>
            {frontIsEnglish && <SpeakButton text={card.frontEn} label="Озвучить слово" />}
          </span>
        </p>
        <div
          className={`flash-back${revealed ? '' : ' flash-back--covered'}`}
          aria-hidden={!revealed}
        >
          <p className="flash-answer">
            <span className="flash-answer-row">
              <span lang={flipped ? 'en' : 'ru'}>{back}</span>
              {backIsEnglish && <SpeakButton text={card.frontEn} label="Озвучить слово" small />}
            </span>
          </p>
          {showExample && card.example && (
            <p className="flash-example">
              <em lang="en">{card.example}</em>{' '}
              <SpeakButton text={card.example} label="Озвучить пример" small />
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
