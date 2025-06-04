import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

// Utilisation du composant App original avec gestion d'erreurs améliorée
try {
  const rootElement = document.getElementById('root');
  
  if (rootElement) {
    createRoot(rootElement).render(
      <StrictMode>
        <App />
      </StrictMode>
    );
    console.log('Application rendue avec succès');
  } else {
    console.error("L'élément avec l'ID 'root' n'a pas été trouvé dans le DOM.");
  }
} catch (error) {
  console.error('Erreur lors du rendu de l\'application:', error);
  // Afficher une erreur visible dans le DOM pour faciliter le débogage
  const rootElement = document.getElementById('root');
  if (rootElement) {
    rootElement.innerHTML = `
      <div style="padding: 20px; max-width: 800px; margin: 0 auto; color: #721c24; background-color: #f8d7da; border: 1px solid #f5c6cb; border-radius: 5px;">
        <h2>Erreur de chargement</h2>
        <p>Une erreur s'est produite lors du chargement de l'application:</p>
        <pre style="background-color: #f8f9fa; padding: 10px; border-radius: 5px;">${error.message}</pre>
      </div>
    `;
  }
}
