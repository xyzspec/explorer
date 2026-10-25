import { t, useLocale } from '../i18n';
import { useEffect, useState } from 'react';
import type { GalleryDocument } from './gallery';
import { createGalleryShareUrl } from './galleryShareUrl';

export function GalleryShareButton({ document }: { document: GalleryDocument }) {
  useLocale();
  const [status, setStatus] = useState<'idle' | 'copied' | 'error'>('idle');
  const [manualLink, setManualLink] = useState('');
  useEffect(() => {
    if (status !== 'copied') return;
    const timer = window.setTimeout(() => setStatus('idle'), 3000);
    return () => window.clearTimeout(timer);
  }, [status]);
  return <div className="gallery-share">
    <button type="button" aria-label={t("Copy link to {title}", { title: document.title })} title={t("Share {title}", { title: document.title })} onClick={async () => {
      const link = createGalleryShareUrl(document, window.location.href);
      try {
        await navigator.clipboard.writeText(link);
        setStatus('copied'); setManualLink('');
      } catch { setStatus('error'); setManualLink(link); }
    }}>
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="m8.6 10.5 6.8-4M8.6 13.5l6.8 4"/></svg>
    </button>
    {status !== 'idle' && <small role="status">{status === 'copied' ? t("Link copied") : t("Copy the link below")}</small>}
    {manualLink && <input aria-label={t("Share link for {title}", { title: document.title })} readOnly value={manualLink} onFocus={event => event.currentTarget.select()} />}
  </div>;
}
