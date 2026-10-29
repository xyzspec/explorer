// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, renderHook } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { INITIAL_GALLERY, preferredViewerSource, readGallery } from './gallery';
import { createSpatialDocument } from '../model/createSpatialDocument';
import { viewPoints } from '../scene/viewPoints';
import { useViewPointTour } from '../scene/useViewPointTour';
import { GalleryPanel } from './GalleryPanel';
afterEach(() => { cleanup(); localStorage.clear(); });
it('migrates saved gallery sources without replacing customized documents', () => {
  const source = '"Custom/+0+2/+0+2/+0+2":"box-surface: 1d pink; box-surface-front: none"';
  localStorage.setItem('xyzdsl-gallery', JSON.stringify([{ id: 'custom', title: 'My room', source }]));
  const expected = [{ id: 'custom', title: 'My room', source: source.replaceAll('box-surface', 'box-shell') }];
  expect(readGallery()).toEqual(expected);
  expect(JSON.parse(localStorage.getItem('xyzdsl-gallery')!)).toEqual(expected);
  expect(readGallery()).toEqual(expected);
});
it('retains a migrated custom gallery when storage cannot be updated', () => {
  const source = '"Custom/+0+2/+0+2/+0+2":"box-surface: 1d pink"';
  localStorage.setItem('xyzdsl-gallery', JSON.stringify([{ id: 'custom', title: 'My room', source }]));
  const write = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('Storage full'); });
  try {
    expect(readGallery()).toEqual([{ id: 'custom', title: 'My room', source: source.replace('box-surface', 'box-shell') }]);
  } finally { write.mockRestore(); }
});
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

it('refreshes the bundled LePapayer in saved galleries while retaining imported documents', () => {
  const custom = { id: 'imported-room', title: 'My room', source: '"Room/+0+2/+0+2/+0+2":""' };
  localStorage.setItem('xyzdsl-gallery', JSON.stringify([
    { id: 'lepapayer', title: 'LePapayer', source: 'old bundled source' }, custom,
  ]));
  const expected = [INITIAL_GALLERY[0], custom];
  expect(readGallery()).toEqual(expected);
  expect(JSON.parse(localStorage.getItem('xyzdsl-gallery')!)).toEqual(expected);
});
