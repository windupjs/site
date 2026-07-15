import en from './ui/en';
import pt from './ui/pt';
import es from './ui/es';
import zh from './ui/zh';

export const LOCALES = ['en', 'pt', 'es', 'zh'] as const;
export type Lang = (typeof LOCALES)[number];
const PREFIXED = ['pt', 'es', 'zh'] as const;

export const LANGUAGES: { code: Lang; label: string; short: string }[] = [
  { code: 'en', label: 'English', short: 'EN' },
  { code: 'pt', label: 'Português', short: 'PT' },
  { code: 'es', label: 'Español', short: 'ES' },
  { code: 'zh', label: '中文', short: '中文' },
];

const HTML_LANG: Record<Lang, string> = { en: 'en', pt: 'pt-BR', es: 'es', zh: 'zh-Hans' };
export const htmlLang = (l: Lang): string => HTML_LANG[l];

const UI = { en, pt, es, zh };
export type Ui = typeof en;
export function getUi(lang: Lang): Ui {
  return (UI[lang] as Ui) ?? UI.en;
}

/** Locale from the URL path (first segment). Default locale (en) has no prefix. */
export function getLangFromUrl(url: URL): Lang {
  const seg = url.pathname.split('/').filter(Boolean)[0];
  return (PREFIXED as readonly string[]).includes(seg) ? (seg as Lang) : 'en';
}

/** Drop a leading locale segment, returning the bare (en-style) path. */
export function stripLocale(pathname: string): string {
  const parts = pathname.split('/');
  if (parts[1] && (PREFIXED as readonly string[]).includes(parts[1])) parts.splice(1, 1);
  const p = parts.join('/');
  return p === '' ? '/' : p;
}

/** Build a path for a locale. en → no prefix; others → /<lang>/… */
export function localizedPath(lang: Lang, bare: string): string {
  const clean = bare.startsWith('/') ? bare : '/' + bare;
  if (lang === 'en') return clean;
  return clean === '/' ? '/' + lang : '/' + lang + clean;
}

/** Same page in a target locale (used by the language switcher). */
export function switchLocalePath(url: URL, target: Lang): string {
  return localizedPath(target, stripLocale(url.pathname));
}
