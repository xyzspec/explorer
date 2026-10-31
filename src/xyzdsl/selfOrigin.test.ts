import { describe, expect, it } from 'vitest';
import { createSpatialDocument } from '../model/createSpatialDocument';
const room = '"Room/+1+4/+2+3/+3+4":"box-shell: 1d white"';
const scene = (children: string, parent = room) => createSpatialDocument(parent + '\n' + children);

describe('individual shell child origin', () => {
  it('positions siblings independently inside and outside the same shell', () => {
    const doc = scene('"Room/Inside/+0+1/+0+1/+0+1":"self-origin: inside; model: inside.glb"\n"Room/Outside/+0+1/+0+1/+0+1":"self-origin: outside; model: outside.glb"');
    expect(doc.diagnostics).toEqual([]);
    const [inside, outside] = doc.renderNodes.filter(n => n.model);
    expect(inside.bounds.minX).toBeCloseTo(1.1); expect(inside.bounds.minY).toBeCloseTo(2.1); expect(inside.bounds.minZ).toBeCloseTo(3.1);
    expect(outside.bounds.minX).toBeCloseTo(1); expect(outside.bounds.minY).toBeCloseTo(2); expect(outside.bounds.minZ).toBeCloseTo(3);
  });
  it('lets an inside child override an outside-origin parent with inside sizing', () => {
    const doc = scene('"Room/Item/++/++/++":"self-origin: inside; model: item.glb"', room.replace('1d white', '1d white; box-shell-origin: outside; box-shell-sizing: inside'));
    expect(doc.diagnostics).toEqual([]);
    const item = doc.renderNodes.find(n => n.model)!;
    expect(item.bounds.minX).toBeCloseTo(1.1);
    item.geometry.dimensions.forEach((v, i) => expect(v).toBeCloseTo([4,3,4][i]));
  });
  it('uses the selected frame for fill, far edges, and clipped repeats', () => {
    const doc = scene('"Room/Fill/++/++/++":"self-origin: outside; model: fill.glb"\n"Room/End/++1/++1/++1":"self-origin: outside; model: end.glb"\n"Room/Repeat/+0+15d/+0+1/+0+1":"self-origin: outside; repeat: x; repeat-edge: clip; model: repeat.glb"');
    expect(doc.diagnostics).toEqual([]);
    const models = doc.renderNodes.filter(n => n.model);
    expect(models[0].geometry.dimensions).toEqual([4,3,4]);
    expect(models[1].bounds.maxX).toBeCloseTo(5); expect(models[1].bounds.maxY).toBeCloseTo(5); expect(models[1].bounds.maxZ).toBeCloseTo(7);
    const copies = models.filter(n => n.model?.source === 'repeat.glb');
    expect(copies).toHaveLength(3); expect(copies.at(-1)!.bounds.maxX).toBeCloseTo(5);
  });
  it('places a nested shell outside without changing its own child policy', () => {
    const doc = scene('"Room/Inner/+0+2/+0+2/+0+2":"self-origin: outside; box-shell: 2d gray"\n"Room/Inner/Item/+0+1/+0+1/+0+1":"model: item.glb"');
    expect(doc.diagnostics).toEqual([]);
    expect(doc.renderNodes.find(n => n.model)!.bounds.minX).toBeCloseTo(1.2);
  });
  it('retains the override in references and allows auto to restore parent policy', () => {
    const doc = scene('"Room/Original/+0+1/+0+1/+0+1":"self-origin: outside; model: item.glb"\n"Room/Copy/+1+1/+0+1/+0+1":"ref: Room/Original"\n"Room/Reset/+2+1/+0+1/+0+1":"ref: Room/Original; self-origin: auto"');
    expect(doc.diagnostics).toEqual([]);
    const models = doc.renderNodes.filter(n => n.model);
    expect(models[0].bounds.minX).toBeCloseTo(1);
    expect(models[1].bounds.minX).toBeCloseTo(2);
    expect(models[2].bounds.minX).toBeCloseTo(3.1);
  });
  it('skips namespace grouping when finding the concrete parent shell', () => {
    const doc = scene('"Room/Group":""\n"Room/Group/Item/+0+1/+0+1/+0+1":"self-origin: outside; model: item.glb"');
    expect(doc.diagnostics).toEqual([]);
    expect(doc.renderNodes.find(n => n.model)!.bounds.minX).toBeCloseTo(1);
  });
  it.each(['invalid', ''])('rejects invalid self-origin: %s', value => {
    const doc = scene(`"Room/Bad/+0+1/+0+1/+0+1":"self-origin: ${value}; model: bad.glb"\n"Room/Bad/Child/+0+1c/+0+1c/+0+1c":"model: child.glb"`);
    expect(doc.diagnostics.length).toBeGreaterThan(0); expect(doc.renderNodes.some(n => n.model)).toBe(false);
    expect(doc.renderNodes).toHaveLength(6);
  });
  it.each(['surface: bottom', 'cell: 1 1 1'])('diagnoses conflicting explicit frame: %s', selection => {
    const doc = scene(`"Room/Bad/+0+1/+0+1/+0+1":"self-origin: outside; ${selection}; model: bad.glb"`, room.replace('1d white', '1d white; box-grid: 1 1 1'));
    expect(doc.diagnostics.length).toBeGreaterThan(0); expect(doc.renderNodes.some(n => n.model)).toBe(false);
  });
  it('requires a concrete shell parent for an explicit override', () => {
    const doc = createSpatialDocument('"Parent/+0+4/+0+4/+0+4":""\n"Parent/Bad/+0+1/+0+1/+0+1":"self-origin: outside; model: bad.glb"');
    expect(doc.diagnostics.length).toBeGreaterThan(0); expect(doc.renderNodes.some(n => n.model)).toBe(false);
  });
});
