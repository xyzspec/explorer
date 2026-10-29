// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { createSpatialDocument } from '../model/createSpatialDocument';
import { setLocale } from '../i18n';
import { XyzDslTreeView } from './XyzDslTreeView';

afterEach(() => { cleanup(); setLocale('fr'); });

it('nests ordered boolean tools under their base and supports selection and collapsing', () => {
  setLocale('en');
  const document = createSpatialDocument(`"Base/+0+4/+0+4/+0+4" : "color: red"
"Cut/+1+2/+1+2/+1+2" : "operation: subtraction"
"Add/+1+2/+1+2/+1+2" : "operation: union"`);
  expect(document.csgExpressions).toHaveLength(1);
  const onSelectNode = vi.fn();
  render(<XyzDslTreeView document={document} onSelectNode={onSelectNode} />);
  const base = screen.getByRole('button', { name: /^Base/ }).closest('li')!;
  const composition = within(base).getByText(/Boolean composition/).closest('li')!;
  const tools = within(composition).getAllByRole('button');
  expect(tools.map(tool => tool.textContent)).toEqual(['subtraction · Cut · box', 'union · Add · box']);
  fireEvent.click(tools[0]);
  expect(onSelectNode).toHaveBeenCalledWith(document.csgExpressions[0].operations[0].tool.id);
  fireEvent.click(screen.getByRole('button', { name: 'Collapse all' }));
  expect(screen.queryByText(/Boolean composition/)).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: 'Expand all' }));
  expect(within(base).getByText(/Boolean composition/)).toBeTruthy();
});
