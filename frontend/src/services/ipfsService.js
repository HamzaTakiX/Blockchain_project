// Mode de développement simulé pour IPFS
// Cette implémentation ne fait aucun appel réseau et génère des hash IPFS simulés

// Stockage local pour simuler IPFS
const simulatedIPFSStorage = new Map();

// Client IPFS simulé
const ipfs = {
  // Simule l'ajout d'un fichier à IPFS
  add: async (content) => {
    try {
      // Générer un hash aléatoire pour simuler IPFS
      const hash = 'Qm' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
      
      // Stocker le contenu en mémoire (pour simuler la récupération)
      let contentToStore;
      if (content instanceof File) {
        contentToStore = 'File: ' + content.name;
      } else if (content instanceof Uint8Array || content instanceof ArrayBuffer) {
        try {
          // Essayer de parser comme JSON si c'est un tableau d'octets
          const decoder = new TextDecoder('utf-8');
          const text = decoder.decode(content);
          contentToStore = JSON.parse(text);
        } catch {
          // Si ce n'est pas du JSON valide, stocker comme texte
          const decoder = new TextDecoder('utf-8');
          contentToStore = decoder.decode(content);
        }
      } else {
        contentToStore = content;
      }
      
      simulatedIPFSStorage.set(hash, contentToStore);
      console.log(`Simulation d'ajout à IPFS: ${hash}`);
      return { path: hash };
    } catch (error) {
      console.error('Erreur simulée lors de l\'ajout à IPFS:', error);
      // Même en cas d'erreur, retourner un hash pour permettre à l'application de continuer
      return { path: 'QmSimulatedErrorHash' + Date.now() };
    }
  },
  
  // Simule la récupération d'un fichier depuis IPFS
  cat: async function* (ipfsPath) {
    try {
      // Récupérer le contenu du stockage simulé
      const content = simulatedIPFSStorage.get(ipfsPath) || 'Contenu simulé pour ' + ipfsPath;
      
      // Convertir en Uint8Array pour être cohérent avec l'API IPFS réelle
      let contentArray;
      if (typeof content === 'object') {
        const jsonString = JSON.stringify(content);
        const encoder = new TextEncoder();
        contentArray = encoder.encode(jsonString);
      } else {
        const encoder = new TextEncoder();
        contentArray = encoder.encode(String(content));
      }
      
      yield contentArray;
    } catch (error) {
      console.error('Erreur simulée lors de la récupération depuis IPFS:', error);
      const encoder = new TextEncoder();
      yield encoder.encode('Contenu d\'erreur simulé');
    }
  }
};

console.log('Service IPFS simulé initialisé pour le développement');

/**
 * Télécharge un fichier sur IPFS
 * @param {File} file - Le fichier à télécharger
 * @returns {Promise<string>} - Le hash IPFS du fichier
 */
export const uploadToIPFS = async (file) => {
  try {
    const added = await ipfs.add(file);
    const fileHash = added.path;
    return fileHash;
  } catch (error) {
    console.error('Erreur lors du téléchargement sur IPFS:', error);
    throw error;
  }
};

/**
 * Télécharge un objet JSON sur IPFS
 * @param {Object} jsonData - Les données JSON à télécharger
 * @returns {Promise<string>} - Le hash IPFS des données
 */
export const uploadJSONToIPFS = async (jsonData) => {
  try {
    // Simulation IPFS pour le développement
    console.log('Simulation du téléchargement JSON sur IPFS:', jsonData);
    
    // Générer un hash IPFS simulé
    const fakeHash = 'Qm' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    
    // Stocker les données dans le stockage simulé
    simulatedIPFSStorage.set(fakeHash, jsonData);
    
    return fakeHash;
  } catch (error) {
    console.error('Erreur lors du téléchargement du JSON sur IPFS:', error);
    throw error;
  }
};

/**
 * Récupère un fichier depuis IPFS
 * @param {string} ipfsHash - Le hash IPFS du fichier à récupérer
 * @returns {Promise<Uint8Array>} - Le contenu du fichier
 */
export const getFromIPFS = async (ipfsHash) => {
  try {
    // Pour la simulation, récupérer directement depuis le stockage
    const content = simulatedIPFSStorage.get(ipfsHash);
    
    if (content) {
      // Si le contenu existe dans notre stockage simulé
      if (typeof content === 'object') {
        const encoder = new TextEncoder();
        return encoder.encode(JSON.stringify(content));
      } else {
        const encoder = new TextEncoder();
        return encoder.encode(String(content));
      }
    } else {
      // Simuler la récupération via ipfs.cat
      let result = new Uint8Array(0);
      for await (const chunk of ipfs.cat(ipfsHash)) {
        // Concaténer les chunks
        const newResult = new Uint8Array(result.length + chunk.length);
        newResult.set(result);
        newResult.set(chunk, result.length);
        result = newResult;
      }
      return result;
    }
  } catch (error) {
    console.error('Erreur lors de la récupération depuis IPFS:', error);
    throw error;
  }
};

/**
 * Génère une URL pour accéder au fichier IPFS via une passerelle publique
 * @param {string} ipfsHash - Le hash IPFS du fichier
 * @returns {string} - L'URL de la passerelle IPFS
 */
export const getIPFSGatewayURL = (ipfsHash) => {
  return `https://ipfs.io/ipfs/${ipfsHash}`;
};

export default {
  uploadToIPFS,
  uploadJSONToIPFS,
  getFromIPFS,
  getIPFSGatewayURL
};
