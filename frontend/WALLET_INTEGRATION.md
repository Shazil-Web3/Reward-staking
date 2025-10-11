# RainbowKit Wallet Integration

## Overview
This project now includes RainbowKit for wallet connectivity, providing a seamless and secure way for users to connect their crypto wallets across all pages.

## Features
- ✅ Multiple wallet support (MetaMask, WalletConnect, Coinbase Wallet, etc.)
- ✅ Cross-chain support (Ethereum, Polygon, Arbitrum, Base, Optimism)
- ✅ Global wallet state management
- ✅ Persistent connections across page navigation
- ✅ Responsive design for mobile and desktop
- ✅ Custom theming to match your brand

## Quick Start

### 1. Environment Setup
Create a `.env.local` file with your WalletConnect Project ID:

```env
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_project_id_here
```

Get your project ID from [WalletConnect Cloud](https://cloud.walletconnect.com).

### 2. Using the Wallet Connection

#### In Components
```jsx
import { useWallet } from '@/hooks/useWallet';

function MyComponent() {
  const { address, isConnected, chain, balance } = useWallet();
  
  if (!isConnected) {
    return <p>Please connect your wallet</p>;
  }
  
  return (
    <div>
      <p>Connected: {address}</p>
      <p>Network: {chain?.name}</p>
      <p>Balance: {balance?.formatted} {balance?.symbol}</p>
    </div>
  );
}
```

#### Connect Button
The RainbowKit ConnectButton is already integrated in the header:
- Desktop: Shows full account info with chain selector
- Mobile: Shows compact avatar view

## Files Added/Modified

### New Files
- `src/lib/wagmi.js` - Wagmi configuration
- `src/app/providers.jsx` - RainbowKit & Wagmi providers
- `src/hooks/useWallet.js` - Custom hook for wallet state
- `src/app/components/WalletStatus.jsx` - Demo component showing wallet info
- `.env.local` - Environment configuration

### Modified Files
- `src/app/layout.js` - Added providers wrapper
- `src/app/components/Header.jsx` - Replaced buttons with ConnectButton
- `src/app/dashboard/page.js` - Added wallet status demo
- `src/app/home/page.js` - Added wallet status demo

## Supported Networks
- Ethereum Mainnet
- Polygon
- Optimism
- Arbitrum
- Base
- Sepolia (development only)

## Customization

### Theme Configuration
The RainbowKit theme is configured in `src/app/providers.jsx`:
- Accent color matches your brand (#6366f1 - indigo)
- Custom light/dark mode support
- Compact modal size for mobile-first experience

### Adding Networks
To add more networks, edit `src/lib/wagmi.js`:

```javascript
import { newChain } from 'wagmi/chains';

export const config = getDefaultConfig({
  // ... existing config
  chains: [
    mainnet,
    polygon,
    // Add your new chain here
    newChain,
  ],
});
```

## Testing
1. Start the development server: `npm run dev`
2. Visit http://localhost:3001
3. Click "Connect Wallet" in the header
4. Select your preferred wallet
5. Navigate between pages to confirm persistent connection
6. Check the wallet status components on home and dashboard pages

## Security Notes
- Never expose private keys in code
- The project uses environment variables for sensitive configuration
- All wallet operations are handled client-side
- RainbowKit follows web3 security best practices

## Support
- [RainbowKit Documentation](https://www.rainbowkit.com/docs)
- [Wagmi Documentation](https://wagmi.sh/)
- [Viem Documentation](https://viem.sh/)