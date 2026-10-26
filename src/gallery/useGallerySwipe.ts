import { useEffect, useRef, useState, type CSSProperties, type PointerEvent } from 'react';

export function gallerySwipeDirection(dx: number, dy: number) {
  return Math.abs(dy) >= 64 && Math.abs(dy) > Math.abs(dx) * 1.5 ? (dy < 0 ? 1 : -1) : 0;
}
type Axis = 'x' | 'y';
export function useGallerySwipe(onVertical?: (delta: number) => void, onHorizontal?: (delta: number) => void, enabled = true, canMove: (axis: Axis, delta: number) => boolean = () => true, onInteract?: () => void, onTap?: () => void) {
  const start = useRef<{ id: number; x: number; y: number; moved: boolean; tapTarget: boolean; axis?: Axis } | undefined>(undefined);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const [offset, setOffset] = useState({ x: 0, y: 0, moving: false });
  const busy = useRef(false);
  useEffect(() => () => clearTimeout(timer.current), []);
  useEffect(() => { if (!enabled) { clearTimeout(timer.current); busy.current = false; start.current = undefined; setOffset({ x: 0, y: 0, moving: false }); } }, [enabled]);
  const reset = () => { start.current = undefined; setOffset({ x: 0, y: 0, moving: false }); };
  const handlers = {
    onPointerDownCapture: (event: PointerEvent<HTMLDivElement>) => {
      if (!enabled || busy.current || event.button !== 0 || (!onVertical && !onHorizontal && !onTap)) return;
      if (!event.isPrimary) { reset(); return; }
      onInteract?.();
      if ((event.target as HTMLElement).closest('button, input, nav, label, a')) return;
      start.current = { id: event.pointerId, x: event.clientX, y: event.clientY, moved: false, tapTarget: Boolean((event.target as HTMLElement).closest('[data-gallery-card]')) };
      event.stopPropagation();
      event.currentTarget.setPointerCapture(event.pointerId);
    },
    onPointerMoveCapture: (event: PointerEvent<HTMLDivElement>) => {
      const origin = start.current;
      if (!origin || origin.id !== event.pointerId) return;
      event.stopPropagation();
      const dx = event.clientX - origin.x, dy = event.clientY - origin.y;
      if (Math.hypot(dx, dy) > 8) origin.moved = true;
      if (!origin.axis && Math.max(Math.abs(dx), Math.abs(dy)) > 12) origin.axis = Math.abs(dx) > Math.abs(dy) * 1.2 ? 'x' : Math.abs(dy) > Math.abs(dx) * 1.2 ? 'y' : undefined;
      if (!origin.axis) return;
      const distance = origin.axis === 'x' ? dx : dy;
      const available = (origin.axis === 'x' ? onHorizontal : onVertical) && canMove(origin.axis, distance < 0 ? 1 : -1);
      const amount = available ? distance : distance * .12;
      setOffset({ x: origin.axis === 'x' ? amount : 0, y: origin.axis === 'y' ? amount : 0, moving: true });
    },
    onPointerUpCapture: (event: PointerEvent<HTMLDivElement>) => {
      const origin = start.current;
      if (!origin || origin.id !== event.pointerId) return;
      event.stopPropagation();
      start.current = undefined;
      if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
      if (!origin.moved && origin.tapTarget && Math.hypot(event.clientX - origin.x, event.clientY - origin.y) <= 8) { reset(); onTap?.(); return; }
      const distance = origin.axis === 'x' ? event.clientX - origin.x : event.clientY - origin.y;
      const delta = distance < 0 ? 1 : -1;
      const callback = origin.axis === 'x' ? onHorizontal : onVertical;
      if (!origin.axis || Math.abs(distance) < 64 || !callback || !canMove(origin.axis, delta)) { reset(); return; }
      if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) { reset(); callback(delta); return; }
      busy.current = true;
      const extent = origin.axis === 'x' ? event.currentTarget.clientWidth : event.currentTarget.clientHeight;
      setOffset({ x: origin.axis === 'x' ? -delta * extent : 0, y: origin.axis === 'y' ? -delta * extent : 0, moving: false });
      timer.current = setTimeout(() => {
        busy.current = false;
        // The new scene enters from the direction of travel, without a camera flight.
        setOffset({ x: origin.axis === 'x' ? delta * 36 : 0, y: origin.axis === 'y' ? delta * 36 : 0, moving: true });
        callback(delta);
        timer.current = setTimeout(() => setOffset({ x: 0, y: 0, moving: false }), 20);
      }, 160);
    },
    onPointerCancelCapture: reset,
    onLostPointerCapture: () => { if (start.current) reset(); },
  };
  const style: CSSProperties = { transform: `translate3d(${offset.x}px, ${offset.y}px, 0)`, transition: offset.moving ? 'none' : 'transform 160ms ease-out' };
  return { handlers, style };
}
