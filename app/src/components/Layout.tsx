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
}

export function PageHeader({ title, backTo, backLabel }: PageHeaderProps) {
  return (
    <header className="page-header">
      {backTo && backLabel && <BackLink to={backTo} label={backLabel} />}
      <h1>{title}</h1>
    </header>
  );
}

interface CheckMarkProps {
  done: boolean;
}

export function CheckMark({ done }: CheckMarkProps) {
  if (!done) return null;
  return <span className="check-mark" aria-label="пройдено">✓</span>;
}
