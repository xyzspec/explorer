import type { SpatialNode } from '../model/SpatialNode';
import { parseXyzDslDeclaration } from '../xyzdsl/parser';

export interface DefinitionEntry {
  id: string;
  name: string;
  path: string;
  node: SpatialNode;
  members: SpatialNode[];
  children: DefinitionEntry[];
}

/** Project resolved geometry back onto its source declarations for authoring. */
export function definitionTree(nodes: SpatialNode[]): DefinitionEntry[] {
  const entries = new Map<string, DefinitionEntry>();
  function visit(node: SpatialNode) {
    const line = node.metadata?.lineNumber;
    const key = line !== undefined ? `${line}:${node.source}` : node.id;
    let entry = entries.get(key);
    if (!entry) {
      const parsed = parseXyzDslDeclaration(node.source);
      const namespace = parsed.value?.namespace ?? [];
      const path = namespace.length ? namespace.join('/') : node.namespacePath?.replace(/\/$/, '') ?? node.id;
      entry = { id: key, name: namespace.at(-1) ?? path.split('/').at(-1) ?? node.id,
        path, node, members: [], children: [] };
      entries.set(key, entry);
    }
    entry.members.push(node);
    // Prefer the original declaration anchor over a generated panel or tile.
    if (node.namespacePath?.replace(/\/$/, '') === entry.path) entry.node = node;
    node.children?.forEach(visit);
  }
  nodes.forEach(visit);
  for (const entry of entries.values()) {
    if (entry.node.metadata?.attachmentFrame || entry.node.metadata?.cellFrame) {
      entry.node = entry.members.find(node => !node.metadata?.attachmentFrame && !node.metadata?.cellFrame) ?? entry.node;
    }
  }
  const ordered = [...entries.values()].sort((a, b) => Number(a.node.metadata?.lineNumber ?? 0) - Number(b.node.metadata?.lineNumber ?? 0));
  const roots: DefinitionEntry[] = [];
  for (const entry of ordered) {
    const parent = ordered.filter(candidate => candidate !== entry && entry.path.startsWith(`${candidate.path}/`))
      .sort((a, b) => b.path.length - a.path.length)[0];
    (parent?.children ?? roots).push(entry);
  }
  return roots;
}

const surfaceNames: Record<string, string> = {
  bottom: 'Floor', top: 'Ceiling', left: 'Left wall', right: 'Right wall',
  front: 'Front wall', back: 'Back wall',
};

/** Keep renderer identifiers out of the visible label; use the resolved surface metadata. */
export function generatedNodeLabel(node: SpatialNode, index: number, nodesById: Map<string, SpatialNode>, translate: (text: string) => string): string {
  const ownFace = node.metadata?.surfaceFace as string | undefined;
  const panel = nodesById.get(node.metadata?.attachedPanelId as string);
  const face = ownFace ?? panel?.metadata?.surfaceFace as string | undefined;
  const surface = face && surfaceNames[face] ? translate(surfaceNames[face]) : undefined;
  if (ownFace && surface) return `${surface} · ${translate('surface')}`;
  const label = `${translate(node.metadata?.repeatSourceId || node.metadata?.attachedPanelId ? 'Instance' : 'Generated item')} ${index + 1}`;
  return surface ? `${label} · ${surface}` : label;
}
