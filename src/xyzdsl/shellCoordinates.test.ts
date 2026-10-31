import { describe, expect, it } from 'vitest';
import { createSpatialDocument } from '../model/createSpatialDocument';

const scene = (properties: string, children = '') => createSpatialDocument(`"Room/+1+366c/+2+330c/+3+391c":"box-shell: 1d white; ${properties}"\n${children}`);
const fill = '"Room/Item/++/++/++":"model: item.glb"';

describe('shell origin and sizing', () => {
  it.each([
    ['inside', 'outside', [1.1, 2.1, 3.1], [3.46, 3.1, 3.71]],
    ['outside', 'outside', [1, 2, 3], [3.66, 3.3, 3.91]],
    ['inside', 'inside', [1.1, 2.1, 3.1], [3.66, 3.3, 3.91]],
    ['outside', 'inside', [1, 2, 3], [3.86, 3.5, 4.11]],
  ] as const)('uses %s child origins with %s sizing', (origin, sizing, min, size) => {
    const doc = scene(`box-shell-origin: ${origin}; box-shell-sizing: ${sizing}`, fill);
    expect(doc.diagnostics).toEqual([]);
    const node = doc.renderNodes.find(n => n.model)!;
    [node.bounds.minX, node.bounds.minY, node.bounds.minZ].forEach((v, i) => expect(v).toBeCloseTo(min[i]));
    node.geometry.dimensions.forEach((v, i) => expect(v).toBeCloseTo(size[i]));
    expect(Math.min(...doc.renderNodes.filter(n => n.metadata?.surfaceFace).map(n => n.bounds.minX))).toBeCloseTo(1);
  });
  it('adds only existing asymmetric panel thicknesses when sizing the interior', () => {
    const doc = scene('box-shell-sizing: inside; box-shell-left: none; box-shell-bottom: 2d gray; box-shell-back: 3d blue', fill);
    expect(doc.diagnostics).toEqual([]);
    const item = doc.renderNodes.find(n => n.model)!;
    expect(item.bounds.minX).toBeCloseTo(1); expect(item.bounds.minY).toBeCloseTo(2.2);
    item.geometry.dimensions.forEach((v, i) => expect(v).toBeCloseTo([3.66, 3.3, 3.91][i]));
    expect(doc.nodes[0].box.width).toBeCloseTo(3.76);
    expect(doc.nodes[0].box.height).toBeCloseTo(3.6);
    expect(doc.nodes[0].box.depth).toBeCloseTo(4.31);
  });
  it('uses outside extents for ordinary child far alignment and clipped repetition', () => {
    const doc = scene('box-shell-origin: outside', '"Room/End/++1/++1/++1":"model: end.glb"\n"Room/Repeat/+0+1/+0+1/+0+1":"model: repeat.glb; repeat: x; repeat-edge: clip"');
    expect(doc.diagnostics).toEqual([]);
    const end = doc.renderNodes.find(n => n.model?.source === 'end.glb')!;
    expect(end.bounds.maxX).toBeCloseTo(4.66); expect(end.bounds.maxY).toBeCloseTo(5.3); expect(end.bounds.maxZ).toBeCloseTo(6.91);
    const repeats = doc.renderNodes.filter(n => n.model?.source === 'repeat.glb');
    expect(repeats).toHaveLength(4);
    expect(repeats[0].bounds.minX).toBeCloseTo(1);
    expect(repeats.at(-1)!.bounds.maxX).toBeCloseTo(4.66);
  });
  it('keeps surface and grid cell coordinates inside even when ordinary children use outside', () => {
    const doc = scene('box-shell-origin: outside; box-shell-sizing: inside; box-grid-columns: 2; box-partition: 1d gray', '"Room/Tile/++/++/+0+1c":"surface: front; model: tile.glb"\n"Room/Cell/++/++/++":"cell: 1 1 1; model: cell.glb"');
    expect(doc.diagnostics).toEqual([]);
    const tile = doc.renderNodes.find(n => n.model?.source === 'tile.glb')!;
    expect(tile.bounds.minZ).toBeCloseTo(3.1);
    expect(tile.bounds.maxX - tile.bounds.minX).toBeCloseTo(3.66);
    const cell = doc.renderNodes.find(n => n.model?.source === 'cell.glb')!;
    expect(cell.bounds.minX).toBeCloseTo(1.1);
    expect(cell.bounds.maxX - cell.bounds.minX).toBeCloseTo(1.78);
  });
  it('does not inherit an outer origin or interior sizing into nested shells', () => {
    const doc = scene('box-shell-origin: outside; box-shell-sizing: inside', '"Room/Inner/+0+2/+0+2/+0+2":"box-shell: 1d blue"\n"Room/Inner/Item/++/++/++":"model: item.glb"');
    expect(doc.diagnostics).toEqual([]);
    const item = doc.renderNodes.find(n => n.model)!;
    expect(item.bounds.minX).toBeCloseTo(1.1);
    expect(item.bounds.maxX - item.bounds.minX).toBeCloseTo(1.8);
  });
  it('retains and overrides both properties through references without scaling', () => {
    const source = '"Template/+0+2/+0+2/+0+2":"box-shell: 1d white; box-shell-origin: outside; box-shell-sizing: inside"\n"Template/Item/++/++/++":"model: item.glb"';
    const doc = createSpatialDocument(source + '\n"Copy/+4+3/+0+3/+0+3":"ref: Template"\n"Override/+8+3/+0+3/+0+3":"ref: Template; box-shell-origin: inside; box-shell-sizing: outside"');
    expect(doc.diagnostics).toEqual([]);
    const copy = doc.renderNodes.find(n => n.model && n.namespacePath === 'Copy/Item/')!;
    expect(copy.bounds.minX).toBeCloseTo(4); expect(copy.bounds.maxX).toBeCloseTo(7.2);
    const override = doc.renderNodes.find(n => n.model && n.namespacePath === 'Override/Item/')!;
    expect(override.bounds.minX).toBeCloseTo(8.1); expect(override.bounds.maxX).toBeCloseTo(10.9);
  });
  it('allows thick panels around a small declared clear interior', () => {
    const doc = createSpatialDocument('"Room/+0+1c/+0+1c/+0+1c":"box-shell: 1d white; box-shell-sizing: inside"\n' + fill);
    expect(doc.diagnostics).toEqual([]);
    const item = doc.renderNodes.find(n => n.model)!;
    expect(item.bounds.minX).toBeCloseTo(.1);
    expect(item.bounds.maxX).toBeCloseTo(.11);
    expect(Math.max(...doc.renderNodes.filter(n => n.metadata?.surfaceFace).map(n => n.bounds.maxX))).toBeCloseTo(.21);
  });
  it('keeps independent shell options when a later shorthand changes the panels', () => {
    const doc = scene('box-shell-origin: outside; box-shell-sizing: inside; box-shell: 2d blue', fill);
    expect(doc.diagnostics).toEqual([]);
    const item = doc.renderNodes.find(n => n.model)!;
    expect(item.bounds.minX).toBeCloseTo(1);
    expect(item.bounds.maxX - item.bounds.minX).toBeCloseTo(4.06);
  });
  it.each(['box-shell-origin: invalid', 'box-shell-sizing: invalid', 'box-shell-origin:', 'box-shell-sizing:'])('rejects invalid options: %s', property => {
    const doc = scene(property, fill);
    expect(doc.diagnostics.length).toBeGreaterThan(0);
    expect(doc.renderNodes).toHaveLength(0);
  });
  it.each(['box-shell-origin: outside', 'box-shell-sizing: inside'])('requires a shell for %s', property => {
    const doc = createSpatialDocument(`"Plain/+0+2/+0+2/+0+2":"${property}"`);
    expect(doc.diagnostics.length).toBeGreaterThan(0);
    expect(doc.renderNodes).toHaveLength(0);
  });
});
