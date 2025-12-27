'use client';

import { useState, useEffect } from 'react';
import { usePublicClient } from 'wagmi';
import { parseUnits, formatUnits } from 'viem';
import { PANCAKE_ROUTER, PANCAKE_ROUTER_ABI, PANCAKE_QUOTER_V3, QUOTER_V3_ABI, USDT_ADDRESS, WBNB_ADDRESS, CCT_ADDRESS } from '@/lib/pancakeswap';

export function usePancakePrice(usdtAmount) {
  const [cctAmount, setCctAmount] = useState(null);
  const [pricePerToken, setPricePerToken] = useState(null);
  const [wbnbQuote, setWbnbQuote] = useState(null); // System check value
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  const publicClient = usePublicClient();

  useEffect(() => {
    if (!usdtAmount || usdtAmount === '' || parseFloat(usdtAmount) <= 0) {
      setCctAmount(null);
      setPricePerToken(null);
      setWbnbQuote(null);
      return;
    }

    async function fetchPrice() {
      setLoading(true);
      setError(null);
      
      const usdtWei = parseUnits(usdtAmount.toString(), 18);

      // Try V2 DIRECT first (USDT -> CCT)
      try {
        const amounts = await publicClient.readContract({
          address: PANCAKE_ROUTER,
          abi: PANCAKE_ROUTER_ABI,
          functionName: 'getAmountsOut',
          args: [usdtWei, [USDT_ADDRESS, CCT_ADDRESS]]
        });
        
        console.log("📊 V2 Direct RAW:", amounts);
        const cctOut = formatUnits(amounts[1], 18);
        console.log("📊 V2 Direct Formatted:", cctOut);
        
        setCctAmount(cctOut);
        setPricePerToken(parseFloat(usdtAmount) / parseFloat(cctOut));
        return; 
      } catch (err) {
        console.warn('V2 Direct failed, trying V2 Hop...');
        
        // Try V2 HOP (USDT -> WBNB -> CCT)
        // REQUIRED: User's token is paired with BNB, not USDT directly.
        try {
           const amounts = await publicClient.readContract({
            address: PANCAKE_ROUTER,
            abi: PANCAKE_ROUTER_ABI,
            functionName: 'getAmountsOut',
            args: [usdtWei, [USDT_ADDRESS, WBNB_ADDRESS, CCT_ADDRESS]]
          });
          
          console.log("📊 V2 Hop RAW:", amounts);
          const cctOut = formatUnits(amounts[2], 18);
          console.log("📊 V2 Hop Formatted:", cctOut);
          
          setCctAmount(cctOut);
          setPricePerToken(parseFloat(usdtAmount) / parseFloat(cctOut));
          return; 
        } catch (hopErr) {
             console.error('V2 Hop failed:', hopErr);
             setError('Liquidity not found (V2).');
             setCctAmount(null);
             setPricePerToken(null);
        }
      } finally {
        setLoading(false);
      }
    }

    const timer = setTimeout(fetchPrice, 500);
    return () => clearTimeout(timer);
    
  }, [usdtAmount, publicClient]);

  return { cctAmount, pricePerToken, wbnbQuote, loading, error };
}
