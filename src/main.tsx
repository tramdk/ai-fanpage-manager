import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { LanguageProvider } from './LanguageContext';

import { BrowserRouter } from 'react-router-dom';

// Automatically reload if a lazy-loaded chunk is missing (e.g., after a new deployment)
window.addEventListener('vite:preloadError', (event) => {
  console.warn('Detected missing chunk, reloading to get new assets...');
  window.location.reload();
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <LanguageProvider>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </LanguageProvider>
  </StrictMode>,
);
