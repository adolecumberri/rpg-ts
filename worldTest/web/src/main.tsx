import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
// The pixel-art design system: the only stylesheet (the legacy
// index.css and UI were removed).
import './pixelUI.css';

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
    <React.StrictMode>
        <App />
    </React.StrictMode>,
);
