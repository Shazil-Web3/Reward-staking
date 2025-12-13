'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
    useAccount,
    useReadContract,
    useWriteContract,
    useWaitForTransactionReceipt,
    usePublicClient,
    useBalance
} from 'wagmi';
import { parseUnits, formatUnits, erc20Abi } from 'viem';
import StakingArtifact from './staking.json';

const StakingContext = createContext();

export const useStaking = () => {
    const context = useContext(StakingContext);
    if (!context) {
        throw new Error('useStaking must be used within a StakingProvider');
    }
    return context;
};

// Contract Address from env
const STAKING_CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_STAKING_CONTRACT_ADDRESS;

// Validation: Warn if contract address is missing
if (!STAKING_CONTRACT_ADDRESS) {
    console.error('❌ CRITICAL: NEXT_PUBLIC_STAKING_CONTRACT_ADDRESS is missing in .env.local');
    console.error('   Add your deployed contract address to frontend/.env.local');
    console.error('   Example: NEXT_PUBLIC_STAKING_CONTRACT_ADDRESS=0x1234...');
}

export const StakingProvider = ({ children }) => {
    const { address, isConnected } = useAccount();
    const publicClient = usePublicClient();
    const [usdtAddress, setUsdtAddress] = useState(null);
    const [yourTokenAddress, setYourTokenAddress] = useState(null);
    const [isLoading, setIsLoading] = useState(false);

    // --- Write Hooks ---
    const { writeContractAsync: writeContract } = useWriteContract();

    // --- Read Contract Configs ---
    const contractConfig = {
        address: STAKING_CONTRACT_ADDRESS,
        abi: StakingArtifact.abi,
    };

    // 1. Get Token Addresses (USDT & YourToken)
    const { data: fetchedUsdtAddress } = useReadContract({
        ...contractConfig,
        functionName: 'usdt',
        query: {
            enabled: !!STAKING_CONTRACT_ADDRESS,
        },
    });

    const { data: fetchedYourTokenAddress } = useReadContract({
        ...contractConfig,
        functionName: 'yourToken',
        query: {
            enabled: !!STAKING_CONTRACT_ADDRESS,
        },
    });

    useEffect(() => {
        // Priority: Contract Read -> Env Var -> Hardcoded Fallback
        const envUsdt = "0x8bD91CC288b76591F60E370CA6ffdfeFFB2b1e93";

        if (fetchedUsdtAddress && fetchedUsdtAddress !== '0x0000000000000000000000000000000000000000') {
            setUsdtAddress(fetchedUsdtAddress);
        } else {
            setUsdtAddress(envUsdt);
        }

        if (fetchedYourTokenAddress && fetchedYourTokenAddress !== '0x0000000000000000000000000000000000000000') {
            setYourTokenAddress(fetchedYourTokenAddress);
        }
    }, [fetchedUsdtAddress, fetchedYourTokenAddress]);

    // 2. Fetch User Locks
    const {
        data: locks,
        refetch: refetchLocks,
        isLoading: isLocksLoading
    } = useReadContract({
        ...contractConfig,
        functionName: 'getLocks',
        args: [address],
        query: {
            enabled: !!address,
        },
    });

    // 3. Fetch Balances
    const { data: usdtBalance, refetch: refetchUsdtBalance } = useBalance({
        address: address,
        token: usdtAddress,
        query: {
            enabled: !!address && !!usdtAddress,
        }
    });

    const { data: tokenBalance, refetch: refetchTokenBalance } = useBalance({
        address: address,
        token: yourTokenAddress,
        query: {
            enabled: !!address && !!yourTokenAddress,
        }
    });

    // --- Actions ---

    // Helper to handle transaction wait
    const handleTransaction = async (hash, description) => {
        setIsLoading(true);
        try {
            console.log(`Waiting for ${description} transaction...`, hash);
            const receipt = await publicClient.waitForTransactionReceipt({ hash });
            console.log(`${description} confirmed!`, receipt);

            // Refresh data
            refetchLocks();
            refetchUsdtBalance();
            refetchTokenBalance();

            return receipt;
        } catch (error) {
            console.error(`${description} failed:`, error);
            throw error;
        } finally {
            setIsLoading(false);
        }
    };

    /**
     * Stake USDT to lock tokens.
     * Flow: Approve USDT -> BuyAndLock
     * @param {string} amountUSDT - Amount in readable format (e.g. "100")
     * @param {number} durationSeconds - Lock duration in seconds
     * @param {number} packageId - Package ID (0=Starter, 1=Pro, 2=Elite, 3=Custom)
     * @param {string} referrerAddress - Referrer address (optional)
     */
    const stake = useCallback(async (amountUSDT, durationSeconds, packageId, referrerAddress = "0x0000000000000000000000000000000000000000") => {
        if (!address || !usdtAddress) throw new Error("Wallet not connected or USDT address missing");

        try {
            setIsLoading(true);
            const amountUnsafe = parseUnits(amountUSDT, 6); // USDT usually has 6 decimals

            // 1. Approve USDT
            console.log("Approving USDT...");
            const approvalHash = await writeContract({
                address: usdtAddress,
                abi: erc20Abi,
                functionName: 'approve',
                args: [STAKING_CONTRACT_ADDRESS, amountUnsafe],
            });
            await handleTransaction(approvalHash, "USDT Approval");

            // 2. Buy and Lock
            console.log("Staking...");
            // Calculate minTokensOut (slippage). For now 0 (risky in prod, but ok for basic impl) or calculate based on price.
            // Setting 0 for simplicity as per request to "make it easier". 
            // In a real app, you'd fetch amountsOut from router.
            const minTokensOut = 0n;
            const deadline = BigInt(Math.floor(Date.now() / 1000) + 1200); // 20 mins

            const stakeHash = await writeContract({
                ...contractConfig,
                functionName: 'buyAndLock',
                args: [
                    amountUnsafe,
                    minTokensOut,
                    BigInt(durationSeconds),
                    packageId,
                    referrerAddress,
                    deadline
                ],
            });

            return await handleTransaction(stakeHash, "Stake");

        } catch (error) {
            console.error("Staking error:", error);
            setIsLoading(false);
            throw error;
        }
    }, [address, usdtAddress, writeContract, publicClient, contractConfig]);

    /**
     * Withdraw locked tokens after lock period expires.
     * @param {number} lockId - Index of the lock in user's lock array
     */
    const withdraw = useCallback(async (lockId) => {
        try {
            const hash = await writeContract({
                ...contractConfig,
                functionName: 'withdraw',
                args: [BigInt(lockId)],
            });
            return await handleTransaction(hash, "Withdraw");
        } catch (error) {
            console.error("Withdraw error:", error);
            throw error;
        }
    }, [writeContract, contractConfig, publicClient]);

    /**
     * Claim Rewards for a specific epoch
     * @param {number} epochId - Epoch ID
     * @param {string} amount - Amount to claim
     * @param {string[]} proof - Merkle Proof
     */
    const claim = useCallback(async (epochId, amount, proof) => {
        try {
            const hash = await writeContract({
                ...contractConfig,
                functionName: 'claim',
                args: [BigInt(epochId), BigInt(amount), proof],
            });
            return await handleTransaction(hash, "Claim Reward");
        } catch (error) {
            console.error("Claim error:", error);
            throw error;
        }
    }, [writeContract, contractConfig, publicClient]);

    const value = {
        // Data
        address,
        isConnected,
        locks,
        usdtBalance,
        tokenBalance,
        isLoading: isLoading || isLocksLoading,

        // Actions
        stake,
        withdraw,
        claim,
        refetchLocks,
    };

    return (
        <StakingContext.Provider value={value}>
            {children}
        </StakingContext.Provider>
    );
};
