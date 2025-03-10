import React, { useState, useRef, useEffect } from 'react';
import { Send } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import './index.css';
import { WalletProvider } from './contexts/WalletContext';
import WalletConnector from './components/WalletConnector';
import { useWallet } from './contexts/WalletContext';

const BACKEND_ROUTE = 'api/routes/chat/'

const ChatInterface = () => {
  const [messages, setMessages] = useState([
    { 
      text: "Hi, I'm Artemis! 👋 I'm your Copilot for Flare, ready to help you with operations like connecting your wallet, sending tokens, and executing token swaps. \n\n⚠️ While I aim to be accurate, never risk funds you can't afford to lose.",
      type: 'bot' 
    }
  ]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [awaitingConfirmation, setAwaitingConfirmation] = useState(false);
  const [pendingTransaction, setPendingTransaction] = useState(null);
  const messagesEndRef = useRef(null);
  const { account } = useWallet();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Effect to notify when wallet is connected
  useEffect(() => {
    if (account) {
      setMessages(prev => [
        ...prev, 
        { 
          text: `Your wallet has been connected successfully! Your address is: ${account}`, 
          type: 'bot' 
        }
      ]);
    }
  }, [account]);

  const handleSendMessage = async (text) => {
    try {
      // If wallet is connected, include the address in the request
      const requestBody = {
        message: text
      };
      
      if (account) {
        requestBody.wallet_address = account;
      }
      
      const response = await fetch(BACKEND_ROUTE, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });
      
      if (!response.ok) {
        throw new Error('Network response was not ok');
      }

      const data = await response.json();
      
      // Check if response contains a transaction preview
      if (data.response.includes('Transaction Preview:')) {
        setAwaitingConfirmation(true);
        setPendingTransaction(text);
      }
      
      // Check if response contains transaction data for wallet extension
      if (data.response.includes('tx_data:')) {
        try {
          // Parse the transaction data with the new format
          // Format: tx_data:toAddress:valueHex:valueWei
          const txDataMatch = data.response.match(/tx_data:(0x[a-fA-F0-9]+):(0x[a-fA-F0-9]+):(\d+)/);
          
          if (txDataMatch && window.ethereum && account) {
            const toAddress = txDataMatch[1];
            const valueHex = txDataMatch[2]; // Use hex value for precision
            
            console.log('Transaction data:', {
              from: account,
              to: toAddress,
              value: valueHex
            });
            
            // Send transaction using wallet extension
            const transactionParameters = {
              from: account,
              to: toAddress,
              value: valueHex, // Use hex value for better precision
              gas: '0x5208', // 21000 in hex
            };
            
            // Send the transaction using the wallet extension
            const txHash = await window.ethereum.request({
              method: 'eth_sendTransaction',
              params: [transactionParameters],
            });
            
            // Return a modified response with the transaction hash
            return `Transaction sent successfully! Transaction hash: ${txHash}`;
          }
        } catch (walletError) {
          console.error('Wallet transaction error:', walletError);
          return `Error sending transaction: ${walletError.message}`;
        }
      }
      
      return data.response;
    } catch (error) {
      console.error('Error:', error);
      return 'Sorry, there was an error processing your request. Please try again.';
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!inputText.trim() || isLoading) return;

    const messageText = inputText.trim();
    setInputText('');
    setIsLoading(true);
    setMessages(prev => [...prev, { text: messageText, type: 'user' }]);

    // Handle transaction confirmation
    if (awaitingConfirmation) {
      if (messageText.toUpperCase() === 'CONFIRM') {
        setAwaitingConfirmation(false);
        
        // Check if wallet is connected
        if (!account && window.ethereum) {
          // If wallet is not connected but available, prompt to connect
          try {
            const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
            if (accounts.length > 0) {
              // Wait for the account state to update
              setTimeout(async () => {
                const response = await handleSendMessage(pendingTransaction);
                setMessages(prev => [...prev, { text: response, type: 'bot' }]);
                setIsLoading(false);
              }, 1000);
              return;
            }
          } catch (error) {
            console.error('Error connecting wallet:', error);
            setMessages(prev => [...prev, { 
              text: 'Failed to connect wallet. Please connect your wallet and try again.', 
              type: 'bot' 
            }]);
            setIsLoading(false);
            return;
          }
        }
        
        const response = await handleSendMessage(pendingTransaction);
        setMessages(prev => [...prev, { text: response, type: 'bot' }]);
      } else {
        setAwaitingConfirmation(false);
        setPendingTransaction(null);
        setMessages(prev => [...prev, { 
          text: 'Transaction cancelled. How else can I help you?', 
          type: 'bot' 
        }]);
      }
    } else {
      const response = await handleSendMessage(messageText);
      setMessages(prev => [...prev, { text: response, type: 'bot' }]);
    }

    setIsLoading(false);
  };

  // Custom components for ReactMarkdown
  const MarkdownComponents = {
    // Override paragraph to remove default margins
    p: ({ children }) => <span className="inline">{children}</span>,
    // Style code blocks
    code: ({ node, inline, className, children, ...props }) => (
      inline ? 
        <code className="bg-gray-200 rounded px-1 py-0.5 text-sm">{children}</code> :
        <pre className="bg-gray-200 rounded p-2 my-2 overflow-x-auto">
          <code {...props} className="text-sm">{children}</code>
        </pre>
    ),
    // Style links
    a: ({ node, children, ...props }) => (
      <a {...props} className="text-pink-600 hover:underline">{children}</a>
    )
  };

  return (
    <div className="flex flex-col h-screen bg-gray-100">
      <div className="flex flex-col h-full max-w-4xl mx-auto w-full shadow-lg bg-white">
        {/* Header */}
        <div className="bg-pink-600 text-white p-4 flex justify-between items-center">
          <div>
            <h1 className="text-xl font-bold">Artemis</h1>
            <p className="text-sm opacity-80">DeFAI Copilot for Flare (gemini-2.0-flash)</p>
          </div>
          <WalletConnector />
        </div>

        {/* Messages container */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((message, index) => (
            <div
              key={index}
              className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {message.type === 'bot' && (
                <div className="w-8 h-8 rounded-full bg-pink-600 flex items-center justify-center text-white font-bold mr-2">
                  A
                </div>
              )}
              <div
                className={`max-w-xs px-4 py-2 rounded-xl ${
                  message.type === 'user'
                    ? 'bg-pink-600 text-white rounded-br-none'
                    : 'bg-gray-100 text-gray-800 rounded-bl-none'
                }`}
              >
                <ReactMarkdown 
                  components={MarkdownComponents}
                  className="text-sm break-words whitespace-pre-wrap"
                >
                  {message.text}
                </ReactMarkdown>
              </div>
              {message.type === 'user' && (
                <div className="w-8 h-8 rounded-full bg-gray-400 flex items-center justify-center text-white font-bold ml-2">
                  U
                </div>
              )}
            </div>
          ))}
          {isLoading && (
            <div className="flex justify-start">
              <div className="w-8 h-8 rounded-full bg-pink-600 flex items-center justify-center text-white font-bold mr-2">
                A
              </div>
              <div className="bg-gray-100 text-gray-800 px-4 py-2 rounded-xl rounded-bl-none">
                <div className="flex space-x-2">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input form */}
        <div className="border-t border-gray-200 p-4">
          <form onSubmit={handleSubmit} className="flex space-x-4">
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder={awaitingConfirmation ? "Type CONFIRM to proceed or anything else to cancel" : "Type your message... (Markdown supported)"}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent"
              disabled={isLoading}
            />
            <button
              type="submit"
              disabled={isLoading}
              className="bg-pink-600 text-white p-2 rounded-full hover:bg-pink-700 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:ring-offset-2 disabled:opacity-50"
            >
              <Send className="w-5 h-5" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

const App = () => {
  return (
    <WalletProvider>
      <ChatInterface />
    </WalletProvider>
  );
};

export default App;