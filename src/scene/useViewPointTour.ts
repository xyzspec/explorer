import { useCallback, useState } from 'react';
import type { SpatialDocument } from '../model/SpatialDocument';

export function useViewPointTour(document: SpatialDocument, count: number, mobile: boolean, editorMode: boolean, forceTour = false, initialIndex = 0, onIndexChange?: (index: number) => void) {
  const [tour, setTour] = useState<{ document: SpatialDocument; index: number; orbitTarget?: [number, number, number] }>();
  const forced = (mobile || forceTour) && !editorMode && count > 0;
  const current = tour?.document === document ? tour : undefined;
  const index = count > 0 && (forced || (!mobile && current)) ? Math.min(current?.index ?? initialIndex, count - 1) : undefined;
  const start = useCallback((orbitTarget?: [number, number, number]) => setTour({ document, index: 0, orbitTarget }), [document]);
  const select = useCallback((next: number) => {
    if (!count) return;
    const selected = Math.max(0, Math.min(count - 1, next));
    setTour({ document, index: selected, orbitTarget: current?.orbitTarget });
    onIndexChange?.(selected);
  }, [document, count, current?.orbitTarget, onIndexChange]);
  const traverse = useCallback((delta: number) => {
    if (!count || index === undefined) return;
    select(forceTour ? index + delta : ((index + delta) % count + count) % count);
  }, [count, index, select, forceTour]);
  const exit = useCallback(() => { if (!mobile && !forceTour) setTour(undefined); }, [mobile, forceTour]);
  return { index, select, start, traverse, exit: mobile || forceTour ? undefined : exit, orbitTarget: current?.orbitTarget };
}
