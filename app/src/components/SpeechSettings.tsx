import { useEffect, useState } from 'react';
import {
  getSpeechPlatform,
  loadAllVoices,
  type EnglishVoice,
  type SpeechPlatform,
} from '../lib/speech';
import { useFlashcardsStore } from '../store/flashcardsStore';

const RATES = [0.75, 1, 1.25, 1.5];

function isEnglishLang(lang: string): boolean {
  return lang.toLowerCase().startsWith('en');
}

interface VoiceInstallHelp {
  system: string;
  steps: string[];
}

/** How to get an English TTS voice on each OS (shown when none is found). */
const VOICE_HELP: Record<Exclude<SpeechPlatform, 'other'>, VoiceInstallHelp> = {
  windows: {
    system: 'Windows',
    steps: [
      'Откройте Параметры → Время и язык → Речь.',
      'В разделе «Управление голосами» нажмите «Добавить голоса» и выберите English (United States).',
      'Дождитесь установки и полностью перезапустите браузер.',
    ],
  },
  macos: {
    system: 'macOS',
    steps: [
      'Откройте Системные настройки → Универсальный доступ → Устный контент.',
      'Напротив «Голос системы» откройте «Управление голосами…» и загрузите английский голос.',
      'Перезапустите браузер и обновите страницу.',
    ],
  },
  linux: {
    system: 'Linux',
    steps: [
      'Установите синтезатор, например: sudo apt install espeak-ng speech-dispatcher.',
      'Проверьте звук командой spd-say "hello".',
      'Важно: Chrome в Linux часто не видит голоса вообще — тогда откройте приложение в Firefox.',
    ],
  },
  android: {
    system: 'Android',
    steps: [
      'Откройте Настройки → Система → Язык и ввод → Синтез речи.',
      'Выберите Google Синтез речи и в его настройках скачайте английский голос.',
      'Вернитесь в браузер и обновите страницу.',
    ],
  },
  ios: {
    system: 'iPhone / iPad',
    steps: [
      'Откройте Настройки → Универсальный доступ → Устный контент → Голоса.',
      'Скачайте английский голос (English).',
      'Вернитесь в браузер и обновите страницу.',
    ],
  },
};

const GENERIC_HELP: VoiceInstallHelp = {
  system: 'ваша система',
  steps: ['Установите английский голос синтеза речи в настройках системы и перезапустите браузер.'],
};

/**
 * Install guide for English TTS voices: steps for the current platform,
 * with other systems tucked into a nested spoiler. Used both in the
 * no-voice warning and in the always-visible collapsed guide below.
 */
function VoiceInstallGuide({ platform }: { platform: SpeechPlatform }) {
  const help = platform === 'other' ? GENERIC_HELP : VOICE_HELP[platform];
  const otherHelp = (Object.keys(VOICE_HELP) as Array<Exclude<SpeechPlatform, 'other'>>).filter(
    (key) => key !== platform,
  );
  return (
    <>
      <p>Как установить английский голос ({help.system}):</p>
      <ol>
        {help.steps.map((step) => (
          <li key={step}>{step}</li>
        ))}
      </ol>
      {otherHelp.length > 0 && (
        <details>
          <summary>Инструкции для других систем</summary>
          {otherHelp.map((key) => (
            <div key={key}>
              <p>
                <strong>{VOICE_HELP[key].system}:</strong>
              </p>
              <ol>
                {VOICE_HELP[key].steps.map((step) => (
                  <li key={step}>{step}</li>
                ))}
              </ol>
            </div>
          ))}
        </details>
      )}
    </>
  );
}

/**
 * Voice and rate settings for pronunciation. Voices come from the OS via
 * the browser; the list can arrive late (Chrome), so it loads async. When
 * the browser exposes no English voice at all, the settings say so and
 * explain how to install one instead of failing silently.
 */
export function SpeechSettings() {
  const speechRate = useFlashcardsStore((s) => s.settings.speechRate);
  const voiceURI = useFlashcardsStore((s) => s.settings.voiceURI);
  const setSpeechRate = useFlashcardsStore((s) => s.setSpeechRate);
  const setVoiceURI = useFlashcardsStore((s) => s.setVoiceURI);
  const [voices, setVoices] = useState<EnglishVoice[]>([]);
  const [voicesLoaded, setVoicesLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    loadAllVoices().then((all) => {
      if (cancelled) return;
      setVoices(all);
      setVoicesLoaded(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // getAllVoices() returns English first, so the head of the list is the
  // same voice the "auto" mode would pick.
  const english = voices.filter((v) => isEnglishLang(v.lang));
  const other = voices.filter((v) => !isEnglishLang(v.lang));
  const selectedVoiceURI = voices.some((v) => v.voiceURI === voiceURI) ? voiceURI : 'auto';
  const autoVoice = english[0] ?? null;
  const platform = getSpeechPlatform();
  const platformName = platform === 'other' ? GENERIC_HELP.system : VOICE_HELP[platform].system;

  return (
    <>
      <label className="flash-row">
        Голос озвучки
        <select
          value={selectedVoiceURI ?? 'auto'}
          onChange={(e) => setVoiceURI(e.target.value === 'auto' ? null : e.target.value)}
        >
          <option value="auto">Автоматически (английский)</option>
          {english.length > 0 && (
            <optgroup label="Английские голоса">
              {english.map((voice) => (
                <option key={voice.voiceURI} value={voice.voiceURI}>
                  {voice.name} · {voice.lang}
                </option>
              ))}
            </optgroup>
          )}
          {other.length > 0 && (
            <optgroup label="Другие голоса (будет акцент)">
              {other.map((voice) => (
                <option key={voice.voiceURI} value={voice.voiceURI}>
                  {voice.name} · {voice.lang || 'язык неизвестен'}
                </option>
              ))}
            </optgroup>
          )}
        </select>
      </label>
      {voicesLoaded && selectedVoiceURI === 'auto' && autoVoice && (
        <p className="flash-note">Сейчас используется: {autoVoice.name} · {autoVoice.lang}</p>
      )}
      {voicesLoaded && english.length === 0 && (
        <div className="flash-warning" role="note">
          <p>В браузере нет английских голосов — слышен голос по умолчанию с акцентом.</p>
          <VoiceInstallGuide platform={platform} />
        </div>
      )}
      <details className="flash-install">
        <summary>Как установить другие голоса ({platformName})</summary>
        <VoiceInstallGuide platform={platform} />
      </details>
      <label className="flash-row">
        Скорость озвучки
        <select value={speechRate} onChange={(e) => setSpeechRate(Number(e.target.value))}>
          {RATES.map((rate) => (
            <option key={rate} value={rate}>
              {rate === 1 ? 'Обычная' : `${rate}×`}
            </option>
          ))}
        </select>
      </label>
    </>
  );
}
