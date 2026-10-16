import { useEffect, useState } from 'react';
import { registerSW } from 'virtual:pwa-register';

/**
 * Update prompt for the PWA service worker (`registerType: 'prompt'`).
 * The worker waits until the learner confirms, so a new build never reloads
 * the page in the middle of a test or a game session.
 */
export function PwaUpdatePrompt() {
  const [update, setUpdate] = useState<(() => Promise<void>) | null>(null);

  useEffect(() => {
    const updateSW = registerSW({
      onNeedRefresh() {
        setUpdate(() => () => updateSW(true));
      },
    });
  }, []);

  if (!update) return null;

  return (
    <div className="pwa-prompt" role="status">
      <span>Доступно обновление</span>
      <button type="button" className="btn btn-sm" onClick={() => void update()}>
        Обновить
      </button>
      <button
        type="button"
        className="btn btn-sm btn-secondary"
        onClick={() => setUpdate(null)}
      >
        Позже
      </button>
    </div>
  );
}
