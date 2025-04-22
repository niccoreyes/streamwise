import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'

// Remove the "lovable badge" if present, and observe for dynamic injection
function removeLovableBadge() {
  const badge = document.getElementById('lovable-badge');
  if (badge) badge.remove();
}
removeLovableBadge();
const observer = new MutationObserver(removeLovableBadge);
observer.observe(document.body, { childList: true, subtree: true });

createRoot(document.getElementById("root")!).render(<App />);
