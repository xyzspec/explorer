import { describe, expect, it } from 'vitest';
import { createSpatialDocument } from '../model/createSpatialDocument';
const room='"Room/+0+4/+0+4/+0+4":"box-shell: 1d white"';
const scene=(...lines:string[])=>createSpatialDocument(lines.join('\n'));
describe('independent self-origin review',()=>{
 it('does not change a nested shell own child coordinate frame',()=>{
  const doc=scene(room,'"Room/Inner/+0+2/+0+2/+0+2":"box-shell: 2d blue; self-origin: outside"','"Room/Inner/Item/+0+1c/+0+1c/+0+1c":"model: item.glb"');
  expect(doc.diagnostics).toEqual([]);
  const item=doc.renderNodes.find(n=>n.model)!;
  expect(item.bounds.minX).toBeCloseTo(.2);expect(item.bounds.minY).toBeCloseTo(.2);expect(item.bounds.minZ).toBeCloseTo(.2);
 });
 it('retains a reference template override only on the copied declaration',()=>{
  const doc=scene('"Template/+0+1/+0+1/+0+1":"self-origin: outside"','"Template/Item/+0+1c/+0+1c/+0+1c":"model: item.glb"',room,'"Room/Copy/+0+1/+0+1/+0+1":"ref: Template"');
  expect(doc.diagnostics).toEqual([]);
  const item=doc.renderNodes.find(n=>n.namespacePath==='Room/Copy/Item/')!;
  expect(item).toBeDefined();expect(item.bounds.minX).toBeCloseTo(0);
 });
 it('uses the selected frame for far alignment without moving siblings',()=>{
  const doc=scene(room.replace('1d white','1d white; box-shell-origin: outside'),'"Room/Inside/++1/++1/++1":"self-origin: inside; model: inside.glb"','"Room/Outside/++1/++1/++1":"model: outside.glb"');
  expect(doc.diagnostics).toEqual([]);
  const inside=doc.renderNodes.find(n=>n.model?.source==='inside.glb')!;
  const outside=doc.renderNodes.find(n=>n.model?.source==='outside.glb')!;
  expect(inside.bounds.minX).toBeCloseTo(2.9);expect(inside.bounds.maxX).toBeCloseTo(3.9);
  expect(outside.bounds.minX).toBeCloseTo(3);expect(outside.bounds.maxX).toBeCloseTo(4);
 });
 it.each(['self-origin:','self-origin: center','self-origin: inside,outside'])('rejects malformed overrides rather than falling back: %s',prop=>{
  const doc=scene(room,`"Room/Item/+0+1/+0+1/+0+1":"${prop}; model: item.glb"`);
  expect(doc.diagnostics.length).toBeGreaterThan(0);expect(doc.renderNodes.some(n=>n.model)).toBe(false);
 });
 it.each(['surface: front','cell: 1 1 1'])('rejects a competing frame selector: %s',prop=>{
  const doc=scene(room.replace('1d white','1d white; box-grid: 2 1 1; box-partition: 1d gray'),`"Room/Item/+0+1/+0+1/+0+1":"self-origin: outside; ${prop}; model: item.glb"`);
  expect(doc.diagnostics.length).toBeGreaterThan(0);expect(doc.renderNodes.some(n=>n.model)).toBe(false);
 });
});
