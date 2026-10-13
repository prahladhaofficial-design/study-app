import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './index.css'

try {
  document.documentElement.dataset.theme = localStorage.getItem('theme') || 'dark'
} catch {
  /* default theme from index.html */
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
