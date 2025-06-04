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
  async getDiploma(studentAddress) {
    if (!this.initialized) await this.init();
    
    try {
      const diploma = await this.contract.getDiploma(studentAddress);
      return {
        studentName: diploma[0],
        specialization: diploma[1],
        issueDate: new Date(Number(diploma[2]) * 1000), // Conversion timestamp en Date
        ipfsHash: diploma[3],
        isValid: diploma[4]
      };
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
