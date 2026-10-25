// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { useState } from 'react';
import { getLocale, initializeLocale, LANGUAGE_STORAGE_KEY, readLocale, setLocale, t, useLocale } from './index';
import { LanguageMenu } from '../ui/LanguageMenu';
import { GalleryShareButton } from '../gallery/GalleryShareButton';

beforeEach(() => { localStorage.clear(); setLocale('fr'); localStorage.clear(); });
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

it('defaults to French and rejects unsupported saved preferences', () => {
  expect(readLocale()).toBe('fr');
  localStorage.setItem(LANGUAGE_STORAGE_KEY, 'de');
  expect(readLocale()).toBe('fr');
  const dispose = initializeLocale();
  expect(document.documentElement.lang).toBe('fr');
  dispose();
});

it('switches the live UI without losing edits and restores the preference on a subsequent visit', () => {
  function Editor() {
    useLocale();
    const [draft, setDraft] = useState('');
    return <><LanguageMenu /><label>{t('Source')}<input value={draft} onChange={event => setDraft(event.target.value)} /></label><p>{t('Gallery')}</p></>;
  }
  render(<Editor />);
  expect(screen.getByText('Galerie')).toBeDefined();
  fireEvent.change(screen.getByRole('textbox'), { target: { value: 'unsaved draft' } });
  fireEvent.change(screen.getByRole('combobox', { name: 'Langue' }), { target: { value: 'en' } });
  expect(screen.getByText('Gallery')).toBeDefined();
  expect((screen.getByRole('textbox') as HTMLInputElement).value).toBe('unsaved draft');
  expect(document.documentElement.lang).toBe('en');
  expect(localStorage.getItem(LANGUAGE_STORAGE_KEY)).toBe('en');
  cleanup();
  const dispose = initializeLocale();
  render(<LanguageMenu />);
  expect((screen.getByRole('combobox', { name: 'Language' }) as HTMLSelectElement).value).toBe('en');
  fireEvent.change(screen.getByRole('combobox'), { target: { value: 'fr' } });
  expect(readLocale()).toBe('fr');
  expect(document.documentElement.lang).toBe('fr');
  dispose();
});

it('remains usable when browser storage is blocked', () => {
  vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('Blocked'); });
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('Blocked'); });
  expect(readLocale()).toBe('fr');
  render(<LanguageMenu />);
  fireEvent.change(screen.getByRole('combobox'), { target: { value: 'en' } });
  expect(getLocale()).toBe('en');
  expect(screen.getByRole('combobox', { name: 'Language' })).toBeDefined();
});

it('synchronizes language changes and cleared preferences from another tab', () => {
  const dispose = initializeLocale();
  render(<LanguageMenu />);
  act(() => {
    localStorage.setItem(LANGUAGE_STORAGE_KEY, 'en');
    window.dispatchEvent(new StorageEvent('storage', { key: LANGUAGE_STORAGE_KEY }));
  });
  expect(screen.getByRole('combobox', { name: 'Language' })).toBeDefined();
  act(() => {
    localStorage.clear();
    window.dispatchEvent(new StorageEvent('storage', { key: null }));
  });
  expect(screen.getByRole('combobox', { name: 'Langue' })).toBeDefined();
  dispose();
});

it('translates dynamic accessible labels while preserving document titles', () => {
  render(<GalleryShareButton document={{ id: 'custom', title: 'My untouched title', source: '' }} />);
  expect(screen.getByRole('button', { name: 'Copier le lien vers My untouched title' })).toBeDefined();
  act(() => setLocale('en'));
  expect(screen.getByRole('button', { name: 'Copy link to My untouched title' })).toBeDefined();
  expect(t('Untranslated external diagnostic')).toBe('Untranslated external diagnostic');
});
