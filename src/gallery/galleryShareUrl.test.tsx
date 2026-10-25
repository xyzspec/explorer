// @vitest-environment jsdom
import { cleanup, fireEvent, render, waitFor } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { INITIAL_GALLERY } from './gallery';
import { createGalleryShareUrl, galleryHomeUrl, readGalleryLink } from './galleryShareUrl';
import { GalleryShareButton } from './GalleryShareButton';
import { createPublicKeyShareUrl } from '../transactions/publicKeyShareUrl';
afterEach(() => { cleanup(); vi.restoreAllMocks(); });
it('creates compact bundled links that work without local storage and remove conflicting keys', () => {
  const link = createGalleryShareUrl(INITIAL_GALLERY[1], 'https://example.com/viewer?pk=abc&other=yes#old');
  expect(link).toBe('https://example.com/viewer?other=yes&gallery=salouis');
  expect(readGalleryLink(link, []).document).toEqual(INITIAL_GALLERY[1]);
  expect(galleryHomeUrl(link)).toBe('https://example.com/viewer?other=yes');
});
it('roundtrips imported document names and source on a different browser', () => {
  const entry = { id: 'local-id', title: 'Maison été & 庭', source: '"Home/+0+1/+0+1/+0+1":"color: red"' };
  const link = createGalleryShareUrl(entry, 'https://example.com/subpath/');
  expect(readGalleryLink(link, [])).toEqual({ requested: true, document: entry });
  expect(galleryHomeUrl(link)).toBe('https://example.com/subpath/');
  const publicKeyLink = new URL(createPublicKeyShareUrl('abc', link)!);
  expect(publicKeyLink.searchParams.has('gallery')).toBe(false);
  expect(publicKeyLink.hash).toBe('');
});
it('rejects unknown and malformed items without choosing another document', () => {
  expect(readGalleryLink('https://example.com/?gallery=missing', INITIAL_GALLERY)).toEqual({ requested: true, document: undefined });
  expect(readGalleryLink('https://example.com/?gallery=salouis#gallery-document=invalid', INITIAL_GALLERY).document).toBeUndefined();
  expect(readGalleryLink('https://example.com/', INITIAL_GALLERY).requested).toBe(false);
});
it('copies an item link with accessible feedback', async () => {
  const writeText = vi.fn().mockResolvedValue(undefined);
  Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } });
  const view = render(<GalleryShareButton document={INITIAL_GALLERY[1]} />);
  fireEvent.click(view.getByRole('button', { name: 'Copy link to Salouis' }));
  await waitFor(() => expect(view.getByRole('status').textContent).toBe('Link copied'));
  expect(new URL(writeText.mock.calls[0][0]).searchParams.get('gallery')).toBe('salouis');
});
it('offers a selectable link when clipboard access fails', async () => {
  Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: vi.fn().mockRejectedValue(new Error('denied')) } });
  const view = render(<GalleryShareButton document={INITIAL_GALLERY[0]} />);
  fireEvent.click(view.getByRole('button', { name: 'Copy link to LePapayer' }));
  await waitFor(() => expect(view.getByLabelText('Share link for LePapayer')).toBeTruthy());
  expect(view.getByRole('status').textContent).toBe('Copy the link below');
});
