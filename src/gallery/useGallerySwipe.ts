import { useRef, type PointerEvent } from 'react';
export function gallerySwipeDirection(dx: number, dy: number) {
  return Math.abs(dy) >= 64 && Math.abs(dy) > Math.abs(dx) * 1.5 ? (dy < 0 ? 1 : -1) : 0;
}
export function useGallerySwipe(onTraverse?: (delta: number) => void) {
  const start = useRef<{ id: number; x: number; y: number; horizontal: boolean } | undefined>(undefined);
  return {
    onPointerDownCapture: (event: PointerEvent<HTMLDivElement>) => {
      if (!onTraverse || event.pointerType !== 'touch') return;
      if (!event.isPrimary) { start.current = undefined; return; }
      if ((event.target as HTMLElement).closest('button, input, nav, label')) return;
      start.current = { id: event.pointerId, x: event.clientX, y: event.clientY, horizontal: false };
    },
    onPointerMoveCapture: (event: PointerEvent<HTMLDivElement>) => {
      const origin = start.current;
      if (!origin || origin.id !== event.pointerId) return;
      const dx = event.clientX - origin.x, dy = event.clientY - origin.y;
      if (Math.abs(dx) > 16 && Math.abs(dx) > Math.abs(dy)) origin.horizontal = true;
    },
    onPointerUpCapture: (event: PointerEvent<HTMLDivElement>) => {
      const origin = start.current;
      start.current = undefined;
      if (!origin || origin.id !== event.pointerId || origin.horizontal) return;
      const direction = gallerySwipeDirection(event.clientX - origin.x, event.clientY - origin.y);
      if (direction) onTraverse?.(direction);
    },
    onPointerCancelCapture: () => { start.current = undefined; },
  };
}
