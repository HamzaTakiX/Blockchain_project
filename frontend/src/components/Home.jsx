import { useState, useEffect } from 'react';
import contractService from '../services/contractService';
import AddDiplomaModal from './AddDiplomaModal';
import SearchDiplomas from './SearchDiplomas';
import UserDiplomas from './UserDiplomas';


const Home = () => {
  const [totalDiplomas, setTotalDiplomas] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [connectionError, setConnectionError] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [searchAddress, setSearchAddress] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [diplomaFound, setDiplomaFound] = useState(false);
  const [diplomaData, setDiplomaData] = useState(null);
  const [searchError, setSearchError] = useState('');
  const [connectedAddress, setConnectedAddress] = useState(null);
  const [userDiplomas, setUserDiplomas] = useState([]);
  const [isLoadingUserDiplomas, setIsLoadingUserDiplomas] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [newDiplomaData, setNewDiplomaData] = useState(null);

  // Fonction pour rechercher un diplôme par adresse Ethereum
  const searchDiploma = async () => {
    // Réinitialiser les états
    setDiplomaFound(false);
    setDiplomaData(null);
    setSearchError('');
    
    // Vérifier que l'adresse est valide
    if (!searchAddress || !searchAddress.match(/^0x[a-fA-F0-9]{40}$/)) {
      setSearchError("Veuillez entrer une adresse Ethereum valide");
      return;
    }
    
    setIsSearching(true);
    
    try {
      // S'assurer que le service de contrat est initialisé
      if (!contractService.initialized) {
        await contractService.init();
      }
      
      // S'assurer que l'utilisateur est connecté à MetaMask
      if (window.ethereum) {
        try {
          // Demander à l'utilisateur de se connecter s'il ne l'est pas déjà
          const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
          console.log("Compte connecté:", accounts[0]);
          
          // Mettre à jour le provider et le signer avec le compte actuel
          await contractService.connectWallet();
        } catch (error) {
          console.error("Erreur lors de la connexion au portefeuille:", error);
          // Continuer même si l'utilisateur n'est pas connecté à MetaMask
          // car la lecture des données du contrat ne nécessite pas d'être connecté
        }
      }
      
      // Vérifier si un diplôme existe pour cette adresse
      const exists = await contractService.verifyDiploma(searchAddress);
      
      if (!exists) {
        setSearchError("Aucun diplôme trouvé pour cette adresse");
        setIsSearching(false);
        return;
      }
      
      // Récupérer les données du diplôme
      const diploma = await contractService.getDiploma(searchAddress);
      
      if (diploma) {
        setDiplomaData({
          studentName: diploma.studentName,
          specialization: diploma.specialization,
          issueDate: diploma.issueDate.getTime(), // Convertir en timestamp pour l'affichage
          ipfsHash: diploma.ipfsHash,
          isValid: diploma.isValid
        });
        setDiplomaFound(true);
      } else {
        setSearchError("Erreur lors de la récupération des données du diplôme");
      }
    } catch (error) {
      console.error("Erreur lors de la recherche du diplôme:", error);
      setSearchError(`Erreur: ${error.message || 'Une erreur est survenue lors de la recherche'}`); 
    } finally {
      setIsSearching(false);
    }
  };
  
  // Vérifier si l'utilisateur est administrateur
  useEffect(() => {
    const setupUserContext = async () => {
      try {
        console.log("Home.jsx: useEffect - Initializing contract service...");
        // contractService.init() should handle wallet connection (e.g., MetaMask prompt) if not already connected.
        const initSuccess = await contractService.init(); 
        
        if (!initSuccess) {
            console.error("Home.jsx: Contract service initialization failed. User might need to connect their wallet or there's a network issue.");
            setConnectionError(true);
            setIsLoading(false); // Ensure loading state is updated
            return;
        }
        console.log("Home.jsx: Contract service initialized successfully.");

        console.log("Home.jsx: Attempting to get connected account from contractService...");
        const account = await contractService.getConnectedAccount();
        
        if (account) {
          console.log(`Home.jsx: Connected account found: ${account}`);
          setConnectedAddress(account);
          // Call fetchTotalDiplomas here if it depends on a connection, or earlier if not
          // fetchTotalDiplomas(); // Assuming this is for general stats and can run

          // Now fetch user-specific diplomas
          console.log(`Home.jsx: Calling fetchUserDiplomas for account: ${account}`);
          fetchUserDiplomas(account);

          console.log("Home.jsx: Checking admin status...");
          const adminStatus = await contractService.isAdmin();
          console.log(`Home.jsx: Admin status for ${account}: ${adminStatus}`);
          setIsAdmin(adminStatus);
        } else {
          console.warn("Home.jsx: No connected account found after contractService.init(). User may need to connect their wallet through UI.");
          setConnectedAddress(null);
          setIsAdmin(false);
          // UserDiplomas will likely be empty, so "Vos Diplômes" won't show.
          // Consider setting a state here to guide the user, e.g., setShowConnectWalletMessage(true);
        }
      } catch (error) {
        console.error('Home.jsx: Error in useEffect setupUserContext:', error);
        setIsAdmin(false);
        setConnectedAddress(null);
        setConnectionError(true); // Display a general connection error message
      } finally {
        // Make sure loading indicators are turned off if they were set at the start of this function
        // setIsLoading(false); // This was for the general stats, might need adjustment
      }
    };

    setupUserContext();

    // Account change handling - This reloads the page, causing setupUserContext to run again.
    const handleAccountsChanged = (accounts) => {
      console.log('Home.jsx: MetaMask account changed. Reloading page to reflect new account context.');
      window.location.reload();
    };

    if (window.ethereum) {
      // It's good practice to remove listener before adding to prevent duplicates if component re-renders unexpectedly.
      window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
      window.ethereum.on('accountsChanged', handleAccountsChanged);
    }

    // Cleanup listener on component unmount
    return () => {
      if (window.ethereum) {
        window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
      }
    };
  }, []); // Empty dependency array: runs once on mount and after page reloads triggered by accountsChanged.
  
  // Fonction pour récupérer uniquement les diplômes de l'utilisateur connecté
  const fetchUserDiplomas = async (address) => {
    if (!address) {
      console.log("fetchUserDiplomas: No address provided, returning.");
      return;
    }
    
    console.log(`fetchUserDiplomas: Called for address ${address}`);
    setIsLoadingUserDiplomas(true);
    setUserDiplomas([]); // Reset diplomas array to ensure we don't show stale data
    
    try {
      const matchingDiplomas = [];
      
      // 1. Vérifier et récupérer uniquement le diplôme de l'adresse connectée
      console.log(`fetchUserDiplomas: Checking for diploma at address ${address}`);
      const diplomaExists = await contractService.verifyDiploma(address);
      
      if (diplomaExists) {
        console.log(`fetchUserDiplomas: Diploma verified for address ${address}. Fetching details.`);
        const diplomaData = await contractService.getDiploma(address);
        
        if (diplomaData && diplomaData.studentName) {
          matchingDiplomas.push({
            studentName: diplomaData.studentName,
            specialization: diplomaData.specialization,
            issueDate: diplomaData.issueDate.getTime(),
            ipfsHash: diplomaData.ipfsHash,
            isValid: diplomaData.isValid,
            studentAddress: address
          });
          console.log(`fetchUserDiplomas: Added diploma for ${address}.`);
        } else {
          console.warn(`fetchUserDiplomas: Diploma for ${address} verified, but getDiploma returned no data or no studentName.`);
        }
      } else {
        console.log(`fetchUserDiplomas: No diploma found for connected address ${address}.`);
      }
      
      console.log(`fetchUserDiplomas: Total of ${matchingDiplomas.length} diplomas found for user ${address}.`);
      setUserDiplomas(matchingDiplomas);
    } catch (error) {
      console.error("fetchUserDiplomas: Error during diploma retrieval:", error);
      setUserDiplomas([]); // Ensure it's empty on error to prevent stale data display
    } finally {
      setIsLoadingUserDiplomas(false);
      console.log("fetchUserDiplomas: Finished.");
    }
  };

  const fetchTotalDiplomas = async () => {
    try {
      console.log('Initializing contract service...');
      // Force isLoading to true at the start
      setIsLoading(true);
      setConnectionError(false);
      
      // Check if the user has explicitly disconnected
      if (contractService.disconnected) {
        console.log('User has explicitly disconnected, not attempting to reconnect');
        setConnectionError(true);
        setIsLoading(false);
        return false;
      }
      
      // Check if MetaMask is installed
      if (!window.ethereum) {
        console.error("MetaMask n'est pas installé");
        setConnectionError(true);
        setIsLoading(false);
        return false;
      }
      
      // Vérifier le réseau actuel
      try {
        const chainId = await window.ethereum.request({ method: 'eth_chainId' });
        console.log(`Réseau connecté: ${chainId}`);
        // Pour Hardhat local, le chainId devrait être 0x539 (1337 en décimal)
        if (chainId !== '0x539') {
          console.warn(`Réseau incorrect. Attendu: 0x539 (Localhost), Actuel: ${chainId}`);
          // Tenter d'abord d'ajouter le réseau avant d'essayer de changer
          try {
            await window.ethereum.request({
              method: 'wallet_addEthereumChain',
              params: [{
                chainId: '0x539',
                chainName: 'Localhost 8545',
                nativeCurrency: { name: 'ETH', symbol: 'ETH', decimals: 18 },
                rpcUrls: ['http://localhost:8545']
              }]
            });
            console.log('Réseau ajouté avec succès');
            
            // Maintenant essayer de changer vers ce réseau
            await window.ethereum.request({
              method: 'wallet_switchEthereumChain',
              params: [{ chainId: '0x539' }] // Localhost 8545
            });
            console.log('Réseau changé avec succès');
          } catch (error) {
            console.error('Erreur lors de l\'ajout ou du changement de réseau:', error);
          }
        }
      } catch (networkError) {
        console.error("Erreur lors de la vérification du réseau:", networkError);
      }
      
      // Try to initialize the contract service
      let initialized = false;
      try {
        // Request account access if needed, but only if not disconnected
        if (!contractService.disconnected) {
          console.log('Demande d\'accès aux comptes...');
          await window.ethereum.request({ method: 'eth_requestAccounts' });
          console.log('Initialisation du service de contrat...');
          initialized = await contractService.init();
          console.log('Contract service initialized:', initialized);
        }
      } catch (error) {
        console.error('Contract initialization error:', error);
        if (error.code === 4001) {
          // L'utilisateur a refusé la connexion
          console.log('Utilisateur a refusé de se connecter à MetaMask');
        }
        setConnectionError(true);
        setIsLoading(false); // Stop loading if initialization fails
        return false; // Return false instead of exiting
      }
      
      if (initialized || contractService.initialized) {
        console.log('Fetching total graduates...');
        try {
          // Vérifier d'abord si le contrat a la fonction getTotalGraduates
          if (typeof contractService.contract.getTotalGraduates !== 'function') {
            console.error('La fonction getTotalGraduates n\'existe pas sur le contrat');
            setConnectionError(true);
            return false;
          }
          
          console.log('Appel de getTotalGraduates...');
          const total = await contractService.getTotalGraduates();
          console.log('Total graduates:', total);
          // Update the state with the new total
          setTotalDiplomas(total);
          setConnectionError(false); // Clear any previous connection error
          return true; // Successfully fetched data
        } catch (error) {
          console.error('Error fetching graduates:', error);
          // Afficher plus de détails sur l'erreur
          if (error.code) {
            console.error(`Code d'erreur: ${error.code}`);
          }
          if (error.message) {
            console.error(`Message d'erreur: ${error.message}`);
          }
          // Set connection error only if we can't get graduates
          setConnectionError(true);
        }
      } else {
        console.error('Contract service initialization failed');
        setConnectionError(true);
      }
    } catch (error) {
      console.error('Erreur lors de la récupération du nombre total de diplômes:', error);
      setConnectionError(true);
    } finally {
      // Always set loading to false at the end
      console.log('Setting isLoading to false');
      setIsLoading(false);
    }
    return false; // Failed to fetch data
  };

  useEffect(() => {
    // Initial fetch of diploma count
    fetchTotalDiplomas();
    
    // Add listeners for blockchain events that might affect the diploma count
    if (window.ethereum) {
      // Listen for account changes
      window.ethereum.on('accountsChanged', () => {
        console.log('Account changed, refreshing diploma count');
        fetchTotalDiplomas();
      });
      
      // Listen for chain changes
      window.ethereum.on('chainChanged', () => {
        console.log('Network changed, refreshing diploma count');
        fetchTotalDiplomas();
      });
    }
    
    // Set up an interval to periodically check for updates (every 30 seconds)
    const intervalId = setInterval(() => {
      console.log('Periodic refresh of diploma count');
      fetchTotalDiplomas();
    }, 30000);
    
    return () => {
      // Clean up listeners and interval
      if (window.ethereum) {
        window.ethereum.removeListener('accountsChanged', fetchTotalDiplomas);
        window.ethereum.removeListener('chainChanged', fetchTotalDiplomas);
      }
      clearInterval(intervalId);
    };
  }, []);
  
  // Add a second useEffect that will re-fetch when contractService is initialized
  useEffect(() => {
    // This will run whenever contractService.initialized changes
    if (contractService.initialized) {
      console.log('Contract service initialized, fetching diploma count');
      fetchTotalDiplomas();
      
      // Set up event listeners on the contract if available
      if (contractService.contract) {
        try {
          // Try to listen for DiplomaAdded events if the contract supports it
          if (contractService.contract.on) {
            console.log('Setting up contract event listeners');
            
            // Listen for any events that might change the diploma count
            contractService.contract.on('DiplomaAdded', () => {
              console.log('DiplomaAdded event detected, refreshing count');
              fetchTotalDiplomas();
            });
            
            contractService.contract.on('DiplomaRevoked', () => {
              console.log('DiplomaRevoked event detected, refreshing count');
              fetchTotalDiplomas();
            });
          }
        } catch (error) {
          console.error('Error setting up contract event listeners:', error);
        }
      }
    }
    
    return () => {
      // Clean up contract event listeners when component unmounts or when initialized changes
      if (contractService.initialized && contractService.contract && contractService.contract.removeAllListeners) {
        try {
          contractService.contract.removeAllListeners('DiplomaAdded');
          contractService.contract.removeAllListeners('DiplomaRevoked');
        } catch (error) {
          console.error('Error removing contract event listeners:', error);
        }
      }
    };
  }, [contractService.initialized]);

  // Fallback timeout to ensure loading state is cleared after 5 seconds
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (isLoading) {
        console.log('Forcing loading state to false after timeout');
        setIsLoading(false);
      }
    }, 5000);
    
    return () => clearTimeout(timeout);
  }, []);

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="relative overflow-hidden bg-gradient-to-r from-blue-600 to-indigo-700 rounded-xl shadow-2xl p-10 text-center">
        <div className="absolute top-0 left-0 w-full h-full opacity-10">
          <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
            <defs>
              <pattern id="grid" width="10" height="10" patternUnits="userSpaceOnUse">
                <path d="M 10 0 L 0 0 0 10" fill="none" stroke="white" strokeWidth="0.5"/>
              </pattern>
            </defs>
            <rect width="100" height="100" fill="url(#grid)" />
          </svg>
        </div>
        
        <div className="relative z-10">
          <h1 className="text-5xl font-bold text-white mb-6 tracking-tight">CertifDiploma</h1>
          <p className="text-2xl text-blue-100 mb-6 max-w-3xl mx-auto font-light">
            Plateforme de certification de diplômes sur la blockchain Ethereum
          </p>
          
          <div className="w-24 h-1 bg-blue-300 mx-auto my-8 rounded-full"></div>
          
          <p className="text-xl text-white mb-8 max-w-2xl mx-auto">
            Sécurisez, vérifiez et partagez des diplômes de manière infalsifiable grâce à la technologie blockchain.
          </p>
          
          <div className="mt-10 flex flex-col sm:flex-row justify-center gap-4 sm:gap-6 max-w-2xl mx-auto">
            {isAdmin && (
              <button 
                onClick={() => setIsAddModalOpen(true)}
                className="group relative overflow-hidden px-8 py-4 rounded-xl font-semibold text-lg transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 min-w-[200px] text-center cursor-pointer bg-white text-blue-700 hover:bg-blue-50"
              >
                <span className="relative z-10 flex items-center justify-center">
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
                  </svg>
                  Ajouter un diplôme
                </span>
                <span className="absolute inset-0 bg-gradient-to-r from-blue-100 to-indigo-100 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></span>
              </button>
            )}
            
            <a 
              href="#search-section"
              onClick={(e) => {
                e.preventDefault();
                const searchSection = document.getElementById('search-section');
                if (searchSection) {
                  searchSection.scrollIntoView({ behavior: 'smooth' });
                }
              }}
              className="group relative overflow-hidden px-8 py-4 rounded-xl font-semibold text-lg transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 min-w-[200px] text-center cursor-pointer bg-transparent border-2 border-white text-white hover:bg-white/10 backdrop-blur-sm"
            >
              <span className="relative z-10 flex items-center justify-center">
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
                </svg>
                Vérifier un diplôme
              </span>
              <span className="absolute inset-0 bg-gradient-to-r from-white/10 to-white/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></span>
            </a>
          </div>
          
          
          {/* Add Diploma Modal */}
          <AddDiplomaModal 
            isOpen={isAddModalOpen} 
            onClose={() => setIsAddModalOpen(false)} 
            onSuccess={(diplomaData) => {
              setNewDiplomaData(diplomaData);
              setShowSuccessModal(true);
            }}
          />
          
          {/* Success Notification Modal */}
          {showSuccessModal && (
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 transition-opacity duration-300">
              <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden transform transition-all duration-300 scale-95 hover:scale-100">
                {/* Header */}
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-to-r from-green-500 to-emerald-600 opacity-90"></div>
                  <div className="relative z-10 p-6 flex items-center">
                    <div className="flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-white/20 backdrop-blur-sm">
                      <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <div className="ml-4">
                      <h3 className="text-xl font-bold text-white">Succès</h3>
                      <p className="text-green-100">Diplôme enregistré avec succès</p>
                    </div>
                    <button 
                      onClick={() => setShowSuccessModal(false)}
                      className="ml-auto text-white/80 hover:text-white transition-colors p-1 -mr-2"
                      aria-label="Fermer"
                    >
                      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </div>
                
                {/* Content */}
                <div className="p-6">
                  <div className="space-y-4">
                    <div className="flex items-start">
                      <div className="flex-shrink-0 h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
                        <svg className="h-5 w-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                      </div>
                      <div className="ml-4">
                        <p className="text-sm font-medium text-gray-500">Étudiant</p>
                        <p className="text-sm font-semibold text-gray-900">{newDiplomaData?.studentName || 'N/A'}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-start">
                      <div className="flex-shrink-0 h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                        <svg className="h-5 w-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                      </div>
                      <div className="ml-4">
                        <p className="text-sm font-medium text-gray-500 text-left">Adresse</p>
                        <p className="text-sm font-mono text-gray-900 break-all text-left">{newDiplomaData?.studentAddress || 'N/A'}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-start">
                      <div className="flex-shrink-0 h-10 w-10 rounded-full bg-purple-100 flex items-center justify-center">
                        <svg className="h-5 w-5 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                      </div>
                      <div className="ml-4">
                        <p className="text-sm font-medium text-gray-500">Spécialisation</p>
                        <p className="text-sm font-semibold text-gray-900">{newDiplomaData?.specialization || 'N/A'}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-start">
                      <div className="flex-shrink-0 h-10 w-10 rounded-full bg-amber-100 flex items-center justify-center">
                        <svg className="h-5 w-5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                      </div>
                      <div className="ml-4">
                        <p className="text-sm font-medium text-gray-500">Date d'émission</p>
                        <p className="text-sm font-semibold text-gray-900">
                          {newDiplomaData?.issueDate ? new Date(newDiplomaData.issueDate).toLocaleDateString('fr-FR', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                          }) : 'N/A'}
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="mt-8 flex justify-end space-x-3">
                    <button
                      onClick={() => setShowSuccessModal(false)}
                      className="px-5 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 transition-colors duration-200"
                    >
                      Fermer
                    </button>
                    <button
                      onClick={() => {
                        setShowSuccessModal(false);
                        // Scroll to search section
                        document.getElementById('search-section')?.scrollIntoView({ behavior: 'smooth' });
                      }}
                      className="px-5 py-2.5 text-sm font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 transition-colors duration-200 flex items-center"
                    >
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
                      </svg>
                      Vérifier
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
        
        <div className="absolute -bottom-16 -right-16 w-64 h-64 bg-blue-500 rounded-full opacity-20"></div>
        <div className="absolute -top-20 -left-20 w-80 h-80 bg-indigo-500 rounded-full opacity-10"></div>
      </div>

      <div className="mt-20 mb-16">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-800 mb-3">Pourquoi choisir CertifDiploma ?</h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">Notre plateforme offre des avantages uniques pour la certification et la vérification des diplômes.</p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="relative bg-white rounded-xl shadow-lg overflow-hidden group transform transition-all duration-300 hover:-translate-y-2 hover:shadow-xl">
            <div className="absolute top-0 left-0 w-full h-1 bg-blue-500"></div>
            <div className="p-8 text-center">
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-blue-100 text-blue-600 mb-6 transform transition-transform group-hover:scale-110 group-hover:rotate-3">
                <svg className="w-10 h-10" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                  <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </div>
              <h3 className="text-2xl font-bold text-gray-800 mb-4">Authenticité</h3>
              <p className="text-gray-600 leading-relaxed">
                Garantissez l'authenticité de vos diplômes grâce à la blockchain Ethereum. Chaque certificat est infalsifiable et vérifiable à tout moment.
              </p>
            </div>
            <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-blue-400 to-blue-600 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left"></div>
          </div>

          <div className="relative bg-white rounded-xl shadow-lg overflow-hidden group transform transition-all duration-300 hover:-translate-y-2 hover:shadow-xl">
            <div className="absolute top-0 left-0 w-full h-1 bg-indigo-500"></div>
            <div className="p-8 text-center">
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-indigo-100 text-indigo-600 mb-6 transform transition-transform group-hover:scale-110 group-hover:rotate-3">
                <svg className="w-10 h-10" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM4.332 8.027a6.012 6.012 0 011.912-2.706C6.512 5.73 6.974 6 7.5 6A1.5 1.5 0 019 7.5V8a2 2 0 004 0 2 2 0 011.523-1.943A5.977 5.977 0 0116 10c0 .34-.028.675-.083 1H15a2 2 0 00-2 2v2.197A5.973 5.973 0 0110 16v-2a2 2 0 00-2-2 2 2 0 01-2-2 2 2 0 00-1.668-1.973z" clipRule="evenodd" />
                </svg>
              </div>
              <h3 className="text-2xl font-bold text-gray-800 mb-4">Accessibilité</h3>
              <p className="text-gray-600 leading-relaxed">
                Accédez à vos certificats n'importe où et n'importe quand. Partagez facilement vos diplômes avec des employeurs potentiels.
              </p>
            </div>
            <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-400 to-indigo-600 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left"></div>
          </div>

          <div className="relative bg-white rounded-xl shadow-lg overflow-hidden group transform transition-all duration-300 hover:-translate-y-2 hover:shadow-xl">
            <div className="absolute top-0 left-0 w-full h-1 bg-purple-500"></div>
            <div className="p-8 text-center">
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-purple-100 text-purple-600 mb-6 transform transition-transform group-hover:scale-110 group-hover:rotate-3">
                <svg className="w-10 h-10" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                  <path d="M5 3a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2H5zM5 11a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2H5zM11 5a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V5zM14 11a1 1 0 011 1v1h1a1 1 0 110 2h-1v1a1 1 0 11-2 0v-1h-1a1 1 0 110-2h1v-1a1 1 0 011-1z" />
                </svg>
              </div>
              <h3 className="text-2xl font-bold text-gray-800 mb-4">Décentralisation</h3>
              <p className="text-gray-600 leading-relaxed">
                Aucune dépendance à un serveur central pour la validation des diplômes. La technologie blockchain garantit la pérennité des certificats.
              </p>
            </div>
            <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-purple-400 to-purple-600 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left"></div>
          </div>
        </div>
      </div>

      <div className="relative bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl shadow-lg p-12 text-center mt-20 mb-16 overflow-hidden">
        <div className="absolute top-0 right-0 w-40 h-40 bg-blue-100 rounded-full -mr-20 -mt-20 opacity-50"></div>
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-indigo-100 rounded-full -ml-16 -mb-16 opacity-50"></div>
        
        <div className="relative z-10">
          <h2 className="text-3xl font-bold text-gray-800 mb-8 inline-flex items-center justify-center">
            <svg className="w-8 h-8 mr-3 text-blue-600" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
              <path d="M2 10a8 8 0 018-8v8h8a8 8 0 11-16 0z"></path>
              <path d="M12 2.252A8.014 8.014 0 0117.748 8H12V2.252z"></path>
            </svg>
            Statistiques de la Plateforme
          </h2>
          
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-blue-600"></div>
              <p className="ml-4 text-xl text-gray-600 font-medium">Chargement des statistiques...</p>
            </div>
          ) : connectionError ? (
            <div className="bg-white/70 backdrop-blur-sm border-l-4 border-yellow-500 p-6 rounded-lg shadow-md max-w-3xl mx-auto">
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <svg className="w-8 h-8 text-yellow-500" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd"></path>
                  </svg>
                </div>
                <div className="ml-4">
                  <h3 className="text-xl font-bold text-yellow-800 mb-2">Connexion à la blockchain requise</h3>
                  <p className="text-yellow-700 mb-4">Assurez-vous que MetaMask est installé et configuré correctement pour accéder aux statistiques.</p>
                  
                  <div className="bg-yellow-50 p-4 rounded-lg mb-4">
                    <h4 className="font-semibold text-gray-800 mb-2">Configuration requise:</h4>
                    <ol className="list-decimal list-inside text-gray-700 space-y-2">
                      <li>Installez <a href="https://metamask.io/download/" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline font-medium">MetaMask</a> si ce n'est pas déjà fait</li>
                      <li>Connectez MetaMask au réseau local:
                        <ul className="list-disc list-inside ml-4 mt-1 text-gray-600">
                          <li>Nom: <span className="font-mono font-medium">Localhost 8545</span></li>
                          <li>URL RPC: <span className="font-mono font-medium">http://localhost:8545</span></li>
                          <li>ID de chaîne: <span className="font-mono font-medium">1337</span></li>
                          <li>Symbole: <span className="font-mono font-medium">ETH</span></li>
                        </ul>
                      </li>
                      <li>Assurez-vous que votre blockchain locale est en cours d'exécution</li>
                    </ol>
                  </div>
                  
                  <div className="flex flex-wrap justify-center gap-4 mt-6">
                    <button 
                      className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg text-base font-medium transition duration-300 shadow-md hover:shadow-lg transform hover:-translate-y-1 flex items-center" 
                      onClick={() => fetchTotalDiplomas()}
                    >
                      <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                        <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd"></path>
                      </svg>
                      Réessayer la connexion
                    </button>
                    <button 
                      className="border-2 border-gray-300 hover:border-gray-400 bg-white hover:bg-gray-50 text-gray-700 px-6 py-3 rounded-lg text-base font-medium transition duration-300 flex items-center" 
                      onClick={() => window.location.reload()}
                    >
                      <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                        <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd"></path>
                      </svg>
                      Rafraîchir la page
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="relative bg-white rounded-xl shadow-lg p-8 max-w-xl mx-auto transform transition-all duration-300 hover:shadow-xl">
              <div className="absolute -top-10 -left-10 w-20 h-20 bg-blue-100 rounded-full opacity-50"></div>
              <div className="absolute -bottom-10 -right-10 w-20 h-20 bg-indigo-100 rounded-full opacity-50"></div>
              
              <div className="relative z-10">
                <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-blue-100 mb-6 mx-auto">
                  <svg className="w-12 h-12 text-blue-600" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                    <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
                    <path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z" clipRule="evenodd" />
                  </svg>
                </div>
                
                <h3 className="text-5xl font-bold text-blue-600 mb-3">{totalDiplomas}</h3>
                <p className="text-2xl text-gray-600 mb-2">Diplômes certifiés</p>
                <div className="w-16 h-1 bg-blue-200 mx-auto my-4 rounded-full"></div>
                <p className="text-gray-500">Nombre total de diplômes enregistrés sur la blockchain</p>
                
                {totalDiplomas === 0 && (
                  <div className="bg-blue-50 border border-blue-200 p-4 mt-6 rounded-lg">
                    <div className="flex items-center">
                      <svg className="w-5 h-5 text-blue-500 mr-2" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd"></path>
                      </svg>
                      <p className="text-blue-700 font-medium">Aucun diplôme n'a encore été certifié sur la plateforme.</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Search Diplomas Section */}
      <SearchDiplomas
        searchAddress={searchAddress}
        setSearchAddress={setSearchAddress}
        searchDiploma={searchDiploma}
        isSearching={isSearching}
        searchError={searchError}
        diplomaFound={diplomaFound}
        diplomaData={diplomaData}
        onClearSearch={() => {
          setDiplomaFound(false);
          setDiplomaData(null);
          setSearchError('');
        }}
      />
      
      {/* User Diplomas Section */}
      <UserDiplomas
        connectedAddress={connectedAddress}
        userDiplomas={userDiplomas}
        isLoadingUserDiplomas={isLoadingUserDiplomas}
      />
      
      {/* Admin Actions */}
      <div className="flex justify-center gap-4 mt-8">
        {isAdmin && (
          <a href="#add" className="border-2 border-blue-600 text-blue-600 hover:bg-blue-50 px-6 py-2 rounded-md font-medium text-lg transition duration-300">
            Ajouter un Diplôme
          </a>
        )}
      </div>
    </div>
  );
};

export default Home;
