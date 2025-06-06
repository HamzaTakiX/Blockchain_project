import { useState, useEffect } from 'react';
import { getIPFSGatewayURL } from '../services/ipfsService';

const SearchDiplomas = ({ 
  searchDiploma, 
  isSearching, 
  searchError, 
  diplomaFound, 
  diplomaData,
  onClearSearch,
  searchAddress,
  setSearchAddress
}) => {
  const [fileUrl, setFileUrl] = useState('');
  const [fileName, setFileName] = useState('');
  const [isLoadingFile, setIsLoadingFile] = useState(false);

  // Handle file download
  const handleDownload = async () => {
    if (!fileUrl) return;
    
    try {
      setIsLoadingFile(true);
      const response = await fetch(fileUrl);
      if (!response.ok) throw new Error('Network response was not ok');
      
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      
      // Cleanup
      setTimeout(() => {
        document.body.removeChild(link);
        window.URL.revokeObjectURL(blobUrl);
        setIsLoadingFile(false);
      }, 100);
    } catch (error) {
      console.error('Download error:', error);
      // Fallback to direct download if fetch fails
      const link = document.createElement('a');
      link.href = fileUrl;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      setTimeout(() => document.body.removeChild(link), 100);
      setIsLoadingFile(false);
    }
  };
  
  // Fetch file URL when diploma data is available
  useEffect(() => {
    const fetchFileUrl = async () => {
      if (diplomaData?.ipfsHash) {
        setIsLoadingFile(true);
        try {
          const response = await fetch(getIPFSGatewayURL(diplomaData.ipfsHash));
          const data = await response.json();
          if (data.fileHash) {
            const url = getIPFSGatewayURL(data.fileHash);
            setFileUrl(url);
            setFileName(data.fileName || `diploma-${diplomaData.ipfsHash.substring(0, 8)}.${data.fileType || 'pdf'}`);
          }
        } catch (error) {
          console.error('Error fetching file URL:', error);
          // Fallback to direct IPFS hash if metadata fetch fails
          const url = getIPFSGatewayURL(diplomaData.ipfsHash);
          setFileUrl(url);
          setFileName(`diploma-${diplomaData.ipfsHash.substring(0, 8)}.pdf`);
        } finally {
          setIsLoadingFile(false);
        }
      }
    };

    if (diplomaFound) {
      fetchFileUrl();
    } else {
      setFileUrl('');
      setFileName('');
    }
  }, [diplomaData, diplomaFound]);
  return (
    <div id="search-section" className="bg-white shadow-lg rounded-lg p-6 mb-8">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-gray-800 mb-3">Rechercher des Diplômes</h2>
        <p className="text-gray-600 max-w-2xl mx-auto">
          Recherchez les diplômes dans la blockchain en utilisant l'adresse Ethereum de l'étudiant
        </p>
      </div>
      
      <div className="mt-8">
        <div className="flex justify-center">
          <div className="w-full max-w-2xl">
            <div className="relative flex rounded-xl shadow-lg overflow-hidden transition-all duration-300 hover:shadow-xl">
              <div className="relative flex-1">
                <input 
                  type="text" 
                  className={`block w-full h-full py-4 pl-5 pr-10 text-gray-800 placeholder-gray-400 bg-white focus:outline-none text-base ${
                    searchAddress ? 'border-l-4 border-blue-500 pl-4' : ''
                  }`}
                  placeholder="Entrez l'adresse Ethereum de l'étudiant" 
                  value={searchAddress}
                  onChange={(e) => setSearchAddress(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && searchDiploma()}
                />
                {searchAddress && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchAddress('');
                      onClearSearch && onClearSearch();
                    }}
                    className="absolute right-2.5 top-1/2 transform -translate-y-1/2 p-1.5 text-gray-400 hover:text-gray-600 transition-colors rounded-full hover:bg-gray-100"
                    aria-label="Effacer la recherche"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
              <button 
                className={`inline-flex items-center justify-center px-6 py-4 border-l border-gray-200 text-base font-semibold text-white ${
                  isSearching || !searchAddress 
                    ? 'bg-gray-400 cursor-not-allowed' 
                    : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700'
                } focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-300 min-w-[140px]`} 
                type="button" 
                onClick={searchDiploma}
                disabled={isSearching || !searchAddress}
              >
                {isSearching ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Recherche...
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    Rechercher
                  </>
                )}
              </button>
            </div>
            <p className="mt-2 text-sm text-gray-500 text-right">Appuyez sur Entrée pour lancer la recherche</p>
          </div>
        </div>
      </div>
      
      {searchError && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 mt-4 mx-auto max-w-2xl rounded">
          <p className="text-red-700">{searchError}</p>
        </div>
      )}
      
      {diplomaFound && (
        <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-xl p-8 mt-10 mx-auto max-w-4xl transition-all duration-300 hover:shadow-2xl">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-2xl font-bold text-gray-800">Détails du Diplôme</h3>
            <span className={`px-4 py-1.5 rounded-full text-sm font-semibold ${
              diplomaData.isValid 
                ? 'bg-green-100 text-green-800' 
                : 'bg-red-100 text-red-800'
            }`}>
              {diplomaData.isValid ? 'Valide' : 'Révoqué'}
            </span>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-5">
              <div className="bg-gray-50 p-5 rounded-lg">
                <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Informations de l'Étudiant</h4>
                <div className="space-y-3">
                  <div>
                    <p className="text-sm text-gray-500">Nom Complet</p>
                    <p className="font-medium text-gray-900">{diplomaData.studentName}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Adresse Ethereum</p>
                    <p className="font-mono text-sm text-gray-700 break-all">{searchAddress}</p>
                  </div>
                </div>
              </div>
              
              <div className="bg-gray-50 p-5 rounded-lg">
                <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Détails du Diplôme</h4>
                <div className="space-y-3">
                  <div>
                    <p className="text-sm text-gray-500">Spécialité</p>
                    <p className="font-medium text-gray-900">{diplomaData.specialization}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Date d'Émission</p>
                    <p className="font-medium text-gray-900">
                      {new Date(Number(diplomaData.issueDate)).toLocaleDateString('fr-FR', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </p>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-6 rounded-xl border border-blue-100 flex flex-col justify-between">
              <div>
                <h4 className="text-sm font-semibold text-blue-700 uppercase tracking-wider mb-3">Document du Diplôme</h4>
                <p className="text-gray-600 mb-6">Le document officiel du diplôme est stocké de manière sécurisée sur IPFS, un système de stockage décentralisé.</p>
                
                <div className="bg-white p-4 rounded-lg border border-blue-100 mb-6">
                  <div className="flex items-start">
                    <div className="flex-shrink-0 bg-blue-100 p-2 rounded-lg">
                      <svg className="h-6 w-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <div className="ml-4">
                      <h5 className="text-sm font-medium text-gray-900">Document du Diplôme</h5>
                      <p className="text-xs text-gray-500 mt-1">Hachage IPFS: {diplomaData.ipfsHash.substring(0, 16)}...{diplomaData.ipfsHash.substring(diplomaData.ipfsHash.length - 8)}</p>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="space-y-3">
                <a 
                  href={fileUrl || '#'} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className={`w-full flex items-center justify-center px-6 py-3 border border-transparent rounded-lg shadow-sm text-base font-medium text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-300 ${
                    !fileUrl ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                  onClick={(e) => !fileUrl && e.preventDefault()}
                >
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                  {fileUrl ? 'Voir le document complet' : 'Chargement...'}
                </a>
                
                <button 
                  onClick={handleDownload}
                  disabled={!fileUrl || isLoadingFile}
                  className={`w-full flex items-center justify-center px-6 py-3 border border-gray-300 rounded-lg shadow-sm text-base font-medium ${
                    !fileUrl || isLoadingFile 
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                      : 'bg-white text-gray-700 hover:bg-gray-50'
                  } focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-300`}
                >
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  {isLoadingFile ? 'Téléchargement...' : 'Télécharger'}
                </button>
              </div>
            </div>
          </div>
          
          <div className="mt-8 pt-6 border-t border-gray-200 flex items-center justify-between">
            <p className="text-sm text-gray-500">
              Vérifié et enregistré sur la blockchain
            </p>
            <a 
              href={`https://etherscan.io/address/${searchAddress}`} 
              target="_blank" 
              rel="noopener noreferrer"
              className="inline-flex items-center text-sm font-medium text-blue-600 hover:text-blue-800 transition-colors"
            >
              Voir sur Etherscan
              <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </a>
          </div>
        </div>
      )}
    </div>
  );
};

export default SearchDiplomas;
