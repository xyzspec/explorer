import { useEffect, useState } from 'react';
import { t, useLocale } from '../i18n';
import type { SpatialNode } from '../model/SpatialNode';
const HINT_KEY = 'xyzdsl-feed-hint-seen';
export function markFeedHintSeen() { try { sessionStorage.setItem(HINT_KEY, '1'); } catch { /* Optional preference. */ } }
export function viewpointLabel(point: SpatialNode, index: number) {
  const name = point.namespacePath?.split('/').filter(Boolean).pop()?.replace(/^POV\+/, '');
  return name && !/^\d+$/.test(name) ? name : t('View point {number}', { number: index + 1 });
}
export function GalleryPager({ points, index, looking, onLookingChange, onSelect, canHint, ready, interacted }: {
  points: SpatialNode[]; index?: number; looking: boolean; onLookingChange: (value: boolean) => void;
  onSelect: (index: number) => void; canHint: boolean; ready: boolean; interacted: boolean;
}) {
  useLocale();
  const [hint, setHint] = useState(false);
  useEffect(() => {
    if (!canHint || !ready || interacted || looking) { setHint(false); return; }
    try { if (sessionStorage.getItem(HINT_KEY)) return; } catch { /* Optional session preference. */ }
    const show = setTimeout(() => {
      setHint(true);
      try { sessionStorage.setItem(HINT_KEY, '1'); } catch { /* Optional session preference. */ }
    }, 900);
    const hide = setTimeout(() => setHint(false), 4500);
    return () => { clearTimeout(show); clearTimeout(hide); };
  }, [canHint, ready, interacted, looking]);
  const current = index ?? 0;
  const first = Math.max(0, Math.min(current - 3, points.length - 7));
  return <div className="gallery-pager">
    {hint && <div className="gallery-swipe-hint" role="status"><span aria-hidden="true">↑</span>{t('Swipe up for the next space')}</div>}
    <button type="button" className={`gallery-look ${looking ? 'is-active' : ''}`} aria-pressed={looking} onClick={() => onLookingChange(!looking)}>{looking ? t('Done') : t('Look around')}</button>
    <small className="gallery-mode-hint">{looking ? t('Drag to look around') : points.length > 1 ? t('Swipe sideways for viewpoints') : ''}</small>
    {index !== undefined && <strong aria-live="polite">{viewpointLabel(points[current], current)}</strong>}
    {points.length > 1 && <nav aria-label={t('View point traversal')} className="gallery-pagination">
      <button type="button" aria-label={t('Previous view point')} disabled={current === 0} onClick={() => onSelect(current - 1)}>‹</button>
      {points.slice(first, first + 7).map((point, offset) => <button type="button" key={point.id} className="gallery-dot" aria-label={t('Go to {name}, {current} of {total}', { name: viewpointLabel(point, first + offset), current: first + offset + 1, total: points.length })} aria-current={current === first + offset ? 'step' : undefined} onClick={() => onSelect(first + offset)}><span /></button>)}
      <button type="button" aria-label={t('Next view point')} disabled={current === points.length - 1} onClick={() => onSelect(current + 1)}>›</button>
    </nav>}
    {points.length > 7 && <small>{current + 1} / {points.length}</small>}
  </div>;
}
