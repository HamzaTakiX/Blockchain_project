/**
 * Formate une adresse Ethereum pour l'affichage
 * @param {string} address - L'adresse Ethereum complète
 * @param {number} startChars - Nombre de caractères à afficher au début
 * @param {number} endChars - Nombre de caractères à afficher à la fin
 * @returns {string} - L'adresse formatée
 */
export const formatAddress = (address, startChars = 6, endChars = 4) => {
  if (!address) return '';
  if (address.length <= startChars + endChars) return address;
  return `${address.substring(0, startChars)}...${address.substring(address.length - endChars)}`;
};

/**
 * Formate une date timestamp en format lisible
 * @param {number|Date} timestamp - Le timestamp ou la date à formater
 * @param {string} locale - La locale à utiliser pour le formatage
 * @returns {string} - La date formatée
 */
export const formatDate = (timestamp, locale = 'fr-FR') => {
  if (!timestamp) return '';
  
  const date = timestamp instanceof Date ? timestamp : new Date(Number(timestamp) * 1000);
  
  return date.toLocaleDateString(locale, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

/**
 * Vérifie si une chaîne est une adresse Ethereum valide
 * @param {string} address - L'adresse à vérifier
 * @returns {boolean} - True si l'adresse est valide
 */
export const isValidEthereumAddress = (address) => {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
};

/**
 * Convertit un nombre de wei en ether
 * @param {string|number} wei - Le montant en wei
 * @returns {string} - Le montant en ether
 */
export const weiToEther = (wei) => {
  if (!wei) return '0';
  return (Number(wei) / 1e18).toString();
};

/**
 * Tronque une chaîne si elle dépasse une certaine longueur
 * @param {string} str - La chaîne à tronquer
 * @param {number} maxLength - La longueur maximale
 * @returns {string} - La chaîne tronquée
 */
export const truncateString = (str, maxLength = 50) => {
  if (!str) return '';
  if (str.length <= maxLength) return str;
  return `${str.substring(0, maxLength)}...`;
};
