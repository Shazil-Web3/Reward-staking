'use client';

import { http, createConfig } from 'wagmi';
import { bsc, sepolia } from 'wagmi/chains';
import { injected, walletConnect } from 'wagmi/connectors';

const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || 'YOUR_PROJECT_ID';

export const config = createConfig({
  chains: [bsc, sepolia],
  connectors: [
    injected(),
    walletConnect({ projectId }),
  ],
  transports: {
    [bsc.id]: http('https://bsc-dataseed1.binance.org'),
    [sepolia.id]: http('https://ethereum-sepolia-rpc.publicnode.com', {
      batch: true,
      retryCount: 5,
      retryDelay: 1000,
    }),
  },
  ssr: true,
});
