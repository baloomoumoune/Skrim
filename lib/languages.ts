export type LanguageOption = {
  code: string;
  native: string;
  english: string;
};

export const LANGUAGES: LanguageOption[] = [
  { code: 'en', native: 'English',          english: 'English' },
  { code: 'fr', native: 'Français',         english: 'French' },
  { code: 'es', native: 'Español',          english: 'Spanish' },
  { code: 'pt', native: 'Português',        english: 'Portuguese' },
  { code: 'de', native: 'Deutsch',          english: 'German' },
  { code: 'it', native: 'Italiano',         english: 'Italian' },
  { code: 'ru', native: 'Русский',          english: 'Russian' },
  { code: 'pl', native: 'Polski',           english: 'Polish' },
  { code: 'tr', native: 'Türkçe',           english: 'Turkish' },
  { code: 'nl', native: 'Nederlands',       english: 'Dutch' },
  { code: 'sv', native: 'Svenska',          english: 'Swedish' },
  { code: 'no', native: 'Norsk',            english: 'Norwegian' },
  { code: 'da', native: 'Dansk',            english: 'Danish' },
  { code: 'fi', native: 'Suomi',            english: 'Finnish' },
  { code: 'cs', native: 'Čeština',          english: 'Czech' },
  { code: 'hu', native: 'Magyar',           english: 'Hungarian' },
  { code: 'ro', native: 'Română',           english: 'Romanian' },
  { code: 'el', native: 'Ελληνικά',         english: 'Greek' },
  { code: 'ar', native: 'العربية',           english: 'Arabic' },
  { code: 'he', native: 'עברית',             english: 'Hebrew' },
  { code: 'fa', native: 'فارسی',             english: 'Persian' },
  { code: 'hi', native: 'हिन्दी',                english: 'Hindi' },
  { code: 'ja', native: '日本語',            english: 'Japanese' },
  { code: 'ko', native: '한국어',            english: 'Korean' },
  { code: 'zh', native: '中文',              english: 'Chinese' },
  { code: 'th', native: 'ไทย',               english: 'Thai' },
  { code: 'vi', native: 'Tiếng Việt',        english: 'Vietnamese' },
  { code: 'id', native: 'Bahasa Indonesia',  english: 'Indonesian' },
  { code: 'ms', native: 'Bahasa Melayu',     english: 'Malay' },
  { code: 'tl', native: 'Filipino',          english: 'Filipino' },
];

export function getLanguageByCode(code: string): LanguageOption | undefined {
  return LANGUAGES.find((l) => l.code === code);
}

export function getDeviceLanguageCode(): string {
  return 'en';
}
