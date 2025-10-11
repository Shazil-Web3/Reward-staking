'use client';

import { useWallet } from '@/hooks/useWallet';

export function WalletStatus() {
  const { address, isConnected, chain, balance, balanceLoading } = useWallet();

  if (!isConnected) {
    return (
      <div className="p-4 bg-gray-100 dark:bg-gray-800 rounded-lg">
        <p className="text-sm text-gray-600 dark:text-gray-400">
          No wallet connected
        </p>
      </div>
    );
  }

  return (
    <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
      <h3 className="font-semibold text-green-800 dark:text-green-200 mb-2">
        Wallet Connected
      </h3>
      <div className="space-y-1 text-sm text-green-700 dark:text-green-300">
        <p>
          <span className="font-medium">Address:</span>{' '}
          {address ? `${address.slice(0, 6)}...${address.slice(-4)}` : 'N/A'}
        </p>
        <p>
          <span className="font-medium">Network:</span>{' '}
          {chain?.name || 'Unknown'}
        </p>
        <p>
          <span className="font-medium">Balance:</span>{' '}
          {balanceLoading 
            ? 'Loading...' 
            : balance 
            ? `${parseFloat(balance.formatted).toFixed(4)} ${balance.symbol}`
            : 'N/A'
          }
        </p>
      </div>
    </div>
  );
}