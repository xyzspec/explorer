import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Document, NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { meshopt, prune } from '@gltf-transform/functions';
import { MeshoptEncoder, MeshoptDecoder } from 'meshoptimizer';
import { removeEmptyPrimitives } from './model-geometry.mjs';

test('empty simplified primitives are removed before Meshopt encoding; surviving geometry roundtrips', async () => {
  await MeshoptEncoder.ready; await MeshoptDecoder.ready;
  const doc = new Document(), buffer = doc.createBuffer();
  const attribute = (type, array) => doc.createAccessor().setType(type).setArray(array).setBuffer(buffer);
  const valid = doc.createPrimitive().setAttribute('POSITION', attribute('VEC3', new Float32Array([0,0,0, 1,0,0, 0,1,0]))).setIndices(attribute('SCALAR', new Uint16Array([0,1,2])));
  const empty = doc.createPrimitive().setAttribute('POSITION', attribute('VEC3', new Float32Array())).setAttribute('NORMAL', attribute('VEC3', new Int8Array()).setNormalized(true)).setIndices(attribute('SCALAR', new Uint16Array()));
  const mesh = doc.createMesh().addPrimitive(valid).addPrimitive(empty);
  doc.createScene().addChild(doc.createNode().setMesh(mesh));
  const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.encoder': MeshoptEncoder, 'meshopt.decoder': MeshoptDecoder });
  // Reproduce the original encoder assertion with a zero-count packed attribute.
  await doc.transform(meshopt({ encoder: MeshoptEncoder, level: 'medium' }));
  await assert.rejects(io.writeBinary(doc), /Assertion failed/);
  removeEmptyPrimitives(doc); await doc.transform(prune());
  const loaded = await io.readBinary(await io.writeBinary(doc));
  assert.equal(loaded.getRoot().listMeshes()[0].listPrimitives().length, 1);
  assert.equal(loaded.getRoot().listMeshes()[0].listPrimitives()[0].getIndices().getCount(), 3);
});
