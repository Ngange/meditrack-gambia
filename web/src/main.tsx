import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './styles/theme.css';
import App from './App.tsx';
// Shared page styles (cards, buttons, form fields, pills). Loaded after App so it comes after the
// component styles it builds on.
import './styles/shared.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
