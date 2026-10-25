import { useRef, type PointerEvent } from 'react';

// Only gestures beginning in these screen-edge strips belong to the gallery.
export const GALLERY_SWIPE_EDGE_PX = 48;
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
      if (event.clientY > GALLERY_SWIPE_EDGE_PX && event.clientY < window.innerHeight - GALLERY_SWIPE_EDGE_PX) return;
      start.current = { id: event.pointerId, x: event.clientX, y: event.clientY, horizontal: false };
      // Prevent the canvas controls from starting a camera drag for this gesture.
      event.stopPropagation();
      event.currentTarget.setPointerCapture(event.pointerId);
    },
    onPointerMoveCapture: (event: PointerEvent<HTMLDivElement>) => {
      const origin = start.current;
      if (!origin || origin.id !== event.pointerId) return;
      event.stopPropagation();
      const dx = event.clientX - origin.x, dy = event.clientY - origin.y;
      if (Math.abs(dx) > 16 && Math.abs(dx) > Math.abs(dy)) origin.horizontal = true;
    },
    onPointerUpCapture: (event: PointerEvent<HTMLDivElement>) => {
      const origin = start.current;
      if (!origin || origin.id !== event.pointerId) return;
      start.current = undefined;
      event.stopPropagation();
      if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
      if (origin.horizontal) return;
      const direction = gallerySwipeDirection(event.clientX - origin.x, event.clientY - origin.y);
      if (direction) onTraverse?.(direction);
    },
    onPointerCancelCapture: () => { start.current = undefined; },
  };
}
