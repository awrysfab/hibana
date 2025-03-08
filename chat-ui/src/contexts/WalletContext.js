import React, { createContext, useState, useContext, useEffect } from 'react';

const WalletContext = createContext();

export const useWallet = () => useContext(WalletContext);

export const WalletProvider = ({ children }) => {
  const [account, setAccount] = useState(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState(null);

  // Check if window.ethereum is available
  const isMetaMaskAvailable = typeof window !== 'undefined' && window.ethereum;

  // Connect to wallet
  const connectWallet = async () => {
    if (!isMetaMaskAvailable) {
      setError('MetaMask is not installed. Please install MetaMask to connect your wallet.');
      return;
    }

    setIsConnecting(true);
    setError(null);

    try {
      // Request account access
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      
      if (accounts.length > 0) {
        setAccount(accounts[0]);
      } else {
        setError('No accounts found. Please create an account in MetaMask.');
      }
    } catch (error) {
      console.error('Error connecting to wallet:', error);
      setError(error.message || 'Failed to connect to wallet');
    } finally {
      setIsConnecting(false);
    }
  };

  // Disconnect wallet
  const disconnectWallet = () => {
    setAccount(null);
  };

  // Listen for account changes
  useEffect(() => {
    if (isMetaMaskAvailable) {
      const handleAccountsChanged = (accounts) => {
        if (accounts.length > 0) {
          setAccount(accounts[0]);
        } else {
          setAccount(null);
        }
      };

      window.ethereum.on('accountsChanged', handleAccountsChanged);

      // Check if already connected
      window.ethereum.request({ method: 'eth_accounts' })
        .then(handleAccountsChanged)
        .catch(console.error);

      return () => {
        window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
      };
    }
  }, [isMetaMaskAvailable]);

  return (
    <WalletContext.Provider
      value={{
        account,
        isConnecting,
        error,
        connectWallet,
        disconnectWallet,
        isMetaMaskAvailable
      }}
    >
      {children}
    </WalletContext.Provider>
  );
}; 