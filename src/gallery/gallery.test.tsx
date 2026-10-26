// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, renderHook } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { INITIAL_GALLERY, preferredViewerSource, readGallery } from './gallery';
import { createSpatialDocument } from '../model/createSpatialDocument';
import { viewPoints } from '../scene/viewPoints';
import { useViewPointTour } from '../scene/useViewPointTour';
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
it('opens gallery documents without offering removal', () => {
  const onOpen = vi.fn(), onChange = vi.fn();
  const view = render(<GalleryPanel documents={INITIAL_GALLERY} onOpen={onOpen} onChange={onChange} />);
  fireEvent.click(view.getByText('Salouis'));
  expect(onOpen).toHaveBeenCalledWith(1);
  expect(view.queryByLabelText(/Remove .* from gallery/)).toBeNull();
  expect(onChange).not.toHaveBeenCalled();
});
