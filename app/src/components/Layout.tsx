import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';

interface BackLinkProps {
  to: string;
  label: string;
}

export function BackLink({ to, label }: BackLinkProps) {
  return (
    <Link to={to} className="back-link">
      ← {label}
    </Link>
  );
}

interface PageHeaderProps {
  title: string;
  backTo?: string;
  backLabel?: string;
  actions?: ReactNode;
}

export function PageHeader({ title, backTo, backLabel, actions }: PageHeaderProps) {
  return (
    <header className="page-header">
      {backTo && backLabel && <BackLink to={backTo} label={backLabel} />}
      <div className="page-header__row">
        <h1>{title}</h1>
        {actions && <div className="page-header__actions">{actions}</div>}
      </div>
    </header>
  );
}

interface CheckMarkProps {
  done: boolean;
  onChange?: (done: boolean) => void;
}

function CheckIcon() {
  return (
    <svg className="check-icon" viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M20 6L9 17l-5-5"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function CheckMark({ done, onChange }: CheckMarkProps) {
  if (!onChange) {
    if (!done) return null;
    return (
      <span className="check-mark" aria-label="пройдено">
        <CheckIcon />
      </span>
    );
  }

  return (
    <label
      className={`study-checkbox${done ? ' study-checkbox--done' : ''}`}
      onClick={(e) => e.stopPropagation()}
    >
      <input
        type="checkbox"
        className="study-checkbox__input"
        checked={done}
        onChange={(e) => {
          e.stopPropagation();
          onChange(e.target.checked);
        }}
        aria-label={done ? 'Пройдено' : 'Не пройдено'}
      />
      <span className="study-checkbox__icon" aria-hidden="true">
        <CheckIcon />
      </span>
    </label>
  );
}
