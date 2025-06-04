import { useState, useEffect } from 'react';
import './App.css';
import Navbar from './components/Navbar';
import Home from './components/Home';
import AddDiplomaModal from './components/AddDiplomaModal';
import contractService from './services/contractService';

function App() {
  const [currentPage, setCurrentPage] = useState('home');
  const [isConnected, setIsConnected] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [error, setError] = useState('');
  const [isAddDiplomaModalOpen, setIsAddDiplomaModalOpen] = useState(false);

  useEffect(() => {
    const initializeApp = async () => {
      try {
        // Initialiser le service de contrat
        const initialized = await contractService.init();
        setIsInitialized(initialized);

        if (initialized) {
          // Vérifier si un compte est connecté
          const account = await contractService.getConnectedAccount();
          setIsConnected(!!account);

          // Vérifier si l'utilisateur est administrateur
          if (account) {
            const adminStatus = await contractService.isAdmin();
            console.log('Initial admin status check:', adminStatus, 'for account:', account);
            setIsAdmin(adminStatus);
          }
        }
      } catch (error) {
        console.error("Erreur lors de l'initialisation de l'application:", error);
        setError("Erreur lors de la connexion à la blockchain. Assurez-vous que MetaMask est installé et configuré correctement.");
      }
    };

    initializeApp();

    // Fonction pour mettre à jour le statut d'administrateur
    const updateAdminStatus = async () => {
      try {
        // Réinitialiser le service de contrat pour s'assurer qu'il utilise le compte actuel
        await contractService.init();
        
        const account = await contractService.getConnectedAccount();
        setIsConnected(!!account);
        
        if (account) {
          // Forcer une nouvelle vérification du statut d'administrateur
          const adminStatus = await contractService.isAdmin();
          console.log('Admin status updated:', adminStatus, 'for account:', account);
          setIsAdmin(adminStatus);
        } else {
          setIsAdmin(false);
        }
      } catch (error) {
        console.error("Erreur lors de la mise à jour du statut d'administrateur:", error);
        setIsAdmin(false);
      }
    };

    // Écouter les changements de réseau Ethereum
    if (window.ethereum) {
      window.ethereum.on('chainChanged', () => {
        window.location.reload();
      });
      
      // Écouter les changements de compte MetaMask
      window.ethereum.on('accountsChanged', (accounts) => {
        console.log('MetaMask account changed:', accounts[0]);
        // Rafraîchir la page immédiatement pour réinitialiser complètement l'application
        window.location.reload();
      });
    }

    return () => {
      // Nettoyer les écouteurs d'événements
      if (window.ethereum) {
        window.ethereum.removeAllListeners('chainChanged');
        window.ethereum.removeAllListeners('accountsChanged');
      }
    };
  }, []);

  // Check URL hash on component mount and when hash changes
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace('#', '');
      if (hash) {
        setCurrentPage(hash);
        // If the hash is 'add', open the modal
        if (hash === 'add') {
          setIsAddDiplomaModalOpen(true);
        }
      }
    };

    // Check hash on initial load
    handleHashChange();

    // Add event listener for hash changes
    window.addEventListener('hashchange', handleHashChange);

    // Clean up event listener
    return () => {
      window.removeEventListener('hashchange', handleHashChange);
    };
  }, []);

  const handlePageChange = (page) => {
    setCurrentPage(page);
    
    // If navigating to the add page, open the modal
    if (page === 'add') {
      setIsAddDiplomaModalOpen(true);
    }
  };

  const renderPage = () => {
    switch (currentPage) {
      case 'home':
        return <Home />;
      case 'add':
        // For 'add', we'll show Home but with the modal open
        return <Home />;
      default:
        return <Home />;
    }
  };

  // Show loading state while initializing
  if (!isInitialized) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-blue-600"></div>
          <p className="mt-4 text-xl text-gray-600 font-medium">Chargement de l'application...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar onPageChange={handlePageChange} />
      
      <div className="container mx-auto px-4 py-6 flex-grow">
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}
        
        {!window.ethereum && (
          <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded mb-4">
            MetaMask n'est pas détecté. Veuillez installer l'extension MetaMask pour utiliser toutes les fonctionnalités de cette application.
          </div>
        )}
        
        {renderPage()}
      </div>
      
      <footer className="bg-gray-100 py-6 border-t border-gray-200 mt-auto">
        <div className="container mx-auto text-center">
          <span className="text-gray-600">CertifDiploma &copy; {new Date().getFullYear()} - Application de certification de diplômes sur la blockchain</span>
        </div>
      </footer>
      
      {/* Add Diploma Modal */}
      <AddDiplomaModal 
        isOpen={isAddDiplomaModalOpen} 
        onClose={() => {
          setIsAddDiplomaModalOpen(false);
          // Reset to home page when modal is closed
          if (currentPage === 'add') {
            setCurrentPage('home');
            window.location.hash = 'home';
          }
        }} 
      />
    </div>
  );
}

export default App;
