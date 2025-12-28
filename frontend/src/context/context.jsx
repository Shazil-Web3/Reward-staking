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
import { parseUnits, formatUnits, erc20Abi, keccak256, toBytes } from 'viem';
import StakingArtifact from './staking.json';

const StakingContext = createContext();

export const useStaking = () => {
    const context = useContext(StakingContext);
    if (!context) {
        throw new Error('useStaking must be used within a StakingProvider');
    }
    return context;
};

// Contract Address from env - NEW CONTRACT!
const STAKING_CONTRACT_ADDRESS = "0xFEE07f54Bcff1CC6a96ce778434F0cC60D0010F7";

// Token Addresses
const CCT_TOKEN_ADDRESS = "0xB493dfB1449134586E59dD17425aC72ffb19Bf82";
const USDT_TOKEN_ADDRESS = "0x8bD91CC288b76591F60E370CA6ffdfeFFB2b1e93";

// Validation
if (!STAKING_CONTRACT_ADDRESS) {
    console.error('❌ CRITICAL: Staking contract address is missing');
}

export const StakingProvider = ({ children }) => {
    const { address, isConnected } = useAccount();
    const publicClient = usePublicClient();
    const [isLoading, setIsLoading] = useState(false);

    // --- Write Hooks ---
    const { writeContractAsync: writeContract } = useWriteContract();

    // --- Read Contract Configs ---
    const contractConfig = {
        address: STAKING_CONTRACT_ADDRESS,
        abi: StakingArtifact.abi,
    };

    // 1. Get CCT Token Address from contract
    const { data: cctAddress } = useReadContract({
        ...contractConfig,
        functionName: 'cctToken',
        query: {
            enabled: !!STAKING_CONTRACT_ADDRESS,
        },
    });

    // 2. Get Treasury Address
    const { data: treasuryAddress } = useReadContract({
        ...contractConfig,
        functionName: 'treasury',
        query: {
            enabled: !!STAKING_CONTRACT_ADDRESS,
        },
    });

    // 3. Get Min Deposit Amount
    const { data: minDeposit } = useReadContract({
        ...contractConfig,
        functionName: 'minDepositAmount',
        query: {
            enabled: !!STAKING_CONTRACT_ADDRESS,
        },
    });

    // 4. Fetch User Stakes
    const {
        data: stakes,
        refetch: refetchStakes,
        isLoading: isStakesLoading
    } = useReadContract({
        ...contractConfig,
        functionName: 'getUserStakes',
        args: [address],
        query: {
            enabled: !!address,
        },
    });

    // 5. Fetch Balances
    const { data: cctBalance, refetch: refetchCCTBalance } = useBalance({
        address: address,
        token: CCT_TOKEN_ADDRESS,
        query: {
            enabled: !!address,
        }
    });

    const { data: usdtBalance, refetch: refetchUSDTBalance } = useBalance({
        address: address,
        token: USDT_TOKEN_ADDRESS,
        query: {
            enabled: !!address,
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
            refetchStakes();
            refetchCCTBalance();
            refetchUSDTBalance();

            return receipt;
        } catch (error) {
            console.error(`${description} failed:`, error);
            throw error;
        } finally {
            setIsLoading(false);
        }
    };

    /**
     * Deposit CCT tokens with lock duration
     * @param {string} amountCCT - Amount in readable format (e.g. "100")
     * @param {number} lockDurationYears - Lock duration in years (1, 2, or 3)
     * @param {string} referralCode - Referral code (optional, empty string if none)
     */
    const deposit = useCallback(async (amountCCT, lockDurationYears, referralCode = "") => {
        if (!address) throw new Error("Wallet not connected");

        try {
            setIsLoading(true);
            const amount = parseUnits(amountCCT, 18); // CCT has 18 decimals

            // Convert years to seconds
            const lockDurationSeconds = lockDurationYears * 365 * 24 * 60 * 60;

            // Generate unique order ID
            const timestamp = Math.floor(Date.now() / 1000);
            const orderId = keccak256(toBytes(`${address}-${timestamp}-${Math.random()}`));

            // 1. Approve CCT
            console.log("Approving CCT...");
            const approvalHash = await writeContract({
                address: CCT_TOKEN_ADDRESS,
                abi: erc20Abi,
                functionName: 'approve',
                args: [STAKING_CONTRACT_ADDRESS, amount],
            });
            await handleTransaction(approvalHash, "CCT Approval");

            // 2. Deposit with lock duration
            console.log("Depositing CCT with", lockDurationYears, "year lock...");
            const depositHash = await writeContract({
                ...contractConfig,
                functionName: 'deposit',
                args: [orderId, amount, BigInt(lockDurationSeconds), referralCode],
            });

            const receipt = await handleTransaction(depositHash, "Deposit & Stake");

            // Return order details for tracking
            return {
                orderId,
                amount: amountCCT,
                lockDurationYears,
                referralCode,
                txHash: depositHash,
                receipt
            };

        } catch (error) {
            console.error("Deposit error:", error);
            setIsLoading(false);
            throw error;
        }
    }, [address, writeContract, publicClient, contractConfig]);

    /**
     * Withdraw unlocked stake by index
     * @param {number} index - Index of the stake in user's stake array
     */
    const withdraw = useCallback(async (index) => {
        try {
            const hash = await writeContract({
                ...contractConfig,
                functionName: 'withdraw',
                args: [BigInt(index)],
            });
            return await handleTransaction(hash, "Withdraw");
        } catch (error) {
            console.error("Withdraw error:", error);
            throw error;
        }
    }, [writeContract, contractConfig, publicClient]);

    /**
     * Admin function: Add stake for a user
     * @param {string} userAddress - User address
     * @param {string} amount - Amount in CCT
     * @param {number} lockDurationSeconds - Lock duration in seconds
     */
    const addStake = useCallback(async (userAddress, amount, lockDurationSeconds) => {
        try {
            const amountBN = parseUnits(amount, 18);
            const hash = await writeContract({
                ...contractConfig,
                functionName: 'addStake',
                args: [userAddress, amountBN, BigInt(lockDurationSeconds)],
            });
            return await handleTransaction(hash, "Add Stake");
        } catch (error) {
            console.error("Add stake error:", error);
            throw error;
        }
    }, [writeContract, contractConfig, publicClient]);

    /**
     * Admin function: Batch add stakes
     * @param {Array} users - Array of user addresses
     * @param {Array} amounts - Array of amounts (in CCT readable format)
     * @param {Array} lockDurations - Array of lock durations in seconds
     */
    const batchAddStakes = useCallback(async (users, amounts, lockDurations) => {
        try {
            const amountsBN = amounts.map(amt => parseUnits(amt, 18));
            const durationsBN = lockDurations.map(d => BigInt(d));

            const hash = await writeContract({
                ...contractConfig,
                functionName: 'batchAddStakes',
                args: [users, amountsBN, durationsBN],
            });
            return await handleTransaction(hash, "Batch Add Stakes");
        } catch (error) {
            console.error("Batch add stakes error:", error);
            throw error;
        }
    }, [writeContract, contractConfig, publicClient]);

    /**
     * Claim reward with Merkle proof
     * @param {number} epochId - Epoch ID
     * @param {string|number} amount - Amount in tokens (will be converted to Wei)
     * @param {Array} proof - Merkle proof as bytes32[]
     */
    const claimReward = useCallback(async (epochId, amount, proof) => {
        try {
            const amountBN = parseUnits(amount.toString(), 18);
            const hash = await writeContract({
                ...contractConfig,
                functionName: 'claimReward',
                args: [BigInt(epochId), BigInt(amount), proof],
            });
            return await handleTransaction(hash, "Claim Reward");
        } catch (error) {
            console.error("Claim reward error:", error);
            throw error;
        }
    }, [writeContract, contractConfig, publicClient]);

    /**
     * Claim VIP reward with Merkle proof
     * @param {number} epochId - Epoch ID
     * @param {string|number} amount - Amount in tokens (will be converted to Wei)
     * @param {Array} proof - Merkle proof as bytes32[]
     */
    const claimVIPReward = useCallback(async (epochId, amount, proof) => {
        try {
            const amountBN = parseUnits(amount.toString(), 18);
            const hash = await writeContract({
                ...contractConfig,
                functionName: 'claimVIPReward',
                args: [BigInt(epochId), BigInt(amount), proof],
            });
            return await handleTransaction(hash, "Claim VIP Reward");
        } catch (error) {
            console.error("Claim VIP reward error:", error);
            throw error;
        }
    }, [writeContract, contractConfig, publicClient]);

    /**
     * Admin function: Publish reward Merkle root
     * @param {string} merkleRoot - Merkle root as bytes32
     */
    const publishRewardRoot = useCallback(async (merkleRoot) => {
        try {
            const hash = await writeContract({
                ...contractConfig,
                functionName: 'publishRewardRoot',
                args: [merkleRoot],
            });
            return await handleTransaction(hash, "Publish Reward Root");
        } catch (error) {
            console.error("Publish reward root error:", error);
            throw error;
        }
    }, [writeContract, contractConfig, publicClient]);

    /**
     * Admin function: Publish VIP Merkle root
     * @param {string} merkleRoot - Merkle root as bytes32
     */
    const publishVIPRoot = useCallback(async (merkleRoot) => {
        try {
            const hash = await writeContract({
                ...contractConfig,
                functionName: 'publishVIPRoot',
                args: [merkleRoot],
            });
            return await handleTransaction(hash, "Publish VIP Root");
        } catch (error) {
            console.error("Publish VIP root error:", error);
            throw error;
        }
    }, [writeContract, contractConfig, publicClient]);

    const value = {
        // Data
        address,
        isConnected,
        stakes,
        cctBalance,
        usdtBalance,
        minDeposit,
        treasuryAddress,
        cctAddress: cctAddress || CCT_TOKEN_ADDRESS,
        usdtAddress: USDT_TOKEN_ADDRESS,
        isLoading: isLoading || isStakesLoading,

        // Actions
        deposit,
        withdraw,
        addStake,
        batchAddStakes,
        claimReward,
        claimVIPReward,
        publishRewardRoot,
        publishVIPRoot,
        refetchStakes,
    };

    return (
        <StakingContext.Provider value={value}>
            {children}
        </StakingContext.Provider>
    );
};
