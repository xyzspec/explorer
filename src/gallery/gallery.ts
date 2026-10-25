import lepapayer from './lepapayer.xyzdsl?raw';
import salouis from './salouis.xyzdsl?raw';
export interface GalleryDocument { id: string; title: string; source: string }
export const INITIAL_GALLERY: GalleryDocument[] = [
  { id: 'lepapayer', title: 'LePapayer', source: lepapayer },
  { id: 'salouis', title: 'Salouis', source: salouis },
];
export function preferredViewerSource(remoteSource: string, localDraft: string) {
  return remoteSource.trim() ? remoteSource : localDraft;
}
export function readGallery(): GalleryDocument[] {
  try {
    const stored: unknown = JSON.parse(localStorage.getItem('xyzdsl-gallery') ?? 'null');
    if (Array.isArray(stored) && stored.every(item => item && typeof item.id === 'string' && typeof item.title === 'string' && typeof item.source === 'string')) return stored;
  } catch { /* Fall back to the bundled collection when storage is unavailable. */ }
  return INITIAL_GALLERY;
}
