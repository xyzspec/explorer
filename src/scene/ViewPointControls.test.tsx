// @vitest-environment jsdom
import { act, cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { PerspectiveCamera, Vector3 } from 'three';
import { createSpatialDocument } from '../model/createSpatialDocument';
import { viewPoints } from './viewPoints';

const runtime = vi.hoisted(() => ({ state: undefined as any }));
vi.mock('@react-three/fiber', () => ({ useThree: () => runtime.state }));
import { ViewPointControls } from './ViewPointControls';
afterEach(cleanup);

describe('fixed view point controls', () => {
  it('traverses from focused buttons, respects text input, tilts and restores a panned orbit pose', () => {
    const camera = new PerspectiveCamera();
    camera.position.set(10, 20, 30);
    camera.lookAt(3, 4, 5);
    const originalQuaternion = camera.quaternion.clone();
    const canvas = document.createElement('canvas');
    canvas.setPointerCapture = vi.fn();
    canvas.hasPointerCapture = vi.fn(() => false);
    const target = new Vector3();
    const update = vi.fn();
    runtime.state = { camera, gl: { domElement: canvas }, invalidate: vi.fn(), get: () => ({ controls: { target, update } }) };
    const point = viewPoints(createSpatialDocument('"+1+2/+3+4/+5+6":"view-point: true"'))[0];
    const onTraverse = vi.fn();
    const onExit = vi.fn();
    const orbitTarget: [number, number, number] = [3, 4, 5];
    const props = { point, orbitTarget, onTraverse, onExit };
    const view = render(<ViewPointControls {...props} />);
    expect(camera.position.toArray()).toEqual([2, 5, 8]);
    expect(canvas.style.touchAction).toBe('none');
    const pointer = (type: string, x: number, y: number) => {
      const event = new Event(type);
      Object.assign(event, { pointerId: 1, clientX: x, clientY: y, button: 0, isPrimary: true, pointerType: 'touch' });
      act(() => canvas.dispatchEvent(event));
    };
    pointer('pointerdown', 100, 100);
    pointer('pointermove', 140, 100);
    pointer('pointerup', 140, 100);
    expect(onTraverse).not.toHaveBeenCalled();
    expect(camera.rotation.y).toBeCloseTo(-.2);
    expect(camera.position.toArray()).toEqual([2, 5, 8]);
    pointer('pointerdown', 100, 100);
    pointer('pointermove', 100, 20);
    pointer('pointerup', 100, 20);
    expect(camera.rotation.x).toBeCloseTo(.4);
    expect(camera.rotation.y).toBeCloseTo(-.2);
    expect(camera.position.toArray()).toEqual([2, 5, 8]);
    expect(onTraverse).not.toHaveBeenCalled();
    pointer('pointerdown', 100, 100);
    pointer('pointermove', 100, -1000);
    pointer('pointerup', 100, -1000);
    expect(camera.rotation.x).toBeCloseTo(Math.PI / 2 - .01);
    expect(onTraverse).not.toHaveBeenCalled();
    const button = document.createElement('button');
    document.body.append(button);
    act(() => button.dispatchEvent(new KeyboardEvent('keydown', { code: 'ArrowDown', bubbles: true })));
    expect(onTraverse).toHaveBeenCalledWith(1);
    act(() => button.dispatchEvent(new KeyboardEvent('keydown', { code: 'Escape', bubbles: true })));
    expect(onExit).toHaveBeenCalledOnce();
    const input = document.createElement('input');
    document.body.append(input);
    act(() => input.dispatchEvent(new KeyboardEvent('keydown', { code: 'ArrowDown', bubbles: true })));
    expect(onTraverse).toHaveBeenCalledOnce();
    view.rerender(<ViewPointControls {...props} point={undefined} />);
    expect(camera.position.toArray()).toEqual([10, 20, 30]);
    expect(camera.quaternion.equals(originalQuaternion)).toBe(true);
    expect(target.toArray()).toEqual(orbitTarget);
    expect(update).toHaveBeenCalled();
    expect(canvas.style.touchAction).toBe('');
    button.remove(); input.remove();
  });
});

it('keeps Browse camera fixed and gives both drag axes to Look around', () => {
  const camera = new PerspectiveCamera();
  const canvas = document.createElement('canvas');
  canvas.setPointerCapture = vi.fn(); canvas.hasPointerCapture = vi.fn(() => false);
  runtime.state = { camera, gl: { domElement: canvas }, invalidate: vi.fn(), get: () => ({ controls: null }) };
  const point = viewPoints(createSpatialDocument('"POV+Test/+0+1/+0+1/+0+1":"view-point: true"'))[0];
  const traverse = vi.fn(), documents = vi.fn();
  const view = render(<ViewPointControls point={point} galleryMode lookEnabled={false} onTraverse={traverse} onTraverseDocument={documents} />);
  const drag = () => {
    for (const [type, x, y] of [['pointerdown', 100, 100], ['pointermove', 140, 160], ['pointerup', 140, 160]] as const) {
      const event = new Event(type); Object.assign(event, { pointerId: 1, clientX: x, clientY: y, button: 0, isPrimary: true }); act(() => canvas.dispatchEvent(event));
    }
  };
  drag(); expect(camera.rotation.x).toBe(0); expect(camera.rotation.y).toBe(0);
  act(() => window.dispatchEvent(new KeyboardEvent('keydown', { code: 'ArrowRight' })));
  act(() => window.dispatchEvent(new KeyboardEvent('keydown', { code: 'ArrowDown' })));
  expect(traverse).toHaveBeenCalledWith(1); expect(documents).toHaveBeenCalledWith(1);
  view.rerender(<ViewPointControls point={point} galleryMode lookEnabled onTraverse={traverse} />);
  drag(); expect(camera.rotation.x).toBeCloseTo(-.3); expect(camera.rotation.y).toBeCloseTo(-.2);
});
