import { useEffect } from 'react';
import { createPortal } from 'react-dom';

export type FeedbackKind = 'success' | 'error';

export interface FeedbackSignal {
  kind: FeedbackKind;
  /** True when the player took damage — the screen shakes on top of the glow. */
  shake: boolean;
  /** Monotonic id; used as a React key so the CSS animation restarts. */
  id: number;
}

interface ScreenFeedbackProps {
  signal: FeedbackSignal | null;
  onDone: () => void;
}

/**
 * Full-screen answer feedback: a short rotating edge glow (green for correct,
 * red for wrong) plus an optional screen shake on damage. Pure CSS,
 * pointer-transparent, and hidden from assistive tech — the textual
 * «Верно!»/«Неверно.» feedback stays the source of truth.
 *
 * The overlay is portalled to `document.body`, outside the shaken `.app-shell`:
 * a `transform` on an ancestor would re-base `position: fixed` to that
 * ancestor, making the frame hug the content column instead of the viewport.
 */
export function ScreenFeedback({ signal, onDone }: ScreenFeedbackProps) {
  useEffect(() => {
    if (!signal) return;
    const timer = window.setTimeout(onDone, 950);
    return () => window.clearTimeout(timer);
  }, [signal, onDone]);

  useEffect(() => {
    if (!signal?.shake) return;
    const shell = document.querySelector('.app-shell');
    if (!shell) return;
    shell.classList.remove('app-shell--shake');
    void shell.getBoundingClientRect();
    shell.classList.add('app-shell--shake');
    const timer = window.setTimeout(() => shell.classList.remove('app-shell--shake'), 500);
    return () => {
      window.clearTimeout(timer);
      shell.classList.remove('app-shell--shake');
    };
  }, [signal]);

  if (!signal) return null;
  return createPortal(
    <div
      key={signal.id}
      aria-hidden="true"
      className={`screen-feedback screen-feedback--${signal.kind}`}
    />,
    document.body,
  );
}
