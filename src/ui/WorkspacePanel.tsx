import { t, useLocale } from '../i18n';
import type { ReactNode } from 'react';
export function WorkspacePanel({ mode, open, allowModeSwitch = true, onModeChange, title = t("XYZ viewer"), tabs, activeTab, onTabChange, children }: {
 mode: 'viewer' | 'editor'; open: boolean; allowModeSwitch?: boolean;
 onModeChange: (mode: 'viewer' | 'editor') => void; title?: string;
 tabs: { id: string; label: string; count?: number }[]; activeTab: string;
 onTabChange: (tab: string) => void; children: ReactNode;
}) {
  useLocale();
 return <aside className={`xyzdsl-drawer xyzdsl-drawer--${mode} ${open ? 'is-open' : ''}`}>
 {allowModeSwitch && <div className="mode-controls" aria-label={t("Application mode")}><button className="mode-toggle" type="button" aria-pressed={mode === 'editor'} onClick={() => onModeChange(mode === 'editor' ? 'viewer' : 'editor')}>{mode === 'editor' ? t("Viewer mode") : t("Editor mode")}</button></div>}
 {mode === 'editor' && open && <div className="drawer-panel"><header className="drawer-titlebar"><strong>{title}</strong><span>{t("Workspace")}</span><button className="drawer-close-button" type="button" aria-label={t("Close workspace and return to viewer mode")} title={t("Close workspace")} onClick={() => onModeChange('viewer')}>×</button></header>
 <nav className="drawer-tabs" role="tablist" aria-label={t("Workspace panels")}>{tabs.map(tab => <button key={tab.id} type="button" role="tab" aria-selected={activeTab === tab.id} onClick={() => onTabChange(tab.id)}>{tab.label}{tab.count ? <span>{tab.count}</span> : null}</button>)}</nav>
 <div className="drawer-content" role="tabpanel">{children}</div></div>}
 </aside>;
}
