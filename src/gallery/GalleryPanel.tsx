import { useState } from 'react';
import type { GalleryDocument } from './gallery';
export function GalleryPanel({ documents, onChange, onOpen }: {
  documents: GalleryDocument[]; onChange: (documents: GalleryDocument[]) => void; onOpen: (index: number) => void;
}) {
  const [error, setError] = useState('');
  return <section className="gallery-panel">
    <h2>Gallery</h2>
    <p>Explore separate XYZDSL documents. Swipe up or down to change documents, and use the viewpoint arrows to tour each space.</p>
    <label>Add XYZDSL documents<input type="file" accept=".xyzdsl,.xyz" multiple onChange={async event => {
      const files = Array.from(event.target.files ?? []);
      event.target.value = '';
      try {
        const added = await Promise.all(files.map(async file => ({ id: crypto.randomUUID(), title: file.name.replace(/\.(xyzdsl|xyz)$/i, ''), source: await file.text() })));
        onChange([...documents, ...added]); setError('');
      } catch { setError('Could not read the selected documents.'); }
    }} /></label>
    {error && <p role="alert">{error}</p>}
    {!documents.length && <p>No gallery documents. Mobile opens the local draft.</p>}
    <ol>{documents.map((document, index) => <li key={document.id}>
      <button type="button" onClick={() => onOpen(index)}>{document.title}<small>Open tour →</small></button>
      <button type="button" aria-label={`Remove ${document.title} from gallery`} onClick={() => onChange(documents.filter((_, i) => i !== index))}>×</button>
    </li>)}</ol>
  </section>;
}
