import { setLocale, t, useLocale, type Locale } from '../i18n';

/** A native select keeps the compact language menu keyboard and touch accessible. */
export function LanguageMenu() {
  const locale = useLocale();
  return <label className="language-menu" title={t('Language')}>
    <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <circle cx="12" cy="12" r="9" /><ellipse cx="12" cy="12" rx="4" ry="9" /><path d="M3 12h18M5 7h14M5 17h14" />
    </svg>
    <span aria-hidden="true">{locale.toUpperCase()}</span>
    <select aria-label={t('Language')} value={locale} onChange={event => setLocale(event.target.value as Locale)}>
      <option value="fr" lang="fr">Français</option>
      <option value="en" lang="en">English</option>
    </select>
  </label>;
}
