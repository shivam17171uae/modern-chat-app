// src/main.jsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './App.css';
import { ThemeProvider } from './context/ThemeContext';
import { SocketProvider } from './context/SocketContext'; // <-- IMPORT

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ThemeProvider>
      <SocketProvider> {/* <-- WRAP THE APP */}
        <App />
      </SocketProvider>
    </ThemeProvider>
  </React.StrictMode>,
);