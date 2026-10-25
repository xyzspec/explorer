import { INITIAL_GALLERY, type GalleryDocument } from './gallery';

export const GALLERY_SHARE_PARAM = 'gallery';
const DOCUMENT_FRAGMENT_PARAM = 'gallery-document';

export function createGalleryShareUrl(document: GalleryDocument, href: string): string {
  const url = new URL(href);
  url.searchParams.delete('pk');
  url.searchParams.set(GALLERY_SHARE_PARAM, document.id);
  url.hash = '';
  // Imported documents exist only in this browser. Include their source so the
  // same link also works on another device, without requiring an upload service.
  const bundled = INITIAL_GALLERY.some(entry => entry.id === document.id && entry.title === document.title && entry.source === document.source);
  if (!bundled) url.hash = new URLSearchParams({ [DOCUMENT_FRAGMENT_PARAM]: JSON.stringify(document) }).toString();
  return url.toString();
}

export function readGalleryLink(href: string, documents: readonly GalleryDocument[]) {
  const url = new URL(href);
  const id = url.searchParams.get(GALLERY_SHARE_PARAM);
  if (id === null) return { requested: false, document: undefined };
  const embedded = new URLSearchParams(url.hash.slice(1)).get(DOCUMENT_FRAGMENT_PARAM);
  if (embedded !== null) {
    try {
      const value = JSON.parse(embedded);
      if (value && value.id === id && typeof value.title === 'string' && typeof value.source === 'string') {
        return { requested: true, document: value as GalleryDocument };
      }
    } catch { /* Invalid links show the unavailable state rather than another document. */ }
    return { requested: true, document: undefined };
  }
  return { requested: true, document: documents.find(entry => entry.id === id) ?? INITIAL_GALLERY.find(entry => entry.id === id) };
}

export function galleryHomeUrl(href: string): string {
  const url = new URL(href);
  url.searchParams.delete(GALLERY_SHARE_PARAM);
  url.searchParams.delete('pk');
  if (new URLSearchParams(url.hash.slice(1)).has(DOCUMENT_FRAGMENT_PARAM)) url.hash = '';
  return url.toString();
}
