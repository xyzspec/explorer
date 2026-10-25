// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, renderHook } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { INITIAL_GALLERY, preferredViewerSource, readGallery } from './gallery';
import { createSpatialDocument } from '../model/createSpatialDocument';
import { viewPoints } from '../scene/viewPoints';
import { useViewPointTour } from '../scene/useViewPointTour';
import { useGallerySwipe } from './useGallerySwipe';
import { GalleryPanel } from './GalleryPanel';
afterEach(() => { cleanup(); localStorage.clear(); });
it('loads both complete seed documents independently with their viewpoints', () => {
  const documents = INITIAL_GALLERY.map(entry => createSpatialDocument(entry.source));
  expect(INITIAL_GALLERY.map(entry => entry.title)).toEqual(['LePapayer', 'Salouis']);
  expect(documents.map(doc => doc.diagnostics)).toEqual([[], []]);
  expect(documents.map(doc => viewPoints(doc).length)).toEqual([7, 3]);
  expect(INITIAL_GALLERY[0].source).not.toContain('salouis/');
  expect(INITIAL_GALLERY[1].source).not.toContain('lepapayer/');
});
it('uses remote sources before the local draft and supports an empty saved collection', () => {
  expect(preferredViewerSource('remote', 'draft')).toBe('remote');
  expect(preferredViewerSource('  ', 'draft')).toBe('draft');
  localStorage.setItem('xyzdsl-gallery', '[]');
  expect(readGallery()).toEqual([]);
  localStorage.setItem('xyzdsl-gallery', '[null]');
  expect(readGallery()).toEqual(INITIAL_GALLERY);
});
it('starts desktop gallery tours and resets the viewpoint on document changes', () => {
  const docs = INITIAL_GALLERY.map(entry => createSpatialDocument(entry.source));
  const { result, rerender } = renderHook(({ doc }) => useViewPointTour(doc, viewPoints(doc).length, false, false, true), { initialProps: { doc: docs[0] } });
  expect(result.current.index).toBe(0);
  act(() => result.current.traverse(1));
  expect(result.current.index).toBe(1);
  rerender({ doc: docs[1] });
  expect(result.current.index).toBe(0);
});
it('switches only from screen edges and leaves center drags to the camera', () => {
  const traverse = vi.fn();
  function Surface() { return <div data-testid="surface" {...useGallerySwipe(traverse)}><button>Control</button></div>; }
  const view = render(<Surface />);
  const surface = view.getByTestId('surface');
  surface.setPointerCapture = vi.fn();
  surface.hasPointerCapture = vi.fn(() => false);
  const cameraDown = vi.fn();
  surface.addEventListener('pointerdown', cameraDown);
  function pointer(type: string, x: number, y: number, target: Element = surface) {
    const event = new Event(type, { bubbles: true });
    Object.assign(event, { pointerId: 1, clientX: x, clientY: y, isPrimary: true, pointerType: 'touch' });
    fireEvent(target, event);
  }
  const bottom = window.innerHeight - 10;
  pointer('pointerdown', 100, bottom); pointer('pointermove', 102, bottom - 100); pointer('pointerup', 102, bottom - 100);
  expect(traverse).toHaveBeenLastCalledWith(1);
  pointer('pointerdown', 100, 10); pointer('pointerup', 100, 110);
  expect(traverse).toHaveBeenLastCalledWith(-1);
  expect(cameraDown).not.toHaveBeenCalled();
  pointer('pointerdown', 100, 300); pointer('pointermove', 100, 100); pointer('pointerup', 100, 10);
  expect(cameraDown).toHaveBeenCalledOnce();
  pointer('pointerdown', 100, 10); pointer('pointermove', 180, 20); pointer('pointerup', 180, 200);
  pointer('pointerdown', 100, 10); pointer('pointercancel', 100, 200); pointer('pointerup', 100, 200);
  pointer('pointerdown', 100, 10, view.getByText('Control')); pointer('pointerup', 100, 200);
  pointer('pointerdown', 100, 10); pointer('pointerup', 100, 30);
  expect(traverse).toHaveBeenCalledTimes(2);
});
it('opens gallery documents without offering removal', () => {
  const onOpen = vi.fn(), onChange = vi.fn();
  const view = render(<GalleryPanel documents={INITIAL_GALLERY} onOpen={onOpen} onChange={onChange} />);
  fireEvent.click(view.getByText('Salouis'));
  expect(onOpen).toHaveBeenCalledWith(1);
  expect(view.queryByLabelText(/Remove .* from gallery/)).toBeNull();
  expect(onChange).not.toHaveBeenCalled();
});
