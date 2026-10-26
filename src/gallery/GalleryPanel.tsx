import { t, useLocale } from '../i18n';
import { GalleryShareButton } from './GalleryShareButton';
import { useState } from 'react';
import type { GalleryDocument } from './gallery';
export function GalleryPanel({ documents, onChange, onOpen }: {
  documents: GalleryDocument[]; onChange: (documents: GalleryDocument[]) => void; onOpen: (index: number) => void;
}) {
  useLocale();
  const [error, setError] = useState('');
  return <section className="gallery-panel">
    <h2>{t("Gallery")}</h2>
    <p>{t("Swipe vertically between documents and horizontally between viewpoints. Tap Look around to explore a space.")}</p>
    <label>{t("Add XYZDSL documents")}<input type="file" accept=".xyzdsl,.xyz" multiple onChange={async event => {
      const files = Array.from(event.target.files ?? []);
      event.target.value = '';
      try {
        const added = await Promise.all(files.map(async file => ({ id: crypto.randomUUID(), title: file.name.replace(/\.(xyzdsl|xyz)$/i, ''), source: await file.text() })));
        onChange([...documents, ...added]); setError('');
      } catch { setError('Could not read the selected documents.'); }
    }} /></label>
    {error && <p role="alert">{t(error)}</p>}
    {!documents.length && <p>{t("No gallery documents. The viewer opens loaded remote sources, or the local draft when none are loaded.")}</p>}
    <ol>{documents.map((document, index) => <li key={document.id}>
      <button type="button" onClick={() => onOpen(index)}>{document.title}<small>{t("Open tour →")}</small></button>
      <GalleryShareButton document={document} />
    </li>)}</ol>
  </section>;
}
