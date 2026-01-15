import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { LiveRegionProvider } from './components/common/LiveRegion';
import App from './App';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <LiveRegionProvider>
        <App />
      </LiveRegionProvider>
    </BrowserRouter>
  </StrictMode>
);
