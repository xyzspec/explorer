import { t, useLocale } from '../i18n';
import { WorkspacePanel } from './WorkspacePanel';
import type { ReactNode } from 'react';
import type { SpatialDocument } from '../model/SpatialDocument';
import type { SpatialNode } from '../model/SpatialNode';
import type { AxisName } from '../xyzdsl/types';
import type { LinearStepChoice, RotationStep } from './SelectedNodeInspector';
import { UNIT_SCALE_DESCRIPTION } from '../model/units';
import type { RejectedTransaction, SecondaryTenant, TransactionRange } from '../transactions/types';
import { normalizeXyzDslTransaction } from '../transactions/transactionXyzDsl';
import { XyzDslEditor } from './XyzDslEditor';
import { XyzDslTransactionControls } from './XyzDslTransactionControls';
import { SecondaryTenantPanel } from './SecondaryTenantPanel';
import { XyzDslTreeView } from './XyzDslTreeView';
import { SelectedNodeInspector } from './SelectedNodeInspector';
import { usePersistentState } from './usePersistentState';

type DrawerTab = 'gallery' | 'objects' | 'source' | 'assets' | 'data' | 'problems';

function describeAuthoringState(
  hasRemoteBaseline: boolean,
  hasAuthoringEdits: boolean,
  remoteBaselineChanged: boolean,
): string {
  if (!hasRemoteBaseline) {
    return t("Editing local spatial declarations. Use bare path numbers for metres, or d, c, and m suffixes for decimetres, centimetres, and millimetres ({units}).", { units: UNIT_SCALE_DESCRIPTION });
  }

  if (remoteBaselineChanged && hasAuthoringEdits) {
    return t("Remote declarations changed after local edits. Keep editing, or reset to the latest remote state.");
  }

  if (hasAuthoringEdits) {
    return t("Local draft differs from the loaded remote declarations. Edit, remove, or add declarations below.");
  }

  return t("Loaded from remote transactions. Edit, remove, or add declarations below.");
}

function summarizeChanges({ added, removed }: { added: number; removed: number }): string {
  const parts: string[] = [];

  if (added > 0) {
    parts.push(t("{count} added", { count: added }));
  }

  if (removed > 0) {
    parts.push(t("{count} removed", { count: removed }));
  }

  return parts.length > 0 ? parts.join(' · ') : t("No line changes");
}

// Kept exported for the drawer's existing focused summary tests.
export function transactionSummary(transaction: import('../transactions/types').XyzDslTransaction): string {
  const normalized = normalizeXyzDslTransaction(transaction);
  return [normalized.from ? t("from {address}", { address: normalized.from }) : undefined, t("to {address}", { address: normalized.to }), normalized.memo.trim() ? `memo ${normalized.memo.trim()}` : undefined]
    .filter(Boolean)
    .join(' · ');
}

function renderAuthoringStatus(
  hasRemoteBaseline: boolean,
  hasAuthoringEdits: boolean,
  remoteBaselineChanged: boolean,
  authoringChangeSummary: { added: number; removed: number },
): ReactNode {
  if (!hasRemoteBaseline) {
    return <em className="xyzdsl-status-badge">{t("Local sample")}</em>;
  }

  if (remoteBaselineChanged && hasAuthoringEdits) {
    return (
      <>
        <em className="xyzdsl-status-badge xyzdsl-status-badge-warning">{t("Remote changed")}</em>
        <span>{summarizeChanges(authoringChangeSummary)}</span>
      </>
    );
  }

  if (hasAuthoringEdits) {
    return (
      <>
        <em className="xyzdsl-status-badge xyzdsl-status-badge-warning">{t("Modified locally")}</em>
        <span>{summarizeChanges(authoringChangeSummary)}</span>
      </>
    );
  }

  return <em className="xyzdsl-status-badge xyzdsl-status-badge-success">{t("Remote baseline loaded")}</em>;
}

interface XyzDslDrawerProps {
  galleryPanel?: ReactNode;
  assetsPanel?: ReactNode;
  appMode: 'viewer' | 'editor';
  allowModeSwitch?: boolean;
  document: SpatialDocument;
  isOpen: boolean;
  source: string;
  transactionPublicKey: string;
  transactionPublicKeyShareUrl?: string;
  transactionRange: TransactionRange;
  transactionsLoading: boolean;
  transactionError?: string;
  tipHeight?: number;
  tipLoading: boolean;
  tipError?: string;
  transactionCount: number;
  acceptedTransactionCount: number;
  mappedTransactionSource: string;
  rejectedTransactions: RejectedTransaction[];
  secondaryTenants: SecondaryTenant[];
  hasRemoteBaseline: boolean;
  hasAuthoringEdits: boolean;
  remoteBaselineChanged: boolean;
  authoringChangeSummary: { added: number; removed: number };
  onChange: (source: string) => void;
  onModeChange: (mode: 'viewer' | 'editor') => void;
  onResetToRemote: () => void;
  onTransactionPublicKeyChange: (publicKey: string) => void;
  onTransactionRangeChange: (range: TransactionRange) => void;
  onReloadTransactions: () => void;
  onUseTransactionTip: () => void;
  onSecondaryReplay: (publicKey: string) => void;
  onSecondaryPlaybackToggle: (publicKey: string) => void;
  onSecondaryPlaybackSpeedChange: (publicKey: string, playbackSpeed: number) => void;
  onSecondaryPlaybackSeek: (publicKey: string, playbackIndex: number) => void;
  onLoadSecondaryHistory: (publicKey: string) => void;
  onSecondaryEnabledChange: (publicKey: string, enabled: boolean) => void;
  onSecondaryRangeChange: (publicKey: string, range: TransactionRange) => void;
  selectedNodeId?: string;
  onSelectNode?: (id: string) => void;
  selectedNode?: SpatialNode;
  selectedNodeCanEdit: boolean;
  selectionPath: SpatialNode[];
  onClearSelection: () => void;
  onMoveNode: (axis: AxisName, delta: number) => void;
  onResizeNode: (axis: AxisName, delta: number) => void;
  onRotateNode: (axis: AxisName, delta: number) => void;
  onPathNodeSelect: (id: string) => void;
  onNodePropertyChange: (key: string, value: string) => void;
  linearStepChoice: LinearStepChoice;
  rotationStep: RotationStep;
  onLinearStepChoiceChange: (choice: LinearStepChoice) => void;
  onRotationStepChange: (step: RotationStep) => void;
}

export function XyzDslDrawer({
  assetsPanel,
  allowModeSwitch = true,
  galleryPanel,
  appMode,
  document,
  isOpen,
  source,
  transactionPublicKey,
  transactionPublicKeyShareUrl,
  transactionRange,
  transactionsLoading,
  transactionError,
  tipHeight,
  tipLoading,
  tipError,
  transactionCount,
  acceptedTransactionCount,
  mappedTransactionSource,
  rejectedTransactions,
  secondaryTenants,
  hasRemoteBaseline,
  hasAuthoringEdits,
  remoteBaselineChanged,
  authoringChangeSummary,
  onChange,
  onModeChange,
  onResetToRemote,
  onTransactionPublicKeyChange,
  onTransactionRangeChange,
  onReloadTransactions,
  onUseTransactionTip,
  onSecondaryReplay,
  onSecondaryPlaybackToggle,
  onSecondaryPlaybackSpeedChange,
  onSecondaryPlaybackSeek,
  onLoadSecondaryHistory,
  onSecondaryEnabledChange,
  onSecondaryRangeChange,
  selectedNodeId,
  onSelectNode,
  selectedNode,
  selectedNodeCanEdit,
  selectionPath,
  onClearSelection,
  onMoveNode,
  onResizeNode,
  onRotateNode,
  onPathNodeSelect,
  onNodePropertyChange,
  linearStepChoice,
  rotationStep,
  onLinearStepChoiceChange,
  onRotationStepChange,
}: XyzDslDrawerProps) {
  useLocale();
  const [activeTab, setActiveTab] = usePersistentState<DrawerTab>('xyzdsl-drawer-active-tab', 'objects');
  const problemCount = document.diagnostics.length + rejectedTransactions.length;
  const tabs: { id: DrawerTab; label: string; count?: number }[] = [
    ...(galleryPanel ? [{ id: 'gallery' as const, label: t("Gallery") }] : []),
    { id: 'objects', label: t("Objects") },
    { id: 'source', label: t("Source") },
    { id: 'assets', label: t("Assets") },
    { id: 'data', label: t("Data") },
    { id: 'problems', label: t("Problems"), count: problemCount },
  ];
  return (
    <WorkspacePanel mode={appMode} open={isOpen} allowModeSwitch={allowModeSwitch} onModeChange={onModeChange} title="xyzSpec" tabs={tabs} activeTab={activeTab} onTabChange={tab => setActiveTab(tab as DrawerTab)}>
          {activeTab === 'gallery' && galleryPanel}
          {activeTab === 'objects' ? (
            <div className="object-workspace">
              <XyzDslTreeView document={document} selectedNodeId={selectedNodeId} onSelectNode={onSelectNode} />
              <SelectedNodeInspector
                node={selectedNode}
                canEdit={selectedNodeCanEdit}
                selectionPath={selectionPath}
                onClearSelection={onClearSelection}
                onMove={onMoveNode}
                onResize={onResizeNode}
                onRotate={onRotateNode}
                onPathNodeSelect={onPathNodeSelect}
                onPropertyChange={onNodePropertyChange}
                onSelectNode={(id) => onSelectNode?.(id)}
                linearStepChoice={linearStepChoice}
                rotationStep={rotationStep}
                onLinearStepChoiceChange={onLinearStepChoiceChange}
                onRotationStepChange={onRotationStepChange}
              />
            </div>
          ) : null}

          {activeTab === 'assets' ? <div className="drawer-tool-section">{assetsPanel}</div> : null}

          {activeTab === 'data' ? <div className="drawer-tool-section"><XyzDslTransactionControls
            publicKey={transactionPublicKey}
            publicKeyShareUrl={transactionPublicKeyShareUrl}
            range={transactionRange}
            loading={transactionsLoading}
            error={transactionError}
            tipHeight={tipHeight}
            tipLoading={tipLoading}
            tipError={tipError}
            transactionCount={transactionCount}
            acceptedCount={acceptedTransactionCount}
            rejectedCount={rejectedTransactions.length}
            secondaryTenantCount={secondaryTenants.length}
            onPublicKeyChange={onTransactionPublicKeyChange}
            onRangeChange={onTransactionRangeChange}
            onReload={onReloadTransactions}
            onUseTip={onUseTransactionTip}
          />
          <SecondaryTenantPanel
            tenants={secondaryTenants}
            onReplay={onSecondaryReplay}
            onPlaybackToggle={onSecondaryPlaybackToggle}
            onPlaybackSpeedChange={onSecondaryPlaybackSpeedChange}
            onPlaybackSeek={onSecondaryPlaybackSeek}
            onLoadHistory={onLoadSecondaryHistory}
            onEnabledChange={onSecondaryEnabledChange}
            onRangeChange={onSecondaryRangeChange}
          /></div> : null}

          {activeTab === 'source' ? <div className="drawer-tool-section"><XyzDslEditor
            actions={
              <button type="button" disabled={!hasRemoteBaseline || !hasAuthoringEdits} onClick={onResetToRemote}> {t("Reset to remote")} </button>
            }
            description={describeAuthoringState(hasRemoteBaseline, hasAuthoringEdits, remoteBaselineChanged)}
            status={renderAuthoringStatus(
              hasRemoteBaseline,
              hasAuthoringEdits,
              remoteBaselineChanged,
              authoringChangeSummary,
            )}
            value={source}
            onChange={onChange}
          />

          {mappedTransactionSource.trim().length > 0 ? (
            <details className="remote-baseline-reference">
              <summary>{t("Original remote declarations")}</summary>
              <label className="xyzdsl-editor xyzdsl-editor-readonly">
                <span>{t("Mapped spatial declarations")}</span>
                <small>{t("Current remote baseline used for reset.")}</small>
                <textarea spellCheck={false} value={mappedTransactionSource} wrap="off" readOnly />
              </label>
            </details>
          ) : null}</div> : null}

          {activeTab === 'problems' ? <div className="drawer-tool-section problems-panel">
          {problemCount === 0 ? <p className="empty-panel-message">{t("No problems detected.")}</p> : null}
          {document.diagnostics.length > 0 ? (
            <details className="diagnostics" aria-label={t("Spatial declaration diagnostics")}>
              <summary>{t("Diagnostics")}</summary>
              <ul>
                {document.diagnostics.map((diagnostic, index) => (
                  <li key={`${diagnostic.line}-${index}`}>
                    <strong>{t("Line")} {diagnostic.line}:</strong> {diagnostic.message}
                  </li>
                ))}
              </ul>
            </details>
          ) : null}

          {rejectedTransactions.length > 0 ? (
            <details className="diagnostics" aria-label={t("Spatial transaction diagnostics")}>
              <summary>{t("Spatial transaction diagnostics")}</summary>
              <ul>
                {rejectedTransactions.map((rejection) => (
                  <li key={rejection.id}>
                    <strong>{rejection.id}:</strong> {rejection.memoPreview || '(empty memo)'}
                    <ul>
                      {rejection.reasons.map((reason) => (
                        <li key={reason}>{reason}</li>
                      ))}
                    </ul>
                  </li>
                ))}
              </ul>
            </details>
          ) : null}
          </div> : null}
    </WorkspacePanel>
  );
}
