import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
// The pixel-art design system: loaded after index.css so its canvas
// overrides and unit tokens win over the legacy layout.
import './pixelUI.css';

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
    <React.StrictMode>
        <App />
    </React.StrictMode>,
);
