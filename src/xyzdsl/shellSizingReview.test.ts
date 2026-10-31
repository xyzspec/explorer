import { describe, expect, it } from 'vitest';
import { createSpatialDocument } from '../model/createSpatialDocument';
const shell = '"Template/+0+2/+0+2/+0+2":"box-shell: 1d white; box-shell-sizing: inside"';
const item = '"Template/Item/++/++/++":"model: item.glb"';
const shellBounds = (doc: ReturnType<typeof createSpatialDocument>, path: string) => {
 const panels=doc.renderNodes.filter(n=>n.namespacePath?.startsWith(path+'#surface-'));
 return Object.fromEntries(['X','Y','Z'].flatMap(a=>[['min'+a,Math.min(...panels.map(n=>n.bounds[('min'+a) as keyof typeof n.bounds]))],['max'+a,Math.max(...panels.map(n=>n.bounds[('max'+a) as keyof typeof n.bounds]))]]));
};
const scene = (...lines: string[]) => { const doc = createSpatialDocument(lines.join('\n')); expect(doc.diagnostics).toEqual([]); return doc; };

describe('independent shell sizing and origin regressions', () => {
 it('expands scaled references exactly once around the retained outer corner', () => {
  const doc = scene(shell,item,'"Copy/+5+4/+0+6/+0+8":"ref: Template; ref-scale: true"');
  const room = {bounds:shellBounds(doc,'Copy/')};
  const child = doc.renderNodes.find(n => n.namespacePath === 'Copy/Item/')!;
  expect(room.bounds.minX).toBeCloseTo(5); expect(room.bounds.maxX).toBeCloseTo(9.4);
  expect(room.bounds.maxY).toBeCloseTo(6.6); expect(room.bounds.maxZ).toBeCloseTo(8.8);
  expect(child.bounds).toMatchObject({minX:5.2});
  expect(child.bounds.maxX).toBeCloseTo(9.2); expect(child.bounds.maxY).toBeCloseTo(6.3); expect(child.bounds.maxZ).toBeCloseTo(8.4);
 });
 it('scales chained reference shells from the already resolved physical template', () => {
  const doc=scene(shell,item,'"Copy/+5+4/+0+4/+0+4":"ref: Template; ref-scale: true"','"Third/+10+8/+0+8/+0+8":"ref: Copy; ref-scale: true"');
  expect(shellBounds(doc,'Third/').maxX).toBeCloseTo(18.8);
  const child=doc.renderNodes.find(n=>n.namespacePath==='Third/Item/')!;
  expect(child.bounds.minX).toBeCloseTo(10.4);expect(child.bounds.maxX).toBeCloseTo(18.4);
 });
 it('fills the physical parent and aligns a fixed inside-sized shell by its outside edge', () => {
  const doc=scene('"Parent/+0+5/+0+4/+0+3":""','"Parent/Fill/++/++/++":"box-shell: 1d white; box-shell-sizing: inside"','"Parent/End/++2/++2/++2":"box-shell: 1d blue; box-shell-sizing: inside"');
  const fill={bounds:shellBounds(doc,'Parent/Fill/')};
  const end={bounds:shellBounds(doc,'Parent/End/')};
  expect(fill.bounds).toEqual({minX:0,maxX:5,minY:0,maxY:4,minZ:0,maxZ:3});
  expect(end.bounds.minX).toBeCloseTo(2.8);expect(end.bounds.maxX).toBeCloseTo(5);
  expect(end.bounds.minY).toBeCloseTo(1.8);expect(end.bounds.maxY).toBeCloseTo(4);
 });
 it('repeats inside-sized shells using physical shell widths without overlap', () => {
  const doc=scene('"Parent/+0+66d/+0+3/+0+3":""','"Parent/Room/+0+2/+0+2/+0+2":"box-shell: 1d white; box-shell-sizing: inside; repeat: x"');
  const lefts=doc.renderNodes.filter(n=>n.metadata?.surfaceFace==='left');
  expect(lefts).toHaveLength(3);
  lefts.forEach((n,i)=>expect(n.bounds.minX).toBeCloseTo(i*2.2));
 });
 it('keeps cell and surface frames interior when ordinary children use outside origin', () => {
  const doc=scene('"Room/+0+2/+0+2/+0+2":"box-shell: 1d white; box-shell-sizing: inside; box-shell-origin: outside; box-grid: 2 1 1; box-partition: 1d gray; rotation: 0,0,90"','"Room/Ordinary/+0+1c/+0+1c/+0+1c":"model: ordinary.glb"','"Room/Cell/+0+1c/+0+1c/+0+1c":"cell: 1 1 1; model: cell.glb"','"Room/Finish/+0+1c/+0+1c/+0+1c":"surface: front; model: finish.glb"');
  const ordinary=doc.renderNodes.find(n=>n.model?.source==='ordinary.glb')!;
  const cell=doc.renderNodes.find(n=>n.model?.source==='cell.glb')!;
  const finish=doc.renderNodes.find(n=>n.model?.source==='finish.glb')!;
  expect(ordinary.bounds.minY).toBeCloseTo(0);
  expect(cell.bounds.minY).toBeCloseTo(.1);expect(cell.bounds.maxX).toBeCloseTo(-.1);
  expect(finish.bounds.minY).toBeCloseTo(.1);expect(finish.bounds.maxX).toBeCloseTo(-.1);
 });
});
