import { t, useLocale } from '../i18n';
import type { GalleryDocument } from './gallery';
import { GalleryShareButton } from './GalleryShareButton';

export function GalleryNavigation({ document, index, count, isolated, onBack, onTraverse }: {
  document: GalleryDocument;
  index: number;
  count: number;
  isolated: boolean;
  onBack: () => void;
  onTraverse: (delta: number) => void;
}) {
  useLocale();
  return <nav className={`gallery-navigation${isolated || count < 2 ? ' gallery-navigation--single' : ''}`} aria-label={t('Gallery navigation')}>
    <div className="gallery-caption">
      <strong title={document.title} aria-live="polite">{document.title}</strong>
      <GalleryShareButton key={document.id} document={document} />
    </div>
    {isolated ? <button className="gallery-back" type="button" onClick={onBack}>{t('Back to gallery')}</button> : count > 1 && <>
      <button className="gallery-edge gallery-edge--previous" type="button" data-gallery-direction="previous"
        aria-label={t('Previous gallery document')} title={t('Previous gallery document')}
        disabled={index === 0} onClick={() => onTraverse(-1)}>
        <svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m6 14 6-6 6 6" /></svg>
      </button>
      <div className="gallery-edge-bottom">
        <span className="gallery-position" role="status" aria-label={t('Document {current} of {total}', { current: index + 1, total: count })} aria-live="polite" aria-atomic="true">{index + 1} / {count}</span>
        <button className="gallery-edge gallery-edge--next" type="button" data-gallery-direction="next"
          aria-label={t('Next gallery document')} title={t('Next gallery document')}
          disabled={index === count - 1} onClick={() => onTraverse(1)}>
          <svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m6 10 6 6 6-6" /></svg>
        </button>
      </div>
    </>}
  </nav>;
}
