'use client';

import { useAccount, useConnect, useDisconnect, useBalance } from 'wagmi';
import { useEffect, useState } from 'react';

export function useWallet() {
  const { address, isConnected, isConnecting, isDisconnected, chain } = useAccount();
  const { connect, connectors, error: connectError, isLoading: isConnectLoading } = useConnect();
  const { disconnect } = useDisconnect();
  const [mounted, setMounted] = useState(false);

  // Get ETH balance for connected account
  const { data: balance, isLoading: balanceLoading } = useBalance({
    address,
    enabled: isConnected && !!address,
  });

  // Handle hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return {
      address: null,
      isConnected: false,
      isConnecting: false,
      isDisconnected: true,
      chain: null,
      balance: null,
      balanceLoading: false,
      connect,
      disconnect,
      connectors: [],
      connectError: null,
      isConnectLoading: false,
    };
  }

  return {
    address,
    isConnected,
    isConnecting,
    isDisconnected,
    chain,
    balance,
    balanceLoading,
    connect,
    disconnect,
    connectors,
    connectError,
    isConnectLoading,
  };
}