import { describe, expect, it } from 'vitest';
import { createSpatialDocument } from '../model/createSpatialDocument';
import { migrateBoxShell } from './migrateBoxShell';

const scene = (properties: string) => createSpatialDocument(`"Room/+0+4/+0+3/+0+4":"${properties}"`);
const panels = (properties: string) => scene(properties).renderNodes.map(n => ({ bounds: n.bounds, material: n.material, face: n.metadata?.surfaceFace }));

describe('box-shell canonical spelling and compatibility', () => {
  it('keeps legacy shorthand and all six face overrides equivalent', () => {
    const properties = 'box-shell: 1d white; box-shell-top: 2c red; box-shell-right: 3c blue; box-shell-bottom: 4c gray; box-shell-left: 5c green; box-shell-front: none; box-shell-back: 6c yellow; observable: true';
    expect(scene(properties).diagnostics).toEqual([]);
    expect(scene(properties.replaceAll('box-shell', 'box-surface')).diagnostics).toEqual([]);
    expect(panels(properties)).toEqual(panels(properties.replaceAll('box-shell', 'box-surface')));
  });
  it.each([
    ['box-surface: 1d white; box-shell-front: none', 'box-shell: 1d white; box-shell-front: none'],
    ['box-shell: 1d white; box-surface-front: none', 'box-shell: 1d white; box-shell-front: none'],
    ['box-shell: 1d white; box-shell-front: none; box-surface: 2c red', 'box-shell: 2c red'],
    ['box-surface: 1d white; box-shell: none', 'box-shell: none'],
    ['box-shell: 1d white; box-surface: none', 'box-shell: none'],
  ])('resolves mixed spellings in authored order: %s', (mixed, canonical) => {
    expect(scene(mixed).diagnostics).toEqual(scene(canonical).diagnostics);
    expect(panels(mixed)).toEqual(panels(canonical));
  });
  it('supports canonical overrides on legacy references', () => {
    const doc = createSpatialDocument('"Template/+0+4/+0+3/+0+4":"box-surface: 1d white"\n"Copy/+5+4/+0+3/+0+4":"ref: Template; box-shell-front: none"');
    expect(doc.diagnostics).toEqual([]);
    expect(doc.renderNodes).toHaveLength(11);
  });
  it.each(['box-surface-bogus', 'box-shell-bogus', 'box-surfaces'])('does not accept unknown shell keys: %s', property => {
    const doc = scene(`box-shell: 1d white; ${property}: none`);
    expect(doc.diagnostics.some(d => d.message.includes('unsupported object property'))).toBe(true);
    expect(doc.renderNodes).toHaveLength(6);
  });
  it.each(['box-shell:', 'box-surface:', 'box-shell: 1d white; box-surface-top:', 'box-surface: 1d white; box-shell-top:'])('rejects malformed declarations without rendering a partial shell: %s', value => {
    expect(scene(value).diagnostics.length).toBeGreaterThan(0);
    expect(scene(value).renderNodes).toHaveLength(0);
  });
  it('migrates only property keys while preserving document formatting and content', () => {
    const source = '"box-surface/+0+1/+0+1/+0+1" : "box-surface: 1c white; box-surface-front : none; content-text: box-surface; model: box-surface.glb"\r\n';
    const migrated = migrateBoxShell(source);
    expect(migrated).toBe('"box-surface/+0+1/+0+1/+0+1" : "box-shell: 1c white; box-shell-front : none; content-text: box-surface; model: box-surface.glb"\r\n');
    expect(migrateBoxShell(migrated)).toBe(migrated);
  });
});
