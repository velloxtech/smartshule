import {StrictMode,Suspense} from 'react';
import {AppErrorBoundary} from './components/common/AppErrorBoundary';
import {installModuleRecovery} from './utils/chunkRecovery';
import {ViewLoadingSkeleton} from './components/common/ViewLoadingSkeleton';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import { AuthProvider } from './context/AuthContext';
import './index.css';

// Ensure WebAuthn always operates on http://localhost for local loopback development
if (typeof window !== 'undefined' && window.location.hostname === '127.0.0.1') {
  window.location.hostname = 'localhost';
}

installModuleRecovery();
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppErrorBoundary><Suspense fallback={<ViewLoadingSkeleton title="Loading school portal…"/>}><AuthProvider>
      <App />
    </AuthProvider></Suspense></AppErrorBoundary>
  </StrictMode>,
);
