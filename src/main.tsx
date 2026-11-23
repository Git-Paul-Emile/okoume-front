import '@fontsource-variable/plus-jakarta-sans';
import './styles/globals.css';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { retireOfflineWorker } from './lib/pwa';
import { recordVisit } from './features/analytics/analytics.api';
import { env } from './config/env';
import { startErrorReporting } from './lib/errorReporting';
import { installFrenchMessages } from './lib/zodMessages';

// Messages de validation clairs, en français, sur tous les formulaires
installFrenchMessages();

void startErrorReporting(env.sentryDsn, __APP_RELEASE__ || undefined);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

retireOfflineWorker();
recordVisit();
