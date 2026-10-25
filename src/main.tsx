import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './styles.css';
import { initializeLocale } from './i18n';

const disposeLocale = initializeLocale();
if (import.meta.hot) import.meta.hot.dispose(disposeLocale);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
