// @vitest-environment jsdom
import { act, cleanup, fireEvent, render } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { useGallerySwipe } from './useGallerySwipe';
afterEach(() => { cleanup(); vi.useRealTimers(); vi.unstubAllGlobals(); });
it('pages on either axis, blocks camera drags only in Browse, and respects boundaries', () => {
  vi.useFakeTimers();
  const vertical = vi.fn(), horizontal = vi.fn(), camera = vi.fn();
  function Surface({ looking = false, isolated = false }: { looking?: boolean; isolated?: boolean }) {
    const swipe = useGallerySwipe(isolated ? undefined : vertical, horizontal, !looking, (_, delta) => delta > 0);
    return <div data-testid="surface" {...swipe.handlers}><canvas onPointerDown={camera} /><button>Control</button></div>;
  }
  const view = render(<Surface />);
  const surface = view.getByTestId('surface');
  surface.setPointerCapture = vi.fn(); surface.hasPointerCapture = vi.fn(() => false);
  const canvas = surface.querySelector('canvas')!;
  function pointer(type: string, x: number, y: number, target: Element = canvas) {
    const event = new Event(type, { bubbles: true });
    Object.assign(event, { pointerId: 1, clientX: x, clientY: y, isPrimary: true, pointerType: 'touch', button: 0 });
    fireEvent(target, event);
  }
  function swipe(dx: number, dy: number) {
    pointer('pointerdown', 200, 300); pointer('pointermove', 200 + dx, 300 + dy); pointer('pointerup', 200 + dx, 300 + dy);
    act(() => vi.advanceTimersByTime(200));
  }
  swipe(0, -100); expect(vertical).toHaveBeenCalledWith(1);
  swipe(-100, 0); expect(horizontal).toHaveBeenCalledWith(1);
  expect(camera).not.toHaveBeenCalled();
  swipe(0, 100); swipe(10, 10);
  expect(vertical).toHaveBeenCalledTimes(1);
  pointer('pointerdown', 200, 300); pointer('pointermove', 200, 100); pointer('pointercancel', 200, 100); pointer('pointerup', 200, 100);
  expect(vertical).toHaveBeenCalledTimes(1);
  view.rerender(<Surface isolated />); swipe(0, -100);
  expect(vertical).toHaveBeenCalledTimes(1);
  view.rerender(<Surface looking />); swipe(-100, -100);
  expect(camera).toHaveBeenCalledOnce();
  expect(horizontal).toHaveBeenCalledTimes(1);
});
it('locks the initial axis even when a drag bends', () => {
  vi.useFakeTimers();
  const vertical = vi.fn(), horizontal = vi.fn();
  function Surface() { return <div data-testid="surface" {...useGallerySwipe(vertical, horizontal).handlers} />; }
  const view = render(<Surface />), surface = view.getByTestId('surface');
  surface.setPointerCapture = vi.fn(); surface.hasPointerCapture = vi.fn(() => false);
  for (const [type, x, y] of [['pointerdown', 200, 300], ['pointermove', 100, 300], ['pointermove', 100, 100], ['pointerup', 100, 100]] as const) {
    const event = new Event(type, { bubbles: true }); Object.assign(event, { pointerId: 1, clientX: x, clientY: y, isPrimary: true, button: 0 }); fireEvent(surface, event);
  }
  act(() => vi.advanceTimersByTime(200));
  expect(horizontal).toHaveBeenCalledWith(1); expect(vertical).not.toHaveBeenCalled();
});
