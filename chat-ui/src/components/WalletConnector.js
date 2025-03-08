import React from 'react';
import { useWallet } from '../contexts/WalletContext';

const WalletConnector = () => {
  const { account, isConnecting, error, connectWallet, disconnectWallet, isMetaMaskAvailable } = useWallet();

  // Format address to show only first 6 and last 4 characters
  const formatAddress = (address) => {
    if (!address) return '';
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
  };

  return (
    <div className="flex items-center">
      {account ? (
        <div className="flex items-center">
          <span className="bg-green-100 text-green-800 text-xs font-medium px-2.5 py-0.5 rounded-full mr-2">
            {formatAddress(account)}
          </span>
          <button
            onClick={disconnectWallet}
            className="text-xs bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium py-1 px-2 rounded"
          >
            Disconnect
          </button>
        </div>
      ) : (
        <div>
          {!isMetaMaskAvailable ? (
            <a
              href="https://metamask.io/download/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs bg-yellow-500 hover:bg-yellow-600 text-white font-medium py-1 px-2 rounded"
            >
              Install MetaMask
            </a>
          ) : (
            <button
              onClick={connectWallet}
              disabled={isConnecting}
              className="text-xs bg-pink-600 hover:bg-pink-700 text-white font-medium py-1 px-2 rounded disabled:opacity-50"
            >
              {isConnecting ? 'Connecting...' : 'Connect Wallet'}
            </button>
          )}
          {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
        </div>
      )}
    </div>
  );
};

export default WalletConnector; 