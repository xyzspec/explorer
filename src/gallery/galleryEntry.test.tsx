// @vitest-environment jsdom
import { cleanup, fireEvent, render } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';
import type { SpatialDocument } from '../model/SpatialDocument';
const state = vi.hoisted(() => ({ mobile: false, remote: '', transactions: [] as unknown[] }));
vi.mock('../ui/useMobileViewport', () => ({ useMobileViewport: () => state.mobile }));
vi.mock('../ui/EditorLayout', () => ({ EditorLayout: ({ children }: { children: ReactNode }) => <>{children}</> }));
vi.mock('../scene/SceneRoot', () => ({ SceneRoot: ({ document, galleryOverlay }: { document: SpatialDocument; galleryOverlay: ReactNode }) => <>{galleryOverlay}<output data-testid="scene">{document.nodes.map(node => node.id).join('\n')}</output></> }));
vi.mock('../ui/XyzDslDrawer', () => ({ XyzDslDrawer: ({ onModeChange }: { onModeChange: (mode: string) => void }) => <><button onClick={() => onModeChange('editor')}>Edit</button><button onClick={() => onModeChange('viewer')}>View</button></> }));
vi.mock('../transactions/usePublicKeyTransactions', () => ({ usePublicKeyTransactions: () => ({ transactions: state.transactions, loading: false, reload: vi.fn() }) }));
vi.mock('../transactions/publicKeyTransactions', async importOriginal => ({ ...await importOriginal<object>(), fetchTipHeight: () => new Promise(() => {}) }));
vi.mock('../transactions/transactionXyzDsl', async importOriginal => ({ ...await importOriginal<object>(), transactionsToXyzDslSource: () => ({ source: state.remote, secondaryKeys: [], latestSecondaryKeys: [], rejected: [] }) }));
import App from '../App';
afterEach(() => { cleanup(); localStorage.clear(); state.mobile = false; state.remote = ''; state.transactions = []; });
it.each([false, true])('opens the gallery before remote sources on mobile=%s', mobile => {
  state.mobile = mobile;
  state.remote = '"Remote/+0+1/+0+1/+0+1":""';
  const view = render(<App />);
  expect(view.getByTestId('scene').textContent).toContain('Pap/');
  expect(view.getByTestId('scene').textContent).not.toContain('Remote/');
  expect(view.queryByRole('button', { name: 'Local draft' })).toBeNull();
  if (!mobile) {
    fireEvent.click(view.getByText('Edit'));
    fireEvent.click(view.getByText('View'));
    expect(view.getByText('LePapayer')).toBeTruthy();
  }
});
it('falls back to remote sources, then the draft when remote sources disappear', () => {
  localStorage.setItem('xyzdsl-gallery', '[]');
  state.remote = '"Remote/+0+1/+0+1/+0+1":""';
  const view = render(<App />);
  expect(view.getByTestId('scene').textContent).toContain('Remote/');
  expect(view.getByTestId('scene').textContent).not.toContain('Sal/');
  state.remote = ''; state.transactions = [{}];
  view.rerender(<App />);
  expect(view.getByTestId('scene').textContent).toContain('Sal/');
  expect(view.getByTestId('scene').textContent).not.toContain('Remote/');
});
