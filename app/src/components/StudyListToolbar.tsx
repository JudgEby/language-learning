import { useProgressStore, useCompletedStudy } from '../store/progressStore';

interface StudyListToolbarProps {
  level: string;
  keys: string[];
}

export function StudyListToolbar({ level, keys }: StudyListToolbarProps) {
  const completedStudy = useCompletedStudy(level);
  const markStudyCompleteBulk = useProgressStore((s) => s.markStudyCompleteBulk);
  const clearStudyComplete = useProgressStore((s) => s.clearStudyComplete);

  const completedCount = keys.filter((key) => completedStudy.includes(key)).length;
  const allComplete = keys.length > 0 && completedCount === keys.length;
  const noneComplete = keys.length === 0 || completedCount === 0;

  return (
    <>
      <button
        type="button"
        className="btn btn-secondary btn-sm"
        disabled={allComplete}
        onClick={() => markStudyCompleteBulk(level, keys)}
      >
        Выделить
      </button>
      <button
        type="button"
        className="btn btn-secondary btn-sm"
        disabled={noneComplete}
        onClick={() => clearStudyComplete(level, keys)}
      >
        Убрать
      </button>
    </>
  );
}
