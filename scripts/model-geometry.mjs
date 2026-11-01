/** Simplification can eliminate an entire primitive. Do not encode its empty attributes. */
export function removeEmptyPrimitives(document) {
  for (const mesh of document.getRoot().listMeshes()) {
    for (const primitive of mesh.listPrimitives()) {
      const positions = primitive.getAttribute('POSITION');
      const indices = primitive.getIndices();
      if (!positions?.getCount() || (indices && !indices.getCount())) {
        mesh.removePrimitive(primitive);
        primitive.dispose();
      }
    }
  }
}
