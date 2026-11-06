// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import ngor from '../gallery/ngor.xyzdsl?raw';
import { createSpatialDocument } from '../model/createSpatialDocument';
import { setLocale } from '../i18n';
import { definitionTree } from './definitionTree';
import { XyzDslTreeView } from './XyzDslTreeView';

afterEach(() => { cleanup(); setLocale('fr'); });

it('keeps the supplied Ngor scene at one row per authored declaration', () => {
  setLocale('en');
  const document = createSpatialDocument(ngor);
  const entries = definitionTree(document.nodes);
  const count = ngor.split('\n').filter(line => line.trim()).length;
  expect(entries).toHaveLength(1);
  expect(entries[0].children).toHaveLength(count - 1);
  const { container } = render(<XyzDslTreeView document={document} />);
  expect(container.querySelectorAll('.xyzdsl-tree-row')).toHaveLength(count);
  for (const name of ['FloorTiling', 'TileSkirting', 'EdgeMoulding', 'FrontOpening', 'KitchenOpening', 'HallOpening', 'WindowOpening']) {
    expect(screen.getAllByText(name)).toHaveLength(1);
  }
  expect(container.querySelector('.xyzdsl-definition-details')).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: 'Expand all' }));
  expect(container.querySelectorAll('.xyzdsl-tree-row')).toHaveLength(count);
  fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'Sofa' } });
  expect(container.querySelectorAll('.xyzdsl-tree-row')).toHaveLength(2);
  expect(screen.getByText('Sofa')).toBeTruthy();
});

it('maps generated selections to their owner and reveals selectable instances on demand', () => {
  setLocale('en');
  const document = createSpatialDocument(ngor);
  const entry = definitionTree(document.nodes)[0].children.find(entry => entry.name === 'FloorTiling')!;
  const generated = entry.members.find(node => node.id !== entry.node.id && !node.metadata?.attachmentFrame && !node.metadata?.cellFrame)!;
  expect(generated).toBeTruthy();
  expect(entry.node.model).toBeDefined();
  expect(entry.node.metadata?.attachmentFrame).toBeFalsy();
  const onSelectNode = vi.fn();
  const { container, rerender } = render(<XyzDslTreeView document={document} onSelectNode={onSelectNode} />);
  fireEvent.click(screen.getByText('FloorTiling').closest('button')!);
  expect(onSelectNode).toHaveBeenCalledWith(entry.node.id);
  fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'Sofa' } });
  rerender(<XyzDslTreeView document={document} selectedNodeId={generated.id} onSelectNode={onSelectNode} />);
  expect(screen.getByText('FloorTiling').closest('button')?.getAttribute('aria-current')).toBe('true');
  fireEvent.click(screen.getByRole('button', { name: 'Details for FloorTiling' }));
  const selected = container.querySelector('.xyzdsl-definition-details button[aria-current="true"]')!;
  fireEvent.click(selected);
  expect(onSelectNode).toHaveBeenCalledWith(generated.id);
});

it('keeps boolean relationships behind details while tools remain authored entries', () => {
  setLocale('en');
  const document = createSpatialDocument(`"Base/+0+4/+0+4/+0+4" : "color: red"
"Cut/+1+2/+1+2/+1+2" : "operation: subtraction"`);
  const onSelectNode = vi.fn();
  render(<XyzDslTreeView document={document} onSelectNode={onSelectNode} />);
  expect(screen.queryByText(/Boolean composition/)).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: 'Details for Base' }));
  const summary = screen.getByText(/Boolean composition/);
  fireEvent.click(summary);
  fireEvent.click(within(summary.parentElement!).getByRole('button', { name: 'subtraction · Cut' }));
  expect(onSelectNode).toHaveBeenCalledWith(document.csgExpressions[0].operations[0].tool.id);
});

it('uses friendly surface and instance names while retaining selection IDs', () => {
  setLocale('en');
  const document = createSpatialDocument(ngor);
  const onSelectNode = vi.fn();
  const { container } = render(<XyzDslTreeView document={document} onSelectNode={onSelectNode} />);
  fireEvent.click(screen.getByRole('button', { name: 'Details for Ngor' }));
  expect(screen.getByRole('button', { name: 'Floor · surface' })).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: 'Details for FloorTiling' }));
  const buttons = [...container.querySelectorAll<HTMLButtonElement>('.xyzdsl-definition-details ul button')];
  const instance = buttons.find(button => button.textContent === 'Instance 1 · Floor')!;
  expect(instance).toBeTruthy();
  expect(buttons.every(button => !button.textContent?.includes('#'))).toBe(true);
  const owner = definitionTree(document.nodes)[0].children.find(entry => entry.name === 'FloorTiling')!;
  const target = owner.members.find(node => node.namespacePath === instance.title || node.id === instance.title)!;
  fireEvent.click(instance);
  expect(onSelectNode).toHaveBeenCalledWith(target.id);
});
