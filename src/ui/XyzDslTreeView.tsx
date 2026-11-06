import { useEffect, useMemo, useState } from 'react';
import { t, useLocale } from '../i18n';
import type { SpatialDocument } from '../model/SpatialDocument';
import type { SpatialNode } from '../model/SpatialNode';
import { definitionTree, generatedNodeLabel, type DefinitionEntry } from './definitionTree';

interface XyzDslTreeViewProps {
  document: SpatialDocument;
  selectedNodeId?: string;
  onSelectNode?: (id: string) => void;
}

function flatten(entries: DefinitionEntry[]): DefinitionEntry[] {
  return entries.flatMap(entry => [entry, ...flatten(entry.children)]);
}

function kind(node: SpatialNode): string {
  return node.metadata?.viewPoint ? t('view point') : node.light ? t('light')
    : node.geometry.operation ? t(node.geometry.operation) : node.model ? t('model')
    : node.renderable ? t(node.geometry.kind) : t('group');
}

export function XyzDslTreeView({ document, selectedNodeId, onSelectNode }: XyzDslTreeViewProps) {
  useLocale();
  const roots = useMemo(() => definitionTree(document.nodes), [document.nodes]);
  const entries = useMemo(() => flatten(roots), [roots]);
  const nodesById = useMemo(() => new Map(entries.flatMap(entry => entry.members.map(node => [node.id, node] as const))), [entries]);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [details, setDetails] = useState<Set<string>>(new Set());
  const [query, setQuery] = useState('');
  useEffect(() => { setQuery(''); }, [selectedNodeId]);
  const owner = entries.find(entry => entry.members.some(node => node.id === selectedNodeId));
  useEffect(() => {
    if (!owner) return;
    setCollapsed(current => new Set([...current].filter(id => {
      const entry = entries.find(item => item.id === id);
      return !entry || !owner.path.startsWith(`${entry.path}/`);
    })));
  }, [owner, entries]);

  function toggle(set: typeof setCollapsed, id: string) {
    set(current => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }
  const search = query.trim().toLowerCase();
  function matches(entry: DefinitionEntry): boolean {
    return entry.path.toLowerCase().includes(search) || entry.children.some(matches);
  }
  function renderEntry(entry: DefinitionEntry) {
    if (search && !matches(entry)) return null;
    const selected = owner?.id === entry.id;
    const generated = entry.members.filter(node => !node.metadata?.attachmentFrame && !node.metadata?.cellFrame
      && (node.id !== entry.node.id || node.metadata?.repeatSourceId || node.metadata?.surfaceSourceId || node.metadata?.attachedPanelId));
    const operations = entry.members.flatMap(node =>
      document.csgExpressions.find(expression => expression.base.id === node.id)?.operations ?? node.modelCsgOperations ?? []);
    const uniqueOperations = [...new Map(operations.map(operation => [operation.tool.id, operation])).values()];
    const expanded = search || !collapsed.has(entry.id);
    const showDetails = details.has(entry.id);
    return <li key={entry.id} className="xyzdsl-tree-item">
      <div className={`xyzdsl-tree-row${selected ? ' is-selected' : ''}`}>
        {entry.children.length ? <button type="button" className="xyzdsl-tree-toggle"
          disabled={Boolean(search)} aria-expanded={Boolean(expanded)} aria-label={`${expanded ? t('Collapse') : t('Expand')} ${entry.name}`}
          onClick={() => toggle(setCollapsed, entry.id)}>{expanded ? '▾' : '▸'}</button>
          : <span className="xyzdsl-tree-spacer" aria-hidden="true" />}
        <button type="button" className="xyzdsl-tree-node-summary" title={entry.path}
          aria-current={selected ? 'true' : undefined} onClick={() => onSelectNode?.(entry.node.id)}>
          <strong>{entry.name}</strong><span>{kind(entry.node)} · {t('line')} {String(entry.node.metadata?.lineNumber ?? '—')}</span>
        </button>
        <div className="xyzdsl-definition-actions">
          <button type="button" className="xyzdsl-definition-details-toggle" aria-expanded={showDetails}
            aria-label={`${t('Details for')} ${entry.name}`} onClick={() => toggle(setDetails, entry.id)}>
            {showDetails ? t('Hide details') : t('Details')}
            {generated.length ? ` · ${generated.length} ${t('generated')}` : ''}
            {uniqueOperations.length ? ` · ${uniqueOperations.length} ${t('boolean operations')}` : ''}
          </button>
          {selected && selectedNodeId !== entry.node.id ? <span>{t('Generated item selected')}</span> : null}
        </div>
      </div>
      {showDetails ? <div className="xyzdsl-definition-details">
        <p>{entry.path} · {entry.node.box.width} × {entry.node.box.height} × {entry.node.box.depth}</p>
        {uniqueOperations.length ? <details><summary>{t('Boolean composition')} ({uniqueOperations.length})</summary>
          <ol>{uniqueOperations.map(operation => <li key={operation.tool.id}>
            <button type="button" onClick={() => onSelectNode?.(operation.tool.id)}>
              {t(operation.op)} · {entries.find(item => item.members.some(node => node.id === operation.tool.id))?.name ?? operation.tool.namespacePath ?? operation.tool.id}
            </button>
          </li>)}</ol>
        </details> : null}
        {generated.length ? <details open={selected && selectedNodeId !== entry.node.id ? true : undefined}>
          <summary>{t('Generated geometry')} ({generated.length})</summary>
          <ul>{generated.map((node, index) => <li key={node.id}><button type="button"
            title={node.namespacePath ?? node.id} aria-current={selectedNodeId === node.id ? 'true' : undefined} onClick={() => onSelectNode?.(node.id)}>
            {generatedNodeLabel(node, index, nodesById, t)}
          </button></li>)}</ul>
        </details> : null}
      </div> : null}
      {entry.children.length && expanded ? <ul className="xyzdsl-tree-children">{entry.children.map(renderEntry)}</ul> : null}
    </li>;
  }
  return <section className="xyzdsl-tree-view" aria-label={t('Spatial declaration tree')}>
    <div className="section-heading-row"><h2>{t('Definition tree')}</h2>
      <div className="tree-actions" aria-label={t('Tree display controls')}>
        <button type="button" onClick={() => setCollapsed(new Set())}>{t('Expand all')}</button>
        <button type="button" disabled={Boolean(search)} onClick={() => { setCollapsed(new Set(entries.map(entry => entry.id))); setDetails(new Set()); }}>{t('Collapse all')}</button>
      </div>
    </div>
    <p className="xyzdsl-definition-hint">{entries.length} {t('definitions. Generated geometry is inside Details.')}</p>
    <input type="search" className="xyzdsl-definition-search" aria-label={t('Find definition')}
      placeholder={t('Find definition')} value={query} onChange={event => setQuery(event.target.value)} />
    {!entries.length ? <p>{t('No valid definitions yet.')}</p>
      : !roots.some(matches) ? <p>{t('No matching definitions.')}</p>
      : <ul className="xyzdsl-tree-root">{roots.map(renderEntry)}</ul>}
  </section>;
}
