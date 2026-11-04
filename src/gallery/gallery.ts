import lepapayer from './lepapayer.xyzdsl?raw';
import ngor from './ngor.xyzdsl?raw';
import salouis from './salouis.xyzdsl?raw';
import { migrateBoxShell } from '../xyzdsl/migrateBoxShell';
export interface GalleryDocument { id: string; title: string; source: string }
export const INITIAL_GALLERY: GalleryDocument[] = [
  { id: 'lepapayer', title: 'Ouest Foire', source: lepapayer },
  { id: 'salouis', title: 'Vauvert', source: salouis },
  { id: 'ngor', title: 'Ngor', source: ngor },
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
        title: INITIAL_GALLERY.find(entry => entry.id === item.id)?.title ?? item.title,
        source: item.id === 'lepapayer' ? lepapayer : migrateBoxShell(item.source),
      }));
      // Extend existing bundled collections while preserving empty/custom-only galleries.
      if (migrated.some(item => item.id === 'lepapayer' || item.id === 'salouis') && !migrated.some(item => item.id === 'ngor')) {
        migrated.push(INITIAL_GALLERY[2]);
      }
      if (migrated.length !== stored.length || migrated.some((item, index) => item.source !== stored[index].source || item.title !== stored[index].title)) {
        try { localStorage.setItem('xyzdsl-gallery', JSON.stringify(migrated)); } catch { /* Still use the saved collection when writes are unavailable. */ }
      }
      return migrated;
    }
  } catch { /* Fall back to the bundled collection when storage is unavailable. */ }
  return INITIAL_GALLERY;
}
