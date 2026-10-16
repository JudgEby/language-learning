import { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { PageHeader, Toggle } from '../components/Layout';
import { SpeechSettings } from '../components/SpeechSettings';
import { useThemeStore } from '../store/themeStore';

/**
 * Where the «Назад» link leads: the page the gear was pressed on, passed
 * via `?from=`. Anything missing or pointing back at the settings page
 * itself falls back to home, so a direct visit or a reload still has a target.
 */
function resolveBackTarget(raw: string | null): { to: string; label: string } {
  if (raw && raw.startsWith('/') && !raw.startsWith('/settings')) {
    return { to: raw, label: 'Назад' };
  }
  return { to: '/', label: 'Ко всем уровням' };
}

export function SettingsPage() {
  const [params] = useSearchParams();
  const backTarget = useMemo(() => resolveBackTarget(params.get('from')), [params]);
  const theme = useThemeStore((s) => s.theme);
  const setTheme = useThemeStore((s) => s.setTheme);

  return (
    <div className="page">
      <PageHeader title="Настройки" backTo={backTarget.to} backLabel={backTarget.label} />

      <section className="settings-section" aria-label="Тема">
        <h2>Тема</h2>
        <Toggle
          checked={theme === 'dark'}
          onChange={(checked) => setTheme(checked ? 'dark' : 'light')}
          label="Тёмная тема"
        />
      </section>

      <section className="settings-section" aria-label="Озвучка">
        <h2>Озвучка</h2>
        <SpeechSettings />
      </section>
    </div>
  );
}
