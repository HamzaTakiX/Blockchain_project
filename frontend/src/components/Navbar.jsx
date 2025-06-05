import { useState, useEffect } from 'react';
import WalletConnect from './WalletConnect';
import contractService from '../services/contractService';

const Navbar = ({ onPageChange }) => {
  const [isAdmin, setIsAdmin] = useState(false);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const checkAdminStatus = async () => {
      const adminStatus = await contractService.isAdmin();
      setIsAdmin(adminStatus);
    };

    if (connected) {
      checkAdminStatus();
    }
  }, [connected]);

  const handleConnect = async (account) => {
    setConnected(!!account);
    const adminStatus = await contractService.isAdmin();
    setIsAdmin(adminStatus);
  };

  return (
    <nav className="bg-gradient-to-r from-blue-700 to-blue-500 text-white shadow-lg relative z-10">
      <div className="container mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          {/* Logo - Left side */}
          <div className="flex-shrink-0">
            <a 
              className="text-2xl font-bold tracking-tight hover:text-blue-100 transition duration-300 flex items-center" 
              href="#home" 
              onClick={() => onPageChange('home')}
            >
              <svg className="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
              CertifDiploma
            </a>
          </div>
          
          {/* Mobile menu button */}
          <div className="block lg:hidden">
            <button 
              className="flex items-center px-3 py-2 border-2 rounded-lg text-white border-blue-300 hover:bg-blue-600 hover:border-white transition duration-300"
              type="button"
              onClick={() => document.getElementById('navbar-menu-mobile').classList.toggle('hidden')}
              aria-label="Toggle navigation"
            >
              <svg className="w-5 h-5 fill-current" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                <path d="M0 3h20v2H0V3zm0 6h20v2H0V9zm0 6h20v2H0v-2z"/>
              </svg>
            </button>
          </div>
          
          {/* Navigation tabs - Center */}
          <div className="hidden lg:flex items-center justify-center flex-1 mx-10">
            <div className="flex space-x-8">
              <a 
                className="relative text-white/90 hover:text-white px-4 py-2 rounded-lg transition-all duration-300 group" 
                href="#search-section" 
                onClick={(e) => {
                  e.preventDefault();
                  onPageChange('verify');
                  const searchSection = document.getElementById('search-section');
                  if (searchSection) {
                    searchSection.scrollIntoView({ behavior: 'smooth' });
                  }
                }}
              >
                <span className="relative z-10">Vérifier un Diplôme</span>
                <span className="absolute inset-0 bg-white/5 rounded-lg scale-95 opacity-0 group-hover:scale-100 group-hover:opacity-100 transition-all duration-300"></span>
                <span className="absolute bottom-0 left-1/2 w-0 h-0.5 bg-white transform -translate-x-1/2 group-hover:w-3/4 transition-all duration-300"></span>
              </a>
              
              {isAdmin && (
                <a 
                  className="relative text-white/90 hover:text-white px-4 py-2 rounded-lg transition-all duration-300 group" 
                  href="#add" 
                  onClick={() => onPageChange('add')}
                >
                  <span className="relative z-10">Ajouter un Diplôme</span>
                  <span className="absolute inset-0 bg-white/5 rounded-lg scale-95 opacity-0 group-hover:scale-100 group-hover:opacity-100 transition-all duration-300"></span>
                  <span className="absolute bottom-0 left-1/2 w-0 h-0.5 bg-white transform -translate-x-1/2 group-hover:w-3/4 transition-all duration-300"></span>
                </a>
              )}
            </div>
          </div>
          
          {/* Wallet connect - Right side */}
          <div className="hidden lg:block flex-shrink-0">
            <WalletConnect onConnect={handleConnect} />
          </div>
          
          {/* Mobile menu - hidden on larger screens */}
          <div className="lg:hidden w-full hidden mt-4" id="navbar-menu-mobile">
            <div className="flex flex-col space-y-4">
              <a 
                className="block w-full px-4 py-3 text-left rounded-lg hover:bg-white/5 transition-all duration-200 text-white/90 hover:text-white relative group" 
                href="#search-section" 
                onClick={(e) => {
                  e.preventDefault();
                  onPageChange('verify');
                  document.getElementById('navbar-menu-mobile').classList.add('hidden');
                  const searchSection = document.getElementById('search-section');
                  if (searchSection) {
                    searchSection.scrollIntoView({ behavior: 'smooth' });
                  }
                }}
              >
                <span className="relative z-10">Vérifier un Diplôme</span>
                <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-white transition-all duration-300 group-hover:w-full"></span>
              </a>
              
              {isAdmin && (
                <a 
                  className="block w-full px-4 py-3 text-left rounded-lg hover:bg-white/5 transition-all duration-200 text-white/90 hover:text-white relative group" 
                  href="#add" 
                  onClick={() => {
                    onPageChange('add');
                    document.getElementById('navbar-menu-mobile').classList.add('hidden');
                  }}
                >
                  <span className="relative z-10">Ajouter un Diplôme</span>
                  <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-white transition-all duration-300 group-hover:w-full"></span>
                </a>
              )}
              
              <div className="pt-2">
                <WalletConnect onConnect={handleConnect} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
