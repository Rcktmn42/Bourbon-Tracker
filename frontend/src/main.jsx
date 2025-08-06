// frontend/main.jsx

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import { AuthProvider } from './contexts/AuthContext.jsx';  // ← import the provider
import App from './App.jsx';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AuthProvider>    {/* ← wrap your app */}
      <App />
    </AuthProvider>
  </StrictMode>,
);
