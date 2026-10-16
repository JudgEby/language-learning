/**
 * Pronunciation playback via the browser's built-in speech synthesis
 * (Web Speech API). The browser speaks with OS-native voices — Windows
 * (SAPI/OneCore), macOS (AVFoundation), Android (Google TTS), Linux
 * (speech-dispatcher/eSpeak) — so no audio files, servers, or network
 * calls are needed. Synthesis is local and works offline.
 */

export interface EnglishVoice {
  voiceURI: string;
  name: string;
  lang: string;
  /** True for OS-installed voices; network voices (e.g. Chrome's "Google US
   *  English") need connectivity and are deprioritised. */
  localService: boolean;
}

export interface SpeakOptions {
  /** Voice selected in settings; null means "pick the best English voice". */
  voiceURI?: string | null;
  /** Playback rate multiplier; clamped to 0.5–2. */
  rate?: number;
}

export function isSpeechSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    'speechSynthesis' in window &&
    typeof SpeechSynthesisUtterance !== 'undefined'
  );
}

export type SpeechPlatform = 'windows' | 'macos' | 'linux' | 'android' | 'ios' | 'other';

/**
 * Best-effort platform detection for platform-specific voice-install
 * hints. Uses `userAgentData.platform` when available, falls back to
 * `navigator.platform` and the user-agent string. Never throws.
 */
export function getSpeechPlatform(): SpeechPlatform {
  try {
    if (typeof navigator === 'undefined') return 'other';
    const nav = navigator as Navigator & { userAgentData?: { platform?: string }; platform?: string };
    const platform = (nav.userAgentData?.platform ?? nav.platform ?? '').toLowerCase();
    const ua = navigator.userAgent.toLowerCase();
    if (platform.includes('android') || ua.includes('android')) return 'android';
    if (
      platform.includes('iphone') ||
      platform.includes('ipad') ||
      platform.includes('ipod') ||
      /iphone|ipad|ipod/.test(ua) ||
      // iPad in desktop mode reports "Macintosh" but has a touchscreen.
      (platform.includes('mac') && navigator.maxTouchPoints > 1)
    ) {
      return 'ios';
    }
    if (platform.includes('mac') || ua.includes('macintosh') || ua.includes('mac os')) {
      return 'macos';
    }
    if (platform.includes('win') || ua.includes('windows')) return 'windows';
    if (platform.includes('linux') || ua.includes('linux')) return 'linux';
    return 'other';
  } catch {
    return 'other';
  }
}

interface VoiceLike {
  lang: string;
  name: string;
  localService: boolean;
}

function rankLang(lang: string): number {
  const normalized = lang.toLowerCase().replace('_', '-');
  if (normalized === 'en-us') return 0;
  if (normalized === 'en-gb') return 1;
  if (normalized.startsWith('en')) return 2;
  return 3;
}

/** Offline OS voices first, then en-US → en-GB → other English, then by name. */
function compareEnglishVoices(a: VoiceLike, b: VoiceLike): number {
  if (a.localService !== b.localService) return a.localService ? -1 : 1;
  const rank = rankLang(a.lang) - rankLang(b.lang);
  if (rank !== 0) return rank;
  return a.name.localeCompare(b.name);
}

function toEnglishVoice(voice: SpeechSynthesisVoice): EnglishVoice {
  return {
    voiceURI: voice.voiceURI,
    name: voice.name,
    lang: voice.lang,
    localService: voice.localService,
  };
}

function isEnglish(lang: string): boolean {
  return lang.toLowerCase().startsWith('en');
}

/**
 * Synchronously read the voices cached by the browser. Chrome loads them
 * asynchronously, so this can be empty on first call — use
 * loadEnglishVoices() for a reliable list.
 */
export function getEnglishVoices(): EnglishVoice[] {
  if (!isSpeechSupported()) return [];
  return window.speechSynthesis
    .getVoices()
    .map(toEnglishVoice)
    .filter((v) => isEnglish(v.lang))
    .sort(compareEnglishVoices);
}

/**
 * All browser voices, English first (same order as `getEnglishVoices`),
 * then the rest by language and name. Used for settings and diagnostics:
 * when no English voice is installed, the user can at least see what the
 * browser exposes.
 */
export function getAllVoices(): EnglishVoice[] {
  if (!isSpeechSupported()) return [];
  const all = window.speechSynthesis.getVoices().map(toEnglishVoice);
  const english = all.filter((v) => isEnglish(v.lang)).sort(compareEnglishVoices);
  const rest = all
    .filter((v) => !isEnglish(v.lang))
    .sort((a, b) => a.lang.localeCompare(b.lang) || a.name.localeCompare(b.name));
  return [...english, ...rest];
}

/** Wait until the browser has loaded its voice list (bounded, never rejects). */
function waitForVoices(timeoutMs: number): Promise<void> {
  if (!isSpeechSupported()) return Promise.resolve();
  if (window.speechSynthesis.getVoices().length > 0) return Promise.resolve();
  return new Promise((resolve) => {
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      window.speechSynthesis.onvoiceschanged = null;
      resolve();
    };
    const timer = window.setTimeout(finish, timeoutMs);
    window.speechSynthesis.onvoiceschanged = () => {
      window.clearTimeout(timer);
      finish();
    };
  });
}

/**
 * Resolve once English voices are available. Chrome fires
 * `voiceschanged` asynchronously; other browsers usually have the list
 * immediately. Never rejects — falls back to whatever is cached, which
 * may be an empty list when the browser has no English voice at all.
 */
export async function loadEnglishVoices(timeoutMs = 1500): Promise<EnglishVoice[]> {
  await waitForVoices(timeoutMs);
  return getEnglishVoices();
}

/** Same as `loadEnglishVoices`, but resolves with every voice the browser has. */
export async function loadAllVoices(timeoutMs = 1500): Promise<EnglishVoice[]> {
  await waitForVoices(timeoutMs);
  return getAllVoices();
}

/**
 * Re-run the callback whenever the browser's voice list changes.
 * Returns an unsubscribe function.
 */
export function subscribeEnglishVoices(callback: (voices: EnglishVoice[]) => void): () => void {
  if (!isSpeechSupported()) return () => undefined;
  callback(getEnglishVoices());
  const handler = () => callback(getEnglishVoices());
  window.speechSynthesis.addEventListener('voiceschanged', handler);
  return () => window.speechSynthesis.removeEventListener('voiceschanged', handler);
}

function clampRate(rate: number | undefined): number {
  if (typeof rate !== 'number' || Number.isNaN(rate)) return 1;
  return Math.min(2, Math.max(0.5, rate));
}

/**
 * Speak English text with an OS-native voice. Awaits the browser's voice
 * list first (bounded): speaking without a voice lets Chrome fall back to
 * the browser-locale default — e.g. a Russian voice reading English text.
 * Only English voices are ever assigned; when none exists the utterance
 * keeps `lang: en-US` and the browser does its best. Never throws and
 * never rejects, so a missing voice must not break the study session.
 */
export async function speakEn(text: string, options: SpeakOptions = {}): Promise<boolean> {
  if (!isSpeechSupported()) return false;
  const trimmed = text.trim();
  if (!trimmed) return false;
  try {
    await loadEnglishVoices();
    // Re-read the live list: the records above are snapshots, while
    // utterance.voice needs the live SpeechSynthesisVoice object.
    const live = window.speechSynthesis.getVoices();
    // An explicitly chosen voice is honoured as-is (even non-English —
    // it is the user's conscious choice). The automatic pick is
    // English-only and prefers offline OS voices.
    const explicit = options.voiceURI
      ? live.find((v) => v.voiceURI === options.voiceURI)
      : undefined;
    const english = live.filter((v) => isEnglish(v.lang)).sort(compareEnglishVoices);
    const match = explicit ?? english[0];
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(trimmed);
    utterance.rate = clampRate(options.rate);
    if (match) {
      utterance.voice = match;
      utterance.lang = match.lang;
    } else {
      utterance.lang = 'en-US';
    }
    window.speechSynthesis.speak(utterance);
    return true;
  } catch {
    return false;
  }
}

/** Stop any ongoing speech. Safe to call when unsupported. */
export function cancelSpeech(): void {
  if (!isSpeechSupported()) return;
  try {
    window.speechSynthesis.cancel();
  } catch {
    // Speech must never break the study session.
  }
}
