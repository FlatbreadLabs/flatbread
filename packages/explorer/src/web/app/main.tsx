import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { ThemeProvider } from './hooks/useTheme';
import { EffortGraphApp } from './components/EffortGraphApp';
import './globals.css';

const root = document.getElementById('root');
if (!root) {
  throw new Error('Flatbread explorer root element #root was not found');
}

createRoot(root).render(
  <StrictMode>
    <ThemeProvider>
      <EffortGraphApp />
    </ThemeProvider>
  </StrictMode>
);
