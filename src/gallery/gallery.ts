import lepapayer from './lepapayer.xyzdsl?raw';
import salouis from './salouis.xyzdsl?raw';
import { migrateBoxShell } from '../xyzdsl/migrateBoxShell';
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
    if (Array.isArray(stored) && stored.every(item => item && typeof item.id === 'string' && typeof item.title === 'string' && typeof item.source === 'string')) {
      const migrated = stored.map(item => ({
        ...item,
        source: item.id === 'lepapayer' ? lepapayer : migrateBoxShell(item.source),
      }));
      if (migrated.some((item, index) => item.source !== stored[index].source)) {
        try { localStorage.setItem('xyzdsl-gallery', JSON.stringify(migrated)); } catch { /* Still use the saved collection when writes are unavailable. */ }
      }
      return migrated;
    }
  } catch { /* Fall back to the bundled collection when storage is unavailable. */ }
  return INITIAL_GALLERY;
}
