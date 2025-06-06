import React, { useState, useEffect } from 'react';
import ipfsService from '../services/ipfsService';
import contractService from '../services/contractService';
import '../App.css';

const AddDiplomaModal = ({ isOpen, onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    studentName: '',
    studentAddress: '',
    specialization: '',
    issueDate: '', // Laissé vide initialement pour forcer la sélection d'une date
  });
  const [file, setFile] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', content: '' });
  const [isAddressVerified, setIsAddressVerified] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [existingAddresses, setExistingAddresses] = useState([]);
  const [isLoadingAddresses, setIsLoadingAddresses] = useState(false);
  const [showAddressDropdown, setShowAddressDropdown] = useState(false);

  // Fonction pour réinitialiser complètement le formulaire
  const resetForm = () => {
    setFormData({
      studentName: '',
      studentAddress: '',
      specialization: '',
      issueDate: ''
    });
    setFile(null);
    setMessage({ type: '', content: '' });
    setIsAddressVerified(false);
    setShowAddressDropdown(false);
  };

  // Réinitialiser le formulaire quand le modal s'ouvre
  useEffect(() => {
    if (isOpen) {
      resetForm();
      fetchExistingAddresses();
    }
    
    // Nettoyage des écouteurs d'événements
    const handleAccountsChanged = () => {
      console.log('AddDiplomaModal - Account changed, refreshing page...');
      window.location.reload();
    };
    
    if (window.ethereum) {
      window.ethereum.on('accountsChanged', handleAccountsChanged);
    }
    
    return () => {
      if (window.ethereum) {
        window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
      }
    };
  }, [isOpen]);
  
  // Récupérer les adresses existantes depuis la blockchain
  const fetchExistingAddresses = async () => {
    setIsLoadingAddresses(true);
    try {
      const addresses = await contractService.getAllStudentAddresses();
      setExistingAddresses(addresses);
    } catch (error) {
      console.error('Erreur lors de la récupération des adresses:', error);
    } finally {
      setIsLoadingAddresses(false);
    }
  };
  
  // Log when component mounts/updates
  useEffect(() => {
    console.log('AddDiplomaModal - Current formData:', formData);
    console.log('AddDiplomaModal - Current issueDate:', formData.issueDate);
    console.log('AddDiplomaModal - Type of issueDate:', typeof formData.issueDate);
    
    if (formData.issueDate) {
      const date = new Date(formData.issueDate);
      console.log('AddDiplomaModal - Parsed date object:', date);
      console.log('AddDiplomaModal - Is valid date:', !isNaN(date.getTime()));
      console.log('AddDiplomaModal - Formatted date (fr-FR):', 
        date.toLocaleDateString('fr-FR', {
          day: '2-digit',
          month: 'long',
          year: 'numeric'
        })
      );
    }
  }, [formData]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    console.log(`Field changed - ${name}:`, value);
    
    // Handle date input specifically to ensure proper formatting
    if (name === 'issueDate') {
      console.log('Date selected (raw input):', value);
      setFormData(prev => {
        const newData = {
          ...prev,
          [name]: value
        };
        console.log('Updated formData with new date:', newData);
        return newData;
      });
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
      
      // Reset verification status when student address changes
      if (name === 'studentAddress') {
        console.log('Student address changed, resetting verification');
        setIsAddressVerified(false);
      }
    }
  };
  
  // Sélectionner une adresse depuis le dropdown
  const selectAddress = (address) => {
    setFormData({ ...formData, studentAddress: address });
    setShowAddressDropdown(false);
    setIsAddressVerified(false); // Réinitialiser la vérification
  };
  
  // Vérifie si un diplôme existe déjà pour cette adresse d'étudiant
  const verifyStudentAddress = async () => {
    // Clear any existing messages
    setMessage({ type: '', content: '' });
    
    if (!formData.studentAddress) {
      setMessage({
        type: 'error',
        content: '❌ Veuillez entrer une adresse Ethereum valide.'
      });
      return;
    }
    
    // Vérifier que l'adresse Ethereum est valide
    if (!formData.studentAddress.match(/^0x[a-fA-F0-9]{40}$/)) {
      setMessage({
        type: 'error',
        content: '❌ Format d\'adresse invalide. Une adresse Ethereum doit commencer par 0x et contenir 40 caractères hexadécimaux.'
      });
      return;
    }
    
    setIsVerifying(true);
    setMessage({ type: 'info', content: '⏳ Vérification en cours...' });
    
    try {
      // Vérifier si un diplôme existe déjà pour cette adresse
      const exists = await contractService.verifyDiploma(formData.studentAddress);
      
      if (exists) {
        setMessage({
          type: 'error',
          content: '❌ Un diplôme existe déjà pour cette adresse. Veuillez utiliser une autre adresse.'
        });
        setIsAddressVerified(false);
      } else {
        setMessage({
          type: 'success',
          content: '✅ Adresse vérifiée avec succès. Vous pouvez continuer.'
        });
        setIsAddressVerified(true);
      }
    } catch (error) {
      console.error('Erreur lors de la vérification de l\'adresse:', error);
      setMessage({
        type: 'error',
        content: `Erreur lors de la vérification: ${error.message || 'Erreur inconnue'}`
      });
      setIsAddressVerified(false);
    } finally {
      setIsVerifying(false);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files.length > 0) {
      setFile(e.target.files[0]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage({ type: '', content: '' });

    try {
      // Vérifier si l'utilisateur est administrateur
      const isAdmin = await contractService.isAdmin();
      if (!isAdmin) {
        setMessage({
          type: 'error',
          content: "Vous n'êtes pas autorisé à ajouter des diplômes. Seul l'administrateur peut effectuer cette action."
        });
        setIsLoading(false);
        return;
      }

      // Vérifier que tous les champs sont remplis
      if (!formData.studentName || !formData.studentAddress || !formData.specialization || !file || !formData.issueDate) {
        setMessage({
          type: 'error',
          content: 'Veuillez remplir tous les champs et télécharger un fichier.'
        });
        setIsLoading(false);
        return;
      }

      // Vérifier que l'adresse Ethereum est valide
      if (!formData.studentAddress.match(/^0x[a-fA-F0-9]{40}$/)) {
        setMessage({
          type: 'error',
          content: "L'adresse Ethereum n'est pas valide."
        });
        setIsLoading(false);
        return;
      }
      
      // Vérifier si l'adresse a été vérifiée
      if (!isAddressVerified) {
        // Vérifier l'adresse avant de continuer
        await verifyStudentAddress();
        
        // Si après vérification l'adresse n'est toujours pas valide, arrêter
        if (!isAddressVerified) {
          setIsLoading(false);
          return;
        }
      }

      // Informer l'utilisateur que le processus est en cours
      setMessage({
        type: 'info',
        content: 'Téléchargement du fichier sur IPFS en cours...'
      });

      // Télécharger le fichier sur IPFS avec gestion d'erreur
      let fileHash;
      try {
        fileHash = await ipfsService.uploadToIPFS(file);
        console.log('Fichier téléchargé sur IPFS avec le hash:', fileHash);
      } catch (ipfsError) {
        console.error('Erreur lors du téléchargement du fichier sur IPFS:', ipfsError);
        // En cas d'erreur, utiliser un hash de développement pour continuer
        fileHash = 'Qm' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
        console.log('Utilisation d\'un hash de développement:', fileHash);
      }
      
      // Créer les métadonnées du diplôme avant de les envoyer à IPFS
      const fileURL = ipfsService.getIPFSGatewayURL(fileHash);
      
      // Log the date before creating metadata
      console.log('Creating metadata - Raw issueDate from form:', formData.issueDate);
      
      // Ensure the date is in YYYY-MM-DD format and consistent
      let issueDate = formData.issueDate;
      if (issueDate) {
        // If it's a full ISO string, extract just the date part
        if (issueDate.includes('T')) {
          issueDate = issueDate.split('T')[0];
        }
        // Ensure it's in YYYY-MM-DD format
        const dateObj = new Date(issueDate);
        if (!isNaN(dateObj.getTime())) {
          // Format as YYYY-MM-DD
          issueDate = dateObj.toISOString().split('T')[0];
        } else {
          // Fallback to current date if invalid
          console.warn('Invalid date, falling back to current date');
          issueDate = new Date().toISOString().split('T')[0];
        }
      } else {
        // If no date provided, use current date
        issueDate = new Date().toISOString().split('T')[0];
      }
      
      console.log('Final formatted issueDate for metadata:', issueDate);
      
      const metadata = {
        studentName: formData.studentName,
        studentAddress: formData.studentAddress,
        specialization: formData.specialization,
        issueDate: issueDate, // This is now guaranteed to be in YYYY-MM-DD format
        fileHash: fileHash,
        fileURL: fileURL,
        fileName: file.name,
        fileType: file.type,
        fileSize: file.size,
        issuerAddress: window.ethereum?.selectedAddress || '0x0000000000000000000000000000000000000000',
        issuerName: "Université XYZ",
        timestamp: Date.now()
      };
      
      console.log('Metadata to be uploaded to IPFS:', JSON.stringify(metadata, null, 2));
      
      // Mettre à jour le message
      setMessage({
        type: 'info',
        content: 'Téléchargement des métadonnées sur IPFS en cours...'
      });

      // Télécharger les métadonnées sur IPFS
      let metadataHash;
      try {
        console.log('Uploading metadata to IPFS...');
        metadataHash = await ipfsService.uploadJSONToIPFS(metadata);
        console.log('Métadonnées téléchargées sur IPFS avec le hash:', metadataHash);
        console.log('Full metadata that was uploaded to IPFS:', {
          ...metadata,
          _debug: {
            issueDateType: typeof metadata.issueDate,
            issueDateValue: metadata.issueDate,
            timestamp: new Date().toISOString()
          }
        });
      } catch (ipfsError) {
        console.error('Erreur lors du téléchargement des métadonnées sur IPFS:', ipfsError);
        // En cas d'erreur, utiliser un hash de développement pour continuer
        metadataHash = 'Qm' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
        console.log('Utilisation d\'un hash de métadonnées de développement:', metadataHash);
      }
      
      // Mettre à jour le message
      setMessage({
        type: 'info',
        content: 'Enregistrement du diplôme sur la blockchain...'
      });
      
      // Les métadonnées ont déjà été créées plus tôt dans le flux
      
      // Ajouter le diplôme au contrat
      await contractService.addDiploma(
        formData.studentAddress,
        formData.studentName,
        formData.specialization,
        metadataHash
      );
      
      // Reset form but keep the selected date
      setFormData({
        studentName: '',
        studentAddress: '',
        specialization: '',
        issueDate: formData.issueDate, // Keep the selected date
      });
      setFile(null);
      
      // Call the success callback with the new diploma data
      if (onSuccess) {
        onSuccess({
          studentName: formData.studentName,
          studentAddress: formData.studentAddress,
          specialization: formData.specialization,
          issueDate: formData.issueDate
        });
      }
      
      // Fermer le modal immédiatement
      onClose();
    } catch (error) {
      console.error('Erreur lors de l\'ajout du diplôme:', error);
      
      // Détecter les erreurs spécifiques du contrat
      let errorMessage = error.message || 'Erreur inconnue';
      
      // Vérifier les erreurs de duplication
      if (errorMessage.includes('Diploma already exists for this student')) {
        errorMessage = `Un diplôme existe déjà pour cet étudiant (${formData.studentName}). Veuillez vérifier l'adresse Ethereum ou le nom de l'étudiant.`;
      } 
      // Vérifier les erreurs d'autorisation
      else if (errorMessage.includes('Only admin can add diplomas')) {
        errorMessage = `Vous n'avez pas les droits d'administrateur nécessaires pour ajouter un diplôme.`;
      }
      // Vérifier les erreurs de connexion MetaMask
      else if (errorMessage.includes('MetaMask') || errorMessage.includes('wallet')) {
        errorMessage = `Erreur de connexion avec MetaMask. Veuillez vérifier que vous êtes connecté au bon réseau.`;
      }
      
      setMessage({
        type: 'error',
        content: `Erreur lors de l'ajout du diplôme: ${errorMessage}`
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      document.body.style.paddingRight = '15px';
    } else {
      document.body.style.overflow = 'unset';
      document.body.style.paddingRight = '0';
    }

    return () => {
      document.body.style.overflow = 'unset';
      document.body.style.paddingRight = '0';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[999999]" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
      {/* Click outside to close */}
      <div 
        className="fixed inset-0 backdrop-blur-sm bg-white/30" 
        onClick={onClose}
        style={{ 
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 1
        }}
      />
      <div 
        className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col transform transition-all duration-300 ease-out"
        style={{
          position: 'relative',
          zIndex: 2,
          width: '100%',
          maxWidth: '42rem',
          maxHeight: '90vh',
          '--scrollbar-thumb': '#3b82f6',
          '--scrollbar-track': '#f3f4f6',
          scrollbarWidth: 'thin',
          scrollbarColor: 'var(--scrollbar-thumb) var(--scrollbar-track)'
        }}
      >
        <style jsx global>{`
          .modal-scroll::-webkit-scrollbar {
            width: 8px;
            height: 8px;
          }
          .modal-scroll::-webkit-scrollbar-track {
            background: var(--scrollbar-track);
            border-radius: 4px;
          }
          .modal-scroll::-webkit-scrollbar-thumb {
            background-color: var(--scrollbar-thumb);
            border-radius: 4px;
          }
          .modal-scroll::-webkit-scrollbar-thumb:hover {
            background-color: #2563eb;
          }
        `}</style>
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center">
          <h2 className="text-xl font-semibold text-gray-800">Ajouter un Diplôme</h2>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500 focus:outline-none transition-colors duration-200"
            aria-label="Fermer"
          >
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        {/* Body */}
        <div className="p-6 overflow-y-auto flex-1 modal-scroll">
          {/* Message Alert */}
          {message.content && (
            <div className={`mb-6 p-4 rounded-lg ${
              message.type === 'error' ? 'bg-red-50 text-red-700 border-l-4 border-red-500' : 
              message.type === 'info' ? 'bg-blue-50 text-blue-700 border-l-4 border-blue-500' : 
              'bg-green-50 text-green-700 border-l-4 border-green-500'
            }`}>
              <div className="flex">
                <div className="flex-shrink-0">
                  {message.type === 'error' ? (
                    <svg className="h-5 w-5 text-red-500" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                  ) : message.type === 'info' ? (
                    <svg className="h-5 w-5 text-blue-500" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM9 11H7a2 2 0 00-2 2v3a2 2 0 110 4h3a2 2 0 112 2v3h2a2 2 0 110 4h-2v-4h-3a2 2 0 01-2-2V13a2 2 0 012-2h2V9a2 2 0 012-2h2a2 2 0 012 2v2h2a2 2 0 010 4h-2v2h-3a2 2 0 01-2 2H9z" clipRule="evenodd" />
                    </svg>
                  ) : (
                    <svg className="h-5 w-5 text-green-500" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM7 9H5a2 2 0 00-2 2v6a2 2 0 110 4h14a2 2 0 110-4v-6a2 2 0 00-2-2h-2v2H7V9z" clipRule="evenodd" />
                    </svg>
                  )}
                </div>
                <div className="ml-3">
                  <p className="text-sm">{message.content}</p>
                </div>
              </div>
            </div>
          )}
          
          <form onSubmit={handleSubmit} className="space-y-6">
          {/* Student Name */}
          <div>
            <label htmlFor="studentName" className="block text-sm font-medium text-gray-700 mb-1.5 text-left">
              Nom de l'étudiant
            </label>
            <div className="flex space-x-2">
              <div className="flex-1 relative">
                <input
                  type="text"
                  id="studentName"
                  name="studentName"
                  autoComplete="off"
                  autoCorrect="off"
                  autoCapitalize="none"
                  spellCheck="false"
                  value={formData.studentName}
                  onChange={handleChange}
                  className={`w-full px-4 py-2.5 text-sm text-gray-800 bg-white border ${
                    formData.studentName ? 'border-blue-500' : 'border-gray-300'
                  } rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 focus:outline-none`}
                  placeholder="Entrez le nom complet"
                  required
                />
                {formData.studentName && (
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                    <svg className="h-5 w-5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                )}
              </div>
            </div>
          </div>

            
            {/* Ethereum Address */}
            <div>
              <label htmlFor="studentAddress" className="block text-sm font-medium text-gray-700 mb-1.5 text-left">
                Adresse Ethereum de l'étudiant
              </label>
              <div className="flex space-x-2">
                <div className="flex-1 relative">
                  <input
                    type="text"
                    id="studentAddress"
                    name="studentAddress"
                    autoComplete="off"
                    autoCorrect="off"
                    autoCapitalize="none"
                    spellCheck="false"
                    value={formData.studentAddress}
                    onChange={handleChange}
                    onClick={() => setShowAddressDropdown(true)}
                    className={`w-full px-4 py-2.5 text-sm text-gray-800 bg-white border ${
                      isAddressVerified ? 'border-green-500' : 'border-gray-300'
                    } rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500`}
                    placeholder="0x..."
                    required
                  />
                  {isAddressVerified && (
                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                      <svg className="h-5 w-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  )}
                  
                  {/* Address Dropdown */}
                  {showAddressDropdown && (
                    <div className="absolute z-10 mt-1 w-full bg-white shadow-lg rounded-lg border border-gray-200 max-h-60 overflow-auto">
                      <div className="px-4 py-2 bg-gray-50 border-b border-gray-100 text-sm font-medium text-gray-500 flex justify-between items-center">
                        <span>Sélectionner une adresse existante</span>
                        <button 
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setShowAddressDropdown(false);
                          }}
                          className="text-gray-400 hover:text-gray-500"
                        >
                          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                      {isLoadingAddresses ? (
                        <div className="px-4 py-2 text-center text-sm text-gray-500">Chargement...</div>
                      ) : existingAddresses.length > 0 ? (
                        <div className="max-h-48 overflow-y-auto">
                          {existingAddresses.map((address, index) => (
                            <div 
                              key={index}
                              className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 cursor-pointer"
                              onClick={() => {
                                selectAddress(address);
                                setShowAddressDropdown(false);
                              }}
                            >
                              {address}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="px-4 py-2 text-center text-sm text-gray-500">Aucune adresse trouvée</div>
                      )}
                    </div>
                  )}
                </div>
                <button
                  type="button"
                  onClick={verifyStudentAddress}
                  disabled={isVerifying || !formData.studentAddress}
                  className="px-4 py-2.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                >
                  {isVerifying ? 'Vérification...' : 'Vérifier'}
                </button>
              </div>
              {isAddressVerified && (
                <p className="mt-1 text-xs text-green-600">
                  Adresse vérifiée et disponible pour un nouveau diplôme
                </p>
              )}
            </div>
            
              {/* Specialization */}
              <div>
                <label htmlFor="specialization" className="block text-sm font-medium text-gray-700 mb-1.5 text-left">
                  Spécialité
                </label>
                <div className="flex space-x-2">
                  <div className="flex-1 relative">
                    <input
                      type="text"
                      id="specialization"
                      name="specialization"
                      autoComplete="off"
                      autoCorrect="off"
                      autoCapitalize="none"
                      spellCheck="false"
                      value={formData.specialization}
                      onChange={handleChange}
                      className={`w-full px-4 py-2.5 text-sm text-gray-800 bg-white border ${
                        formData.specialization ? 'border-blue-500' : 'border-gray-300'
                      } rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 focus:outline-none`}
                      placeholder="Ex: Informatique, Mathématiques, etc."
                      required
                    />
                    {formData.specialization && (
                      <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                        <svg className="h-5 w-5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                    )}
                  </div>
                </div>
              </div>

            
            {/* Issue Date */}
            <div className="mb-4">
              <label htmlFor="issueDate" className="block text-sm font-medium text-gray-700 mb-1.5 text-left">
                Date d'émission <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                id="issueDate"
                name="issueDate"
                autoComplete="off"
                value={formData.issueDate}
                onChange={handleChange}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border"
                required
                max={new Date().toISOString().split('T')[0]} // Prevent future dates
              />
              {formData.issueDate && (
                <p className="mt-1 text-xs text-gray-500">
                  Date sélectionnée : {new Date(formData.issueDate).toLocaleDateString('fr-FR', {
                    day: '2-digit',
                    month: 'long',
                    year: 'numeric'
                  })}
                </p>
              )}
            </div>
            
            {/* File Upload */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5 text-left">
                Fichier du Certificat
              </label>
              <div className="mt-1 px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-lg">
                <div className="space-y-1 text-center">
                  <div className="flex justify-center">
                    <svg
                      className="h-12 w-12 text-gray-400"
                      stroke="currentColor"
                      fill="none"
                      viewBox="0 0 48 48"
                      aria-hidden="true"
                    >
                      <path
                        d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                        strokeWidth={2}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </div>
                  <div className="flex flex-col items-center text-sm text-gray-600">
                    <label
                      htmlFor="certificateFile"
                      className="relative cursor-pointer bg-white rounded-md font-medium text-blue-600 hover:text-blue-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-blue-500"
                    >
                      <span>Télécharger un fichier</span>
                      <input
                        id="certificateFile"
                        name="certificateFile"
                        type="file"
                        className="sr-only focus:outline-none"
                        onChange={handleFileChange}
                        accept=".pdf,.jpg,.jpeg,.png"
                        required
                      />
                    </label>
                    <p className="text-xs text-gray-500 mt-2">
                      ou glisser-déposer
                    </p>
                  </div>
                  <p className="text-xs text-gray-500">
                    PDF, JPG ou PNG jusqu'à 10MB
                  </p>
                  {file && (
                    <p className="text-xs text-gray-900 mt-2">
                      Fichier sélectionné: {file.name}
                    </p>
                  )}
                </div>
              </div>
            </div>
            
            <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex justify-end space-x-3">
              <button
                type="button"
                onClick={onClose}
                disabled={isLoading}
                className="px-5 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className="px-5 py-2.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-70 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center min-w-[150px]"
              >
                {isLoading ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Traitement...
                  </>
                ) : (
                  'Ajouter le Diplôme'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AddDiplomaModal;
