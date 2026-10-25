import { GalleryShareButton } from './GalleryShareButton';
import { useState } from 'react';
import type { GalleryDocument } from './gallery';
export function GalleryPanel({ documents, onChange, onOpen }: {
  documents: GalleryDocument[]; onChange: (documents: GalleryDocument[]) => void; onOpen: (index: number) => void;
}) {
  const [error, setError] = useState('');
  return <section className="gallery-panel">
    <h2>Gallery</h2>
    <p>Explore separate XYZDSL documents. Swipe inward from the top or bottom edge to change documents, and use the viewpoint arrows to tour each space.</p>
    <label>Add XYZDSL documents<input type="file" accept=".xyzdsl,.xyz" multiple onChange={async event => {
      const files = Array.from(event.target.files ?? []);
      event.target.value = '';
      try {
        const added = await Promise.all(files.map(async file => ({ id: crypto.randomUUID(), title: file.name.replace(/\.(xyzdsl|xyz)$/i, ''), source: await file.text() })));
        onChange([...documents, ...added]); setError('');
      } catch { setError('Could not read the selected documents.'); }
    }} /></label>
    {error && <p role="alert">{error}</p>}
    {!documents.length && <p>No gallery documents. The viewer opens loaded remote sources, or the local draft when none are loaded.</p>}
    <ol>{documents.map((document, index) => <li key={document.id}>
      <button type="button" onClick={() => onOpen(index)}>{document.title}<small>Open tour →</small></button>
      <GalleryShareButton document={document} />
    </li>)}</ol>
  </section>;
}
