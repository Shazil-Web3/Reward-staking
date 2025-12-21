'use client';

import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { bsc, sepolia } from 'wagmi/chains';

export const config = getDefaultConfig({
  appName: 'CryptoCommunity Platform',
  projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || 'YOUR_PROJECT_ID',
  chains: [bsc, sepolia], // BNB Chain mainnet + Sepolia testnet
  ssr: true,
});
