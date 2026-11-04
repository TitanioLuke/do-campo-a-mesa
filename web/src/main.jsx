import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import 'bootstrap/dist/css/bootstrap.min.css'; // componentes e grelha do Bootstrap 5
import './estilos/main.scss';                  // estilos próprios em SASS (Mobile First)

import App from './App';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>
);
