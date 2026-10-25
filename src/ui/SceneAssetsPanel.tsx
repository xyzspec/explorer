import { t, useLocale } from '../i18n';
export function SceneAssetsPanel({ isLocal, error, onOpenFolder, onOpenBundle, onUseRemote }: {
  isLocal: boolean;
  error: string;
  onOpenFolder: (files: File[]) => Promise<void>;
  onOpenBundle: (file: File) => Promise<void>;
  onUseRemote: () => void;
}) {
  useLocale();
  return <>
    <p>{t("Models:")} {isLocal ? t("local scene") : t("remote store")}</p>
    {isLocal && <button type="button" onClick={onUseRemote}>{t("Use remote model store")}</button>}
    <label className="scene-folder-input">{t("Open XYZ bundle")} <input type="file" accept=".xyz" onChange={event => {
        const file = event.target.files?.[0];
        event.target.value = '';
        if (file) void onOpenBundle(file);
      }} />
    </label>
    <label className="scene-folder-input">{t("Open scene folder")} <input type="file" multiple {...{ webkitdirectory: '' }} onChange={event => {
        const files = Array.from(event.target.files ?? []);
        event.target.value = '';
        void onOpenFolder(files);
      }} />
    </label>
    <p>{t("Open a self-contained .xyz bundle, or choose a folder containing scene.xyz and its GLB models. Files stay in your browser.")}</p>
    {error && <p role="alert">{t(error)}</p>}
  </>;
}
