import React, { useState, useEffect } from 'react';
import { getIPFSGatewayURL } from '../services/ipfsService';

const UserDiplomas = ({ 
  connectedAddress, 
  userDiplomas, 
  isLoadingUserDiplomas 
}) => {
  const [fileUrls, setFileUrls] = useState({});
  const [fileNames, setFileNames] = useState({});

  // Function to fetch file URL from IPFS metadata
  const fetchFileUrl = async (ipfsHash, index) => {
    try {
      const response = await fetch(getIPFSGatewayURL(ipfsHash));
      const data = await response.json();
      
      if (data.fileHash) {
        const fileUrl = getIPFSGatewayURL(data.fileHash);
        // Store the file URL and name in state
        setFileUrls(prev => ({
          ...prev,
          [index]: fileUrl
        }));
        
        // Extract filename from URL or use a default name
        const fileName = data.fileName || `diploma-${index}.${data.fileType || 'pdf'}`;
        setFileNames(prev => ({
          ...prev,
          [index]: fileName
        }));
      }
    } catch (error) {
      console.error('Error fetching file URL:', error);
    }
  };
  
  // Function to handle file download
  const handleDownload = async (url, fileName, index) => {
    if (!url) return;
    
    try {
      // Show loading state
      const downloadBtn = document.querySelector(`button[data-index="${index}"]`);
      if (downloadBtn) {
        downloadBtn.disabled = true;
        const originalText = downloadBtn.innerHTML;
        downloadBtn.innerHTML = 'Téléchargement...';
        
        // Fetch the file
        const response = await fetch(url);
        if (!response.ok) throw new Error('Network response was not ok');
        
        // Get the blob data
        const blob = await response.blob();
        const blobUrl = window.URL.createObjectURL(blob);
        
        // Create download link
        const link = document.createElement('a');
        link.href = blobUrl;
        link.download = fileNames[index] || 'diploma.pdf';
        
        // Append to body and trigger download
        document.body.appendChild(link);
        link.click();
        
        // Cleanup
        setTimeout(() => {
          document.body.removeChild(link);
          window.URL.revokeObjectURL(blobUrl);
          downloadBtn.disabled = false;
          downloadBtn.innerHTML = originalText;
        }, 100);
      }
    } catch (error) {
      console.error('Download error:', error);
      // Fallback to direct download if fetch fails
      const link = document.createElement('a');
      link.href = url;
      link.download = fileNames[index] || 'diploma.pdf';
      document.body.appendChild(link);
      link.click();
      setTimeout(() => document.body.removeChild(link), 100);
    }
  };

  // Set up effect to fetch file URLs when diplomas change
  useEffect(() => {
    if (userDiplomas && userDiplomas.length > 0) {
      userDiplomas.forEach((diploma, index) => {
        if (diploma.ipfsHash) {
          fetchFileUrl(diploma.ipfsHash, index);
        }
      });
    }
  }, [userDiplomas]);

  // Set up effect to fetch file URLs when diplomas change
  useEffect(() => {
    if (userDiplomas && userDiplomas.length > 0) {
      userDiplomas.forEach((diploma, index) => {
        if (diploma.ipfsHash) {
          fetchFileUrl(diploma.ipfsHash, index);
        }
      });
    }
  }, [userDiplomas]);

  if (!connectedAddress) return null;

  return (
    <div className="py-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      <div className="text-center mb-10">
        <h2 className="text-3xl font-bold text-gray-900 sm:text-4xl mb-3 bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
          Vos Diplômes
        </h2>
        <div className="w-20 h-1 bg-gradient-to-r from-blue-500 to-indigo-500 mx-auto rounded-full"></div>
      </div>
      
      {isLoadingUserDiplomas ? (
        <div className="flex flex-col items-center justify-center py-16 bg-white rounded-2xl shadow-sm border border-gray-100">
          <div className="w-16 h-16 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin"></div>
          <p className="mt-4 text-lg font-medium text-gray-700">Chargement de vos diplômes...</p>
          <p className="text-gray-500">Veuillez patienter un instant</p>
        </div>
      ) : userDiplomas.length > 0 ? (
        <>
          <div className="mb-8 text-center">
            <p className="text-gray-600">
              Votre compte <span className="font-mono bg-gray-100 px-3 py-1.5 rounded-lg text-gray-800 border border-gray-200">
                {connectedAddress.substring(0, 6)}...{connectedAddress.substring(connectedAddress.length - 4)}
              </span> possède <span className="font-semibold text-blue-600">{userDiplomas.length} diplôme(s)</span> certifié(s)
            </p>
          </div>
          
          <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-1">
            {userDiplomas.map((diploma, index) => (
              <div 
                key={index}
                className="bg-white rounded-2xl shadow-sm hover:shadow-md transition-all duration-300 border border-gray-100 overflow-hidden transform hover:-translate-y-1"
              >
                <div className={`px-6 py-4 flex justify-between items-center ${diploma.isValid ? 'bg-gradient-to-r from-blue-600 to-indigo-600' : 'bg-gradient-to-r from-red-600 to-pink-600'}`}>
                  <h3 className="text-xl font-semibold text-white">{diploma.specialization}</h3>
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold ${diploma.isValid ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                    {diploma.isValid ? '✓ Valide' : '✗ Révoqué'}
                  </span>
                </div>
                
                <div className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="md:col-span-2 space-y-5">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-3">
                          <div className="bg-gray-50 p-3 rounded-lg">
                            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Nom</p>
                            <p className="text-gray-900 font-medium">{diploma.studentName}</p>
                          </div>
                          <div className="bg-gray-50 p-3 rounded-lg">
                            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Date d'émission</p>
                            <p className="text-gray-900" data-testid="diploma-date">
                            {(() => {
                              try {
                                // Check metadata first, then fall back to diploma.issueDate
                                let issueDate = (diploma.metadata && diploma.metadata.issueDate) || diploma.issueDate;
                                
                                console.group('Date Debug - Diploma ' + index);
                                console.log('Raw metadata date:', diploma.metadata?.issueDate);
                                console.log('Raw diploma date:', diploma.issueDate);
                                console.log('Using date:', issueDate);

                                if (!issueDate) {
                                  console.warn('No date found in metadata or diploma');
                                  console.groupEnd();
                                  return 'Date non disponible';
                                }

                                // If the date is a string in YYYY-MM-DD format, add timezone info
                                if (typeof issueDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(issueDate)) {
                                  issueDate += 'T00:00:00.000Z'; // Add timezone info for consistent parsing
                                }

                                const date = new Date(issueDate);
                                
                                if (isNaN(date.getTime())) {
                                  console.error('Invalid date format:', issueDate);
                                  console.groupEnd();
                                  return 'Date non valide';
                                }

                                // Format date in French locale
                                const formattedDate = new Intl.DateTimeFormat('fr-FR', {
                                  year: 'numeric',
                                  month: 'long',
                                  day: 'numeric',
                                  timeZone: 'UTC' // Force UTC to avoid timezone issues
                                }).format(date);

                                console.log('Formatted date (fr-FR):', formattedDate);
                                console.groupEnd();
                                
                                return formattedDate;
                              } catch (e) {
                                console.error('Erreur formatage date:', e);
                                console.groupEnd();
                                return 'Date non disponible';
                              }
                            })()}
                            </p>
                          </div>
                        </div>
                        <div className="space-y-3">
                          <div className="bg-gray-50 p-3 rounded-lg">
                            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Adresse étudiant</p>
                            <p className="font-mono text-sm text-gray-700 break-all">
                              {diploma.studentAddress}
                            </p>
                          </div>
                          <div className="bg-gray-50 p-3 rounded-lg">
                            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">IPFS Hash</p>
                            <p className="font-mono text-sm text-gray-700 break-all">
                              {diploma.ipfsHash}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex flex-col space-y-3 w-full">
                      {/* Télécharger Button */}
                      <button 
                        data-index={index}
                        onClick={() => fileUrls[index] && handleDownload(fileUrls[index], fileNames[index], index)}
                        disabled={!fileUrls[index]}
                        className={`w-full flex items-center justify-center px-4 py-3 border border-transparent rounded-xl shadow-sm text-base font-medium text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 transform hover:scale-[1.02] ${!fileUrls[index] ? 'opacity-50 cursor-not-allowed' : ''}`}
                      >
                        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                        {fileUrls[index] ? 'Télécharger' : 'Chargement...'}
                      </button>
                      
                      {/* Voir Button */}
                      <a 
                        href={fileUrls[index] || '#'}
                        target="_blank" 
                        rel="noopener noreferrer"
                        className={`w-full flex items-center justify-center px-4 py-3 border border-gray-300 rounded-xl shadow-sm text-base font-medium ${fileUrls[index] ? 'text-gray-700 bg-white hover:bg-gray-50' : 'text-gray-400 bg-gray-50 cursor-not-allowed'} transition-all duration-200`}
                        onClick={(e) => !fileUrls[index] && e.preventDefault()}
                      >
                        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                        Voir
                      </a>
                      
                      {/* Etherscan Button */}
                      <a 
                        href={`https://etherscan.io/address/${diploma.studentAddress}`}
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="w-full flex items-center justify-center px-4 py-3 border border-gray-300 rounded-xl shadow-sm text-base font-medium text-gray-700 bg-white hover:bg-gray-50 transition-all duration-200"
                      >
                        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                        Etherscan
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      ) : (
        <div className="bg-white/70 backdrop-blur-sm border-l-4 border-yellow-500 p-6 rounded-lg shadow-md max-w-3xl mx-auto">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <svg className="w-8 h-8 text-yellow-500" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd"></path>
              </svg>
            </div>
            <div className="ml-4">
              <h3 className="text-xl font-bold text-gray-800 mb-2">Aucun diplôme trouvé</h3>
              <p className="text-gray-700 mb-4">
                Votre compte <span className="font-mono bg-gray-100 px-2 py-0.5 rounded text-sm">
                  {connectedAddress.substring(0, 6)}...{connectedAddress.substring(connectedAddress.length - 4)}
                </span> n'a pas encore de diplômes certifiés.
              </p>
              
              <div className="bg-yellow-50 p-4 rounded-lg">
                <h4 className="font-semibold text-gray-800 mb-2">Si vous pensez que c'est une erreur :</h4>
                <ol className="list-decimal list-inside text-gray-700 space-y-2">
                  <li>Vérifiez que vous êtes connecté avec le bon compte MetaMask</li>
                  <li>Assurez-vous que votre diplôme a bien été enregistré sur la blockchain</li>
                  <li>Attendez quelques instants pour la confirmation de la transaction</li>
                </ol>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserDiplomas;
