import { ethers } from 'ethers';
import contractAddress from '../contracts/contract-address.json';
import DiplomaCertArtifact from '../contracts/DiplomaCert.json';

/**
 * Service pour interagir avec le contrat intelligent DiplomaCert
 */
class ContractService {
  constructor() {
    this.contract = null;
    this.provider = null;
    this.signer = null;
    this.initialized = false;
  }

  /**
   * Initialise la connexion avec le contrat
   * @returns {Promise<boolean>} - True si l'initialisation a réussi
   */
  async init() {
    try {
      console.log("Début de l'initialisation du service de contrat...");
      
      // Utiliser un JsonRpcProvider direct pour se connecter au noeud local Hardhat
      // au lieu de passer par MetaMask
      try {
        console.log("Création d'un provider direct vers http://localhost:8545...");
        this.provider = new ethers.providers.JsonRpcProvider("http://localhost:8545");
        
        // Vérifier si le provider est connecté
        const network = await this.provider.getNetwork();
        console.log("Réseau détecté par le provider direct:", network);
        
        // Utiliser le premier compte du noeud local comme signer (Account #0: 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266)
        const accounts = await this.provider.listAccounts();
        if (accounts.length === 0) {
          console.error("Aucun compte disponible sur le noeud local");
          return false;
        }
        
        console.log("Comptes disponibles sur le noeud local:", accounts);
        // Utiliser spécifiquement le compte 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266 s'il est disponible
        const adminAddress = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266";
        const adminIndex = accounts.findIndex(account => account.toLowerCase() === adminAddress.toLowerCase());
        
        if (adminIndex !== -1) {
          console.log("Compte admin trouvé à l'index:", adminIndex);
          this.signer = this.provider.getSigner(adminIndex);
        } else {
          console.log("Compte admin non trouvé, utilisation du premier compte disponible");
          this.signer = this.provider.getSigner(accounts[0]);
        }
        const signerAddress = await this.signer.getAddress();
        console.log("Adresse du signer (premier compte du noeud local):", signerAddress);
      } catch (directProviderError) {
        console.error("Erreur lors de la connexion directe au noeud local:", directProviderError);
        
        // Fallback à MetaMask si la connexion directe échoue
        console.log("Tentative de fallback vers MetaMask...");
        
        // Vérifier si MetaMask est installé
        if (!window.ethereum) {
          console.error("MetaMask n'est pas installé");
          // Créer un provider en lecture seule pour permettre à l'application de fonctionner sans MetaMask
          try {
            console.log("Création d'un provider en lecture seule...");
            // Utiliser un provider public comme Infura ou Alchemy si disponible
            this.provider = new ethers.providers.JsonRpcProvider("https://mainnet.infura.io/v3/9aa3d95b3bc440fa88ea12eaa4456161");
            console.log("Provider en lecture seule créé avec succès");
            // Pas de signer disponible en mode lecture seule
            this.signer = null;
            return true;
          } catch (fallbackError) {
            console.error("Erreur lors de la création du provider en lecture seule:", fallbackError);
            return false;
          }
        }
        console.log("MetaMask est installé");

        // Vérifier si le réseau est correct
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

        // Créer le provider et le signer via MetaMask
        console.log("Création du provider via MetaMask...");
        this.provider = new ethers.providers.Web3Provider(window.ethereum);
        
        // Vérifier si le provider est connecté
        try {
          const network = await this.provider.getNetwork();
          console.log("Réseau détecté par le provider MetaMask:", network);
        } catch (providerError) {
          console.error("Erreur de connexion au provider MetaMask:", providerError);
          return false;
        }
        
        // Obtenir le signer
        try {
          console.log("Obtention du signer via MetaMask...");
          this.signer = this.provider.getSigner();
          // Vérifier que le signer est valide en obtenant l'adresse
          const signerAddress = await this.signer.getAddress();
          console.log("Adresse du signer via MetaMask:", signerAddress);
        } catch (signerError) {
          console.error("Erreur lors de l'obtention du signer via MetaMask:", signerError);
          return false;
        }
      }
      
      // Vérifier que l'adresse du contrat est valide
      console.log("Vérification de l'adresse du contrat:", contractAddress.DiplomaCert);
      if (!contractAddress.DiplomaCert || !ethers.utils.isAddress(contractAddress.DiplomaCert)) {
        console.error("Adresse de contrat invalide:", contractAddress.DiplomaCert);
        return false;
      }
      
      // Vérifier que l'ABI du contrat est valide
      console.log("Vérification de l'ABI du contrat...");
      if (!DiplomaCertArtifact || !DiplomaCertArtifact.abi) {
        console.error("ABI du contrat invalide ou manquant");
        return false;
      }
      
      // Vérifier que la fonction getTotalGraduates existe dans l'ABI
      const hasTotalGraduatesFunction = DiplomaCertArtifact.abi.some(
        item => item.type === 'function' && item.name === 'getTotalGraduates'
      );
      
      if (!hasTotalGraduatesFunction) {
        console.error("La fonction getTotalGraduates n'existe pas dans l'ABI du contrat");
      } else {
        console.log("La fonction getTotalGraduates existe dans l'ABI");
      }
      
      // Créer l'instance du contrat
      try {
        console.log("Création de l'instance du contrat...");
        // Si nous avons un signer, utiliser le signer, sinon utiliser le provider (lecture seule)
        const contractConnection = this.signer || this.provider;
        
        if (!contractConnection) {
          console.error("Ni signer ni provider disponible pour initialiser le contrat");
          return false;
        }
        
        this.contract = new ethers.Contract(
          contractAddress.DiplomaCert,
          DiplomaCertArtifact.abi,
          contractConnection
        );
        
        console.log("Instance du contrat créée");
        console.log("Méthodes disponibles sur le contrat:", Object.keys(this.contract.functions));
        
        // Vérifier que le contrat est déployé en appelant une fonction view simple
        try {
          console.log("Vérification du déploiement du contrat en appelant admin()...");
          const adminAddress = await this.contract.admin();
          console.log("Adresse de l'administrateur du contrat:", adminAddress);
          
          // Si admin() fonctionne, essayons getTotalGraduates
          console.log("Appel de getTotalGraduates pour vérifier...");
          const total = await this.contract.getTotalGraduates();
          console.log("Total des diplômés:", total.toString());
        } catch (contractCallError) {
          console.error("Erreur lors de l'appel au contrat:", contractCallError);
          if (contractCallError.message) {
            console.error("Message d'erreur:", contractCallError.message);
          }
          // Ne pas retourner false ici, car le contrat pourrait être déployé mais la fonction pourrait échouer pour d'autres raisons
        }
      } catch (contractError) {
        console.error("Erreur lors de la création de l'instance du contrat:", contractError);
        return false;
      }
      
      this.initialized = true;
      console.log("Initialisation du service de contrat terminée avec succès");
      return true;
    } catch (error) {
      console.error("Erreur lors de l'initialisation du contrat:", error);
      return false;
    }
  }

  /**
   * Vérifie si l'utilisateur est l'administrateur du contrat
   * @returns {Promise<boolean>} - True si l'utilisateur est l'administrateur
   */
  async isAdmin() {
    try {
      // Vérifier si le service est initialisé
      if (!this.initialized) {
        const initSuccess = await this.init();
        if (!initSuccess) {
          console.error("Impossible d'initialiser le service de contrat");
          return false;
        }
      }
      
      // Vérifier si le provider est disponible
      if (!this.provider) {
        console.error("Provider non disponible");
        return false;
      }
      
      // Vérifier si le contrat est disponible
      if (!this.contract) {
        console.error("Contrat non disponible");
        return false;
      }
      
      // Récupérer l'adresse de l'administrateur depuis le contrat
      const admin = await this.contract.admin();
      
      // Récupérer l'adresse actuelle depuis MetaMask ou le signer
      let currentAddress;
      if (window.ethereum && window.ethereum.selectedAddress) {
        // Utiliser l'adresse actuellement sélectionnée dans MetaMask
        currentAddress = window.ethereum.selectedAddress;
        console.log("Adresse actuelle depuis MetaMask:", currentAddress);
      } else if (this.signer) {
        // Fallback au signer si MetaMask n'est pas disponible
        currentAddress = await this.signer.getAddress();
        console.log("Adresse actuelle depuis le signer:", currentAddress);
      } else {
        console.error("Aucune adresse disponible");
        return false;
      }
      
      console.log("Adresse admin du contrat:", admin);
      console.log("Comparaison:", admin.toLowerCase(), "vs", currentAddress.toLowerCase());
      
      // Comparer les adresses (insensible à la casse)
      return admin.toLowerCase() === currentAddress.toLowerCase();
    } catch (error) {
      console.error("Erreur lors de la vérification de l'administrateur:", error);
      // Afficher des informations plus détaillées sur l'erreur
      if (error.code) {
        console.error(`Code d'erreur: ${error.code}`);
      }
      if (error.message) {
        console.error(`Message d'erreur: ${error.message}`);
      }
      return false;
    }
  }

  /**
   * Ajoute un nouveau diplôme
   * @param {string} studentAddress - Adresse Ethereum de l'étudiant
   * @param {string} studentName - Nom de l'étudiant
   * @param {string} specialization - Spécialité du diplôme
   * @param {string} ipfsHash - Hash IPFS du certificat
   * @returns {Promise<ethers.TransactionResponse>} - La transaction
   */
  async addDiploma(studentAddress, studentName, specialization, ipfsHash) {
    if (!this.initialized) await this.init();
    
    try {
      const tx = await this.contract.addDiploma(
        studentAddress,
        studentName,
        specialization,
        ipfsHash
      );
      
      await tx.wait();
      return tx;
    } catch (error) {
      console.error("Erreur lors de l'ajout du diplôme:", error);
      throw error;
    }
  }

  /**
   * Récupère les informations d'un diplôme
   * @param {string} studentAddress - Adresse Ethereum de l'étudiant
   * @returns {Promise<Object>} - Les informations du diplôme
   */
  // Simple in-memory cache for metadata
  metadataCache = new Map();
  
  // Callback for metadata updates
  onMetadataUpdate = null;

  /**
   * Fetches and caches metadata from IPFS
   * @private
   */
  async fetchAndCacheMetadata(ipfsHash, defaultTimestamp) {
    console.log(`[${new Date().toISOString()}] Fetching metadata for IPFS hash:`, ipfsHash);
    
    try {
      // Use local IPFS gateway first, fall back to public gateway
      const localGatewayUrl = `http://localhost:8080/ipfs/${ipfsHash}`;
      const publicGatewayUrl = `https://ipfs.io/ipfs/${ipfsHash}`;
      
      console.log('Trying local IPFS gateway:', localGatewayUrl);
      
      let response;
      try {
        // First try local gateway
        response = await fetch(localGatewayUrl, { 
          signal: AbortSignal.timeout(3000) // 3 second timeout
        });
        
        if (!response.ok) {
          console.warn(`Local gateway returned status ${response.status}, trying public gateway...`);
          throw new Error('Local gateway failed');
        }
      } catch (localError) {
        console.warn('Error with local IPFS gateway, falling back to public gateway:', localError);
        response = await fetch(publicGatewayUrl, {
          signal: AbortSignal.timeout(5000) // 5 second timeout for public gateway
        });
      }
      
      if (!response.ok) {
        console.error('Error fetching metadata - HTTP status:', response.status);
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const metadata = await response.json();
      
      // Detailed logging of the received metadata
      console.group('=== METADATA RECEIVED ===');
      console.log('IPFS Hash:', ipfsHash);
      console.log('Raw metadata:', metadata);
      console.log('Available keys:', Object.keys(metadata));
      
      // Check for date fields
      const dateFields = ['issueDate', 'date', 'issuedDate', 'dateIssued', 'createdAt', 'timestamp'];
      const foundDates = {};
      
      dateFields.forEach(field => {
        if (metadata[field]) {
          foundDates[field] = {
            value: metadata[field],
            type: typeof metadata[field],
            asDate: new Date(metadata[field]),
            timestamp: new Date(metadata[field]).getTime()
          };
        }
      });
      
      console.log('Found date fields:', Object.keys(foundDates).length ? foundDates : 'None');
      console.groupEnd();
      
      // Cache the result
      this.metadataCache.set(ipfsHash, metadata);
      
      // Try to find the issue date in the metadata
      let issueDate = null;
      
      // Check common date field names
      const dateField = ['issueDate', 'date', 'issuedDate', 'dateIssued'].find(
        field => metadata[field]
      );
      
      if (dateField) {
        const rawValue = metadata[dateField];
        console.log('Raw date value from metadata:', rawValue, 'type:', typeof rawValue);
        
        let dateValue;
        
        // Handle number (timestamp)
        if (typeof rawValue === 'number') {
          console.log('Processing as timestamp (number)');
          // Convert to milliseconds if it's in seconds
          dateValue = new Date(rawValue * (rawValue < 1e10 ? 1000 : 1));
        } 
        // Handle string that might be a number (timestamp as string)
        else if (typeof rawValue === 'string' && /^\d+$/.test(rawValue)) {
          console.log('Processing as timestamp (string)');
          const num = parseInt(rawValue, 10);
          // Convert to number first, then check if it's in seconds or milliseconds
          if (rawValue.length === 10) { // 10 digits = seconds timestamp
            dateValue = new Date(num * 1000);
          } else if (rawValue.length === 13) { // 13 digits = milliseconds timestamp
            dateValue = new Date(num);
          } else {
            // Fallback to default behavior if length doesn't match expected timestamp formats
            dateValue = new Date(num * (num < 1e10 ? 1000 : 1));
          }
        }
        // Handle date string (YYYY-MM-DD)
        else if (typeof rawValue === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(rawValue)) {
          console.log('Processing as YYYY-MM-DD date string');
          dateValue = new Date(`${rawValue}T00:00:00.000Z`);
        }
        // Handle ISO date string
        else if (typeof rawValue === 'string' && (rawValue.includes('T') || rawValue.endsWith('Z'))) {
          console.log('Processing as ISO date string');
          dateValue = new Date(rawValue);
        }
        // Fallback to default timestamp if format is unknown
        else {
          console.warn('Unknown date format, using default timestamp');
          dateValue = new Date(defaultTimestamp);
        }
        
        console.log('Parsed date:', {
          dateValue: dateValue,
          toISOString: dateValue.toISOString(),
          toLocaleDateString: dateValue.toLocaleDateString('fr-FR', { timeZone: 'UTC' }),
          timestamp: dateValue.getTime(),
          isValid: !isNaN(dateValue.getTime())
        });
        
        if (!isNaN(dateValue.getTime())) {
          issueDate = dateValue;
          console.log('Successfully parsed date:', dateValue.toISOString());
        } else {
          console.warn('Invalid date format in metadata. Raw value:', rawValue, 'Type:', typeof rawValue);
          issueDate = new Date(defaultTimestamp);
        }
      }
      
      // If no valid date found, use the default
      if (!issueDate) {
        console.warn('No valid date found in metadata, using default');
        issueDate = new Date(defaultTimestamp);
      } else {
        console.log('Using date from metadata:', issueDate);
      }
      
      return { 
        metadata,
        issueDate
      };
    } catch (error) {
      console.warn('Error fetching metadata from IPFS:', error);
      return { 
        metadata: null, 
        issueDate: new Date(defaultTimestamp) 
      };
    }
  }

  /**
   * Gets diploma data with optional metadata
   * @param {string} studentAddress - The student's address
   * @param {boolean} [skipMetadata=false] - Skip metadata fetching for faster initial load
   * @returns {Promise<Object>} Diploma data
   */
  async getDiploma(studentAddress, skipMetadata = false) {
    if (!this.initialized) await this.init();
    
    try {
      const diploma = await this.contract.getDiploma(studentAddress);
      const ipfsHash = diploma[3];
      const blockchainTimestamp = Number(diploma[2]) * 1000;
      
      // Create the basic result with blockchain data
      const result = {
        studentName: diploma[0],
        specialization: diploma[1],
        issueDate: new Date(blockchainTimestamp), // Default to blockchain timestamp
        ipfsHash: ipfsHash,
        isValid: diploma[4],
        metadata: null
      };

      // If skipping metadata or no IPFS hash, return early
      if (skipMetadata || !ipfsHash || !ipfsHash.startsWith('Qm')) {
        return result;
      }

      try {
        console.group('=== PROCESSING DIPLOMA ===');
        console.log('Student:', result.studentName);
        console.log('Blockchain timestamp:', new Date(blockchainTimestamp).toISOString());
        
        // Try to get from cache first
        if (this.metadataCache.has(ipfsHash)) {
          console.log('Found in cache, using cached metadata');
          const cached = this.metadataCache.get(ipfsHash);
          result.metadata = cached;
          
          // Look for date in metadata
          const dateField = ['issueDate', 'date', 'issuedDate', 'dateIssued'].find(
            field => {
              const hasField = !!cached[field];
              console.log(`Checking field '${field}':`, hasField ? 'found' : 'not found');
              return hasField;
            }
          );
          
          if (dateField) {
            console.log(`Found date field '${dateField}':`, cached[dateField]);
            const dateValue = new Date(cached[dateField]);
            if (!isNaN(dateValue.getTime())) {
              result.issueDate = dateValue;
              console.log('Using cached date:', dateValue.toISOString());
            } else {
              console.warn('Invalid date value:', cached[dateField]);
            }
          } else {
            console.warn('No date field found in cached metadata');
          }
        } else {
          console.log('Not in cache, fetching fresh metadata...');
          try {
            const { metadata, issueDate } = await this.fetchAndCacheMetadata(ipfsHash, blockchainTimestamp);
            if (metadata) {
              result.metadata = metadata;
              if (issueDate) {
                console.log('Using fresh metadata date:', issueDate.toISOString());
                result.issueDate = issueDate;
              } else {
                console.warn('No valid date found in fresh metadata');
              }
            } else {
              console.warn('No metadata returned from fetchAndCacheMetadata');
            }
          } catch (fetchError) {
            console.error('Error fetching metadata:', fetchError);
          }
        }
      } catch (error) {
        console.warn('Error processing metadata:', error);
      }
      
      console.log('=== FINAL DIPLOMA DATA ===');
      console.log('Student:', result.studentName);
      console.log('Using date:', result.issueDate.toISOString());
      console.log('Date source:', result.metadata ? 'metadata' : 'blockchain');
      if (result.metadata) {
        console.log('Metadata keys:', Object.keys(result.metadata));
      }
      console.log('=========================');
      console.groupEnd();
      
      return result;
    } catch (error) {
      console.error("Erreur lors de la récupération du diplôme:", error);
      throw error;
    }
  }

  /**
   * Vérifie l'authenticité d'un diplôme
   * @param {string} studentAddress - Adresse Ethereum de l'étudiant
   * @returns {Promise<boolean>} - True si le diplôme est valide
   */
  async verifyDiploma(studentAddress) {
    if (!this.initialized) await this.init();
    
    try {
      return await this.contract.verifyDiploma(studentAddress);
    } catch (error) {
      console.error("Erreur lors de la vérification du diplôme:", error);
      return false;
    }
  }

  /**
   * Révoque un diplôme
   * @param {string} studentAddress - Adresse Ethereum de l'étudiant
   * @returns {Promise<ethers.TransactionResponse>} - La transaction
   */
  async revokeDiploma(studentAddress) {
    if (!this.initialized) await this.init();
    
    try {
      const tx = await this.contract.revokeDiploma(studentAddress);
      await tx.wait();
      return tx;
    } catch (error) {
      console.error("Erreur lors de la révocation du diplôme:", error);
      throw error;
    }
  }

  /**
   * Récupère le nombre total de diplômés
   * @returns {Promise<number>} - Le nombre total de diplômés
   */
  async getTotalGraduates() {
    try {
      // Vérifier si le service est initialisé
      if (!this.initialized) {
        const initSuccess = await this.init();
        if (!initSuccess) {
          console.error("Impossible d'initialiser le service de contrat");
          return 0;
        }
      }
      
      // Vérifier si le contrat est disponible
      if (!this.contract) {
        console.error("Contrat non disponible");
        return 0;
      }
      
      // Appeler la fonction du contrat avec gestion d'erreur détaillée
      try {
        console.log("Appel de la fonction getTotalGraduates...");
        const total = await this.contract.getTotalGraduates();
        console.log("Résultat de getTotalGraduates:", total);
        return Number(total);
      } catch (contractError) {
        console.error("Erreur lors de l'appel à getTotalGraduates:", contractError);
        
        // Afficher des informations détaillées sur l'erreur
        if (contractError.code) {
          console.error(`Code d'erreur: ${contractError.code}`);
        }
        if (contractError.message) {
          console.error(`Message d'erreur: ${contractError.message}`);
        }
        
        // Vérifier si le contrat a bien cette fonction
        try {
          // Vérifier si la fonction existe dans l'ABI
          const hasTotalGraduatesFunction = DiplomaCertArtifact.abi.some(
            item => item.type === 'function' && item.name === 'getTotalGraduates'
          );
          
          if (!hasTotalGraduatesFunction) {
            console.error("La fonction getTotalGraduates n'existe pas dans l'ABI du contrat");
          }
        } catch (abiError) {
          console.error("Erreur lors de la vérification de l'ABI:", abiError);
        }
        
        return 0;
      }
    } catch (error) {
      console.error("Erreur lors de la récupération du nombre de diplômés:", error);
      return 0;
    }
  }

  /**
   * Connecte l'utilisateur à MetaMask
   * @returns {Promise<string>} - L'adresse de l'utilisateur
   */
  async connectWallet() {
    try {
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      return accounts[0];
    } catch (error) {
      console.error("Erreur lors de la connexion au portefeuille:", error);
      throw error;
    }
  }

  /**
   * Récupère l'adresse du compte connecté
   * @returns {Promise<string>} - L'adresse du compte
   */
  async getConnectedAccount() {
    if (!this.initialized) await this.init();
    
    try {
      // Prioritize getting the address from MetaMask if available
      if (window.ethereum) {
        try {
          const accounts = await window.ethereum.request({ method: 'eth_accounts' });
          if (accounts && accounts.length > 0) {
            console.log("Using MetaMask connected account:", accounts[0]);
            return accounts[0];
          }
        } catch (metaMaskError) {
          console.warn("Error getting accounts from MetaMask:", metaMaskError);
          // Fall back to signer if MetaMask fails
        }
      }
      
      // Fallback to signer address if MetaMask is not available or fails
      if (this.signer) {
        const signerAddress = await this.signer.getAddress();
        console.log("Using signer address as fallback:", signerAddress);
        return signerAddress;
      }
      
      return null;
    } catch (error) {
      console.error("Erreur lors de la récupération du compte connecté:", error);
      return null;
    }
  }
  
  /**
   * Récupère toutes les adresses d'étudiants ayant un diplôme
   * @returns {Promise<Array<string>>} - Liste des adresses d'étudiants
   */
  async getAllStudentAddresses() {
    if (!this.initialized) await this.init();
    
    try {
      // Récupérer toutes les adresses disponibles depuis le provider
      const accounts = await this.provider.listAccounts();
      
      // Si aucun compte n'est disponible, retourner un tableau vide
      if (!accounts || accounts.length === 0) {
        console.log('Aucun compte disponible sur le nœud local');
        return [];
      }
      
      console.log('Adresses disponibles récupérées:', accounts);
      return accounts;
    } catch (error) {
      console.error('Erreur lors de la récupération des adresses d\'étudiants:', error);
      
      // En cas d'erreur, utiliser les adresses mockées comme fallback
      const mockAddresses = [
        '0x5fbdb2315678afecb367f032d93f642f64180aa3',
        '0x70997970c51812dc3a010c7d01b50e0d17dc79c8',
        '0x3c44cdddb6a900fa2b585dd299e03d12fa4293bc',
        '0x90f79bf6eb2c4f870365e785982e1f101e93b906',
        '0x15d34aaf54267db7d7c367839aaf71a00a2c6a65'
      ];
      
      console.log('Utilisation des adresses mockées comme fallback:', mockAddresses);
      return mockAddresses;
    }
  }
}

// Exporte une instance unique du service
const contractService = new ContractService();
export default contractService;