'use client';

import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import {
  mainnet,
  sepolia,
} from 'wagmi/chains';

// Celo Alfajores Testnet
const celoAlfajores = {
  id: 44787,
  name: 'Celo Alfajores Testnet',
  nativeCurrency: {
    decimals: 18,
    name: 'CELO',
    symbol: 'CELO',
  },
  rpcUrls: {
    default: {
      http: ['https://alfajores-forno.celo-testnet.org'],
    },
    public: {
      http: ['https://alfajores-forno.celo-testnet.org'],
    },
  },
  blockExplorers: {
    default: { name: 'CeloScan', url: 'https://alfajores.celoscan.io' },
  },
  testnet: true,
};

export const config = getDefaultConfig({
  appName: 'CryptoCommunity Platform',
  projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || 'YOUR_PROJECT_ID',
  chains: [
    celoAlfajores,
    ...(process.env.NODE_ENV === 'development' ? [sepolia] : []),
  ],
  ssr: true,
});
