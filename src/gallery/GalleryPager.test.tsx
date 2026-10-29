// @vitest-environment jsdom
import { act, cleanup, fireEvent, render } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { GalleryPager } from './GalleryPager';
import { createSpatialDocument } from '../model/createSpatialDocument';
import { viewPoints } from '../scene/viewPoints';
import { INITIAL_GALLERY } from './gallery';
import { setLocale } from '../i18n';
const points = viewPoints(createSpatialDocument(INITIAL_GALLERY[0].source));
beforeEach(() => setLocale('en'));
afterEach(() => { cleanup(); sessionStorage.clear(); vi.useRealTimers(); });
it('names viewpoints, selects dots, wraps at boundaries, and toggles Look around', () => {
  const select = vi.fn(), looking = vi.fn();
  const view = render(<GalleryPager points={points} index={0} looking={false} onLookingChange={looking} onSelect={select} canHint ready interacted={false} />);
  expect(view.getByText('Entrance')).toBeTruthy();
  fireEvent.click(view.getByLabelText('Previous view point')); expect(select).toHaveBeenLastCalledWith(6);
  fireEvent.click(view.getByLabelText('Go to Kitchen, 3 of 7')); expect(select).toHaveBeenCalledWith(2);
  fireEvent.click(view.getByText('Tap to look around')); expect(looking).toHaveBeenCalledWith(true);
  view.rerender(<GalleryPager points={points} index={6} looking onLookingChange={looking} onSelect={select} canHint ready interacted />);
  fireEvent.click(view.getByLabelText('Next view point')); expect(select).toHaveBeenLastCalledWith(0);
  fireEvent.click(view.getByText('Done')); expect(looking).toHaveBeenCalledWith(false);
});
it('shows the feed hint only once after readiness and hides it on interaction', () => {
  vi.useFakeTimers();
  const props = { points, index: 0, looking: false, onLookingChange: vi.fn(), onSelect: vi.fn(), canHint: true, ready: false, interacted: false };
  const view = render(<GalleryPager {...props} />);
  act(() => vi.advanceTimersByTime(1000)); expect(view.queryByText('Swipe up for the next space')).toBeNull();
  view.rerender(<GalleryPager {...props} ready />);
  act(() => vi.advanceTimersByTime(1000)); expect(view.getByText('Swipe up for the next space')).toBeTruthy();
  view.rerender(<GalleryPager {...props} ready interacted />);
  expect(view.queryByText('Swipe up for the next space')).toBeNull();
  view.unmount();
  const second = render(<GalleryPager {...props} ready />);
  act(() => vi.advanceTimersByTime(1000)); expect(second.queryByText('Swipe up for the next space')).toBeNull();
});
