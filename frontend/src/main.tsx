import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from './lib/queryClient';
import { api } from './lib/api';
import { App } from './App';
import './styles.css';

// Dev: exponer api en window para smoke tests desde DevTools console.
// Ej: await window.__api.tickets.changeStatus('1', 'done')
if (import.meta.env.DEV) {
  (window as unknown as { __api: typeof api; __qc: typeof queryClient }).__api = api;
  (window as unknown as { __api: typeof api; __qc: typeof queryClient }).__qc = queryClient;
}

const rootEl = document.getElementById('root');
if (!rootEl) throw new Error('#root not found');

createRoot(rootEl).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>,
);
