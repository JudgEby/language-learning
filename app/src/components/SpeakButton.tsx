import { useEffect, type MouseEvent } from 'react';
import { isSpeechSupported, loadEnglishVoices, speakEn } from '../lib/speech';
import { useFlashcardsStore } from '../store/flashcardsStore';

interface SpeakButtonProps {
  /** English text to speak (term, phrase, idiom, or example sentence). */
  text: string;
  /** Accessible name, e.g. "Озвучить слово" or "Озвучить пример". */
  label: string;
  small?: boolean;
}

/**
 * Pronunciation button backed by OS-native speech synthesis. Reads the
 * persisted voice/rate from the flashcards settings so cards and lexicon
 * lists share one preference. Renders nothing for empty text; degrades
 * to a disabled button where the Web Speech API is missing.
 */
export function SpeakButton({ text, label, small = false }: SpeakButtonProps) {
  const voiceURI = useFlashcardsStore((s) => s.settings.voiceURI);
  const speechRate = useFlashcardsStore((s) => s.settings.speechRate);

  // Warm up the browser's voice cache (Chrome loads it asynchronously), so
  // the first press already has English voices and never falls back to the
  // browser-locale default voice.
  useEffect(() => {
    void loadEnglishVoices();
  }, []);

  if (!text.trim()) return null;
  const supported = isSpeechSupported();

  function handleClick(event: MouseEvent<HTMLButtonElement>): void {
    event.stopPropagation();
    void speakEn(text, { voiceURI, rate: speechRate });
  }

  return (
    <button
      type="button"
      className={`speak-btn${small ? ' speak-btn--sm' : ''}`}
      aria-label={label}
      title={supported ? `${label} (голос устройства)` : 'Озвучка не поддерживается в этом браузере'}
      disabled={!supported}
      onClick={handleClick}
    >
      <span aria-hidden="true">🔊</span>
    </button>
  );
}
