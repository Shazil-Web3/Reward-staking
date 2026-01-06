'use client';

import { useState, useEffect } from 'react';
import { useChainId } from 'wagmi';
import { createPublicClient, http, parseUnits, formatUnits } from 'viem';
import { bsc } from 'viem/chains';
import { PANCAKE_ROUTER, PANCAKE_ROUTER_ABI, USDT_ADDRESS, WBNB_ADDRESS, CCT_ADDRESS } from '@/lib/pancakeswap';
import { USDT_DECIMALS, CCT_DECIMALS } from '@/config/constants';

export function usePancakePrice(usdtAmount) {
  const [cctAmount, setCctAmount] = useState(null);
  const [pricePerToken, setPricePerToken] = useState(null);
  const [wbnbQuote, setWbnbQuote] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  const chainId = useChainId();

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
      
      try {
        // Create a dedicated BNB Chain RPC client (regardless of user's connected network)
        const bnbClient = createPublicClient({
          chain: bsc,
          transport: http('https://bsc-dataseed1.binance.org')
        });
        
        console.log(`📡 Fetching live prices from BNB Chain (User on Chain ID: ${chainId})`);
        
        const usdtWei = parseUnits(usdtAmount.toString(), USDT_DECIMALS);

        // Try V2 DIRECT first (USDT -> CCT)
        try {
          const amounts = await bnbClient.readContract({
            address: PANCAKE_ROUTER,
            abi: PANCAKE_ROUTER_ABI,
            functionName: 'getAmountsOut',
            args: [usdtWei, [USDT_ADDRESS, CCT_ADDRESS]]
          });
          
          console.log("📊 V2 Direct RAW:", amounts);
          const cctOut = formatUnits(amounts[1], CCT_DECIMALS);
          console.log("📊 V2 Direct Formatted:", cctOut);
          
          setCctAmount(cctOut);
          setPricePerToken(parseFloat(usdtAmount) / parseFloat(cctOut));
          setLoading(false);
          return; 
        } catch (err) {
          console.warn('V2 Direct failed, trying V2 Hop...');
          
          // Try V2 HOP (USDT -> WBNB -> CCT)
          try {
            const amounts = await bnbClient.readContract({
              address: PANCAKE_ROUTER,
              abi: PANCAKE_ROUTER_ABI,
              functionName: 'getAmountsOut',
              args: [usdtWei, [USDT_ADDRESS, WBNB_ADDRESS, CCT_ADDRESS]]
            });
            
            console.log("📊 V2 Hop RAW:", amounts);
            const cctOut = formatUnits(amounts[2], CCT_DECIMALS);
            console.log("📊 V2 Hop Formatted:", cctOut);
            
            setCctAmount(cctOut);
            setPricePerToken(parseFloat(usdtAmount) / parseFloat(cctOut));
            setLoading(false);
            return; 
          } catch (hopErr) {
            console.error('V2 Hop failed:', hopErr);
            setError('Unable to fetch CCT price from PancakeSwap');
            setCctAmount(null);
            setPricePerToken(null);
          }
        }
      } catch (err) {
        console.error('BNB RPC connection error:', err);
        setError('Unable to connect to BNB Chain');
        setCctAmount(null);
        setPricePerToken(null);
      } finally {
        setLoading(false);
      }
    }

    const timer = setTimeout(fetchPrice, 500);
    return () => clearTimeout(timer);
    
  }, [usdtAmount, chainId]);

  return { cctAmount, pricePerToken, wbnbQuote, loading, error };
}
