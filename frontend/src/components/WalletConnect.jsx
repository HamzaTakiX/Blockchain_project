import { useState, useEffect } from 'react';
import contractService from '../services/contractService';

const WalletConnect = ({ onConnect }) => {
  const [account, setAccount] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    // Vérifier si l'utilisateur est déjà connecté à MetaMask
    const checkConnection = async () => {
      if (window.ethereum) {
        try {
          const accounts = await window.ethereum.request({ method: 'eth_accounts' });
          if (accounts.length > 0) {
            setAccount(accounts[0]);
            await checkAdminStatus(accounts[0]);
            if (onConnect) onConnect(accounts[0]);
          }
        } catch (error) {
          console.error('Erreur lors de la vérification de la connexion:', error);
        }
      }
    };

    checkConnection();

    // Écouter les changements de compte
    if (window.ethereum) {
      window.ethereum.on('accountsChanged', (accounts) => {
        console.log('WalletConnect - Account changed, refreshing page immediately');
        // Rafraîchir la page immédiatement pour réinitialiser complètement l'application
        window.location.reload();
      });
    }

    return () => {
      // Nettoyer les écouteurs d'événements
      if (window.ethereum) {
        window.ethereum.removeAllListeners('accountsChanged');
      }
    };
  }, [onConnect]);

  const checkAdminStatus = async (address) => {
    try {
      const adminStatus = await contractService.isAdmin();
      setIsAdmin(adminStatus);
    } catch (error) {
      console.error("Erreur lors de la vérification du statut d'administrateur:", error);
      setIsAdmin(false);
    }
  };

  const connectWallet = async () => {
    setIsConnecting(true);
    setError('');

    try {
      if (!window.ethereum) {
        setError('MetaMask n\'est pas installé. Veuillez installer MetaMask pour utiliser cette application.');
        return;
      }

      const address = await contractService.connectWallet();
      setAccount(address);
      await checkAdminStatus(address);
      if (onConnect) onConnect(address);
    } catch (error) {
      console.error('Erreur lors de la connexion au portefeuille:', error);
      setError('Erreur lors de la connexion à MetaMask. Veuillez réessayer.');
    } finally {
      setIsConnecting(false);
    }
  };

  const formatAddress = (address) => {
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
  };

  return (
    <div className="flex items-center">
      {!account ? (
        <div>
          <button
            className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded transition duration-300"
            onClick={connectWallet}
            disabled={isConnecting}
          >
            {isConnecting ? 'Connexion...' : 'Connecter avec MetaMask'}
          </button>
          {error && <div className="bg-red-100 border border-red-400 text-red-700 px-3 py-2 rounded mt-2 text-sm">{error}</div>}
        </div>
      ) : (
        <div className="flex items-center">
          <span className="bg-green-500 text-white text-xs px-2 py-1 rounded mr-2">Connecté</span>
          <span className="font-mono text-sm">{formatAddress(account)}</span>
          {isAdmin && <span className="bg-white text-blue-600 text-xs font-semibold px-3 py-1 rounded-full ml-2 shadow-md hover:shadow-lg transition-all duration-200 transform hover:scale-105">Admin</span>}
        </div>
      )}
    </div>
  );
};

export default WalletConnect;
