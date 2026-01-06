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
import { CCT_DECIMALS, USDT_DECIMALS } from '@/config/constants';

const StakingContext = createContext();

export const useStaking = () => {
    const context = useContext(StakingContext);
    if (!context) {
        throw new Error('useStaking must be used within a StakingProvider');
    }
    return context;
};

// Contract Address from env - NEW CONTRACT!
const STAKING_CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_STAKING_CONTRACT_ADDRESS;

// Token Addresses
const CCT_TOKEN_ADDRESS = process.env.NEXT_PUBLIC_CCT_TOKEN_ADDRESS;
const USDT_TOKEN_ADDRESS = process.env.NEXT_PUBLIC_USDT_TOKEN_ADDRESS;

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

    // 3b. Verify Contract's USDT Address
    const { data: contractUsdtAddress } = useReadContract({
        ...contractConfig,
        functionName: 'usdt',
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

    // 6. Fetch USDT Decimals
    const { data: usdtDecimals } = useReadContract({
        address: USDT_TOKEN_ADDRESS,
        abi: erc20Abi,
        functionName: 'decimals',
        query: {
            enabled: !!USDT_TOKEN_ADDRESS,
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
    /**
     * Deposit CCT tokens with lock duration
     * @param {string} amountCCT - Amount in readable format (e.g. "100")
     * @param {number} lockDurationYears - Lock duration in years (1, 2, or 3)
     * @param {string} referralCode - Referral code (optional, empty string if none)
     */
    const deposit = useCallback(async (stakingAmountUSD, cctAmountConverted, lockDurationYears, referralCode = "") => {
        if (!address) throw new Error("Wallet not connected");
        let step = "INIT";

        try {
            setIsLoading(true);

            console.log("🔍 DEBUG - Deposit Started. Inputs:", { stakingAmountUSD, cctAmountConverted, lockDurationYears });

            // Use centralized decimals (Mock USDT on Sepolia uses 6, standard USDT uses 6)
            // Defaulting to 18 caused massive overflow/revert.
            const decimals = USDT_DECIMALS;
            console.log(`Using USDT Decimals: ${decimals}`);

            // Convert USD amount to USDT
            const usdtAmount = parseUnits(stakingAmountUSD.toString(), decimals);

            // --- VALIDATION CHECKS ---

            // Check 1: Minimum Deposit
            if (minDeposit) {
                // minDeposit is BigInt.
                if (usdtAmount < minDeposit) {
                    const minReadable = formatUnits(minDeposit, decimals);
                    throw new Error(`Deposit amount (${stakingAmountUSD}) is below minimum (${minReadable} USDT)`);
                }
            }

            // Check 2: USDT Address Mismatch
            if (contractUsdtAddress) {
                if (contractUsdtAddress.toLowerCase() !== USDT_TOKEN_ADDRESS.toLowerCase()) {
                    console.error("MISMATCH: Contract expects", contractUsdtAddress, "but using", USDT_TOKEN_ADDRESS);
                    throw new Error("Critical Configuration Mismatch: Frontend USDT address does not match Staking Contract's USDT address. Please report this.");
                }
            }

            // --- END CHECKS ---

            console.log("🔍 DEBUG - Converted amounts:", {
                usdtAmount: usdtAmount.toString(),
                minDeposit: minDeposit ? minDeposit.toString() : "Loading..."
            });

            step = "PARSING_AMOUNTS";
            // cctAmountConverted is a decimal string like "5000.0"
            // First ensure it's a clean decimal number, then convert to Wei
            const cctDecimal = parseFloat(cctAmountConverted);
            if (isNaN(cctDecimal) || cctDecimal <= 0) {
                throw new Error(`Invalid CCT amount: ${cctAmountConverted}`);
            }

            // Calculate Net Amount (Deduct 10% Fee)
            const cctDecimalNet = cctDecimal * 0.9; // 10% Fee deduction
            console.log(`💰 Fee Calculation: Gross=${cctDecimal} CCT, Fee=10%, Net=${cctDecimalNet} CCT`);

            // Fetch CCT Decimals dynamically to prevent precision mismatch
            let cctDecimals = CCT_DECIMALS; // Default from config
            try {
                const fetchedDecimals = await publicClient.readContract({
                    address: CCT_TOKEN_ADDRESS,
                    abi: erc20Abi,
                    functionName: 'decimals'
                });
                cctDecimals = Number(fetchedDecimals);
                console.log(`✅ Fetched CCT Decimals: ${cctDecimals}`);
            } catch (err) {
                console.warn("⚠️ Failed to fetch CCT decimals, defaulting to 18:", err);
            }

            // Use Net Amount for the stake
            const cctAmount = parseUnits(cctDecimalNet.toFixed(cctDecimals), cctDecimals);

            console.log("🔍 DEBUG - CCT Amount (Net):", {
                readableGross: cctDecimal,
                readableNet: cctDecimalNet,
                decimals: cctDecimals,
                rawNet: cctAmount.toString()
            });

            // Convert years to seconds
            // TESTING: Using 60 seconds (1 minute) instead of years
            const lockDurationSeconds = 60; // lockDurationYears * 365 * 24 * 60 * 60;

            // Generate unique order ID
            const timestamp = Math.floor(Date.now() / 1000);
            const orderId = keccak256(toBytes(`${address}-${timestamp}-${Math.random()}`));

            // --- VALIDATION: Check Contract Configuration ---
            // Verify that the Staking Contract is actually using the USDT token we think it is.
            // If user deployed StakingHub with a different USDT address, transferFrom will fail.
            try {
                const contractUsdt = await publicClient.readContract({
                    address: STAKING_CONTRACT_ADDRESS,
                    abi: StakingArtifact.abi,
                    functionName: 'usdt'
                });

                if (contractUsdt.toLowerCase() !== USDT_TOKEN_ADDRESS.toLowerCase()) {
                    throw new Error(`CONFIGURATION MISMATCH: Contract expects USDT at ${contractUsdt}, but frontend using ${USDT_TOKEN_ADDRESS}. update context.jsx!`);
                }
                console.log("✅ Contract Config Verified: USDT Setup is correct.");
            } catch (err) {
                console.error("Config Check Failed:", err);
                // Don't block if read fails (e.g. ABI issue), but warn
            }

            // 1. Approve USDT (user deposits USDT, not CCT!)
            step = "APPROVE_USDT";
            console.log(`[${step}] Approving USDT...`, stakingAmountUSD, "USD");

            const approvalHash = await writeContract({
                address: USDT_TOKEN_ADDRESS,
                abi: erc20Abi,
                functionName: 'approve',
                args: [STAKING_CONTRACT_ADDRESS, usdtAmount],
            });

            step = "WAIT_APPROVAL_RECEIPT";
            console.log(`[${step}] Waiting for approval transaction...`, approvalHash);
            await handleTransaction(approvalHash, "USDT Approval");

            // 2. Deposit USDT to contract (USDT goes to treasury, CCT stake created)
            step = "DEPOSIT_TRANSACTION";
            console.log(`[${step}] Depositing`, stakingAmountUSD, "USDT for", cctAmountConverted, "CCT stake with", lockDurationYears, "year lock...");

            const depositHash = await writeContract({
                ...contractConfig,
                functionName: 'depositUSDT',
                args: [
                    orderId,                    // bytes32 orderId
                    usdtAmount,                 // uint256 usdtAmount (USDT user is depositing)
                    cctAmount,                  // uint256 cctAmount (CCT they'll get later)
                    BigInt(lockDurationSeconds), // uint256 lockDurationSeconds
                    referralCode                // string referralCode
                ],
                gas: 500000n, // Set reasonable gas limit for Sepolia
            });

            step = "WAIT_DEPOSIT_RECEIPT";
            console.log(`[${step}] Waiting for deposit transaction...`, depositHash);
            const receipt = await handleTransaction(depositHash, "Deposit & Stake");

            // Return order details for tracking
            return {
                orderId,
                amount: stakingAmountUSD,
                cctAmount: cctAmountConverted,
                lockDurationYears,
                referralCode,
                txHash: depositHash,
                receipt
            };

        } catch (error) {
            console.error(`Deposit error at step [${step}]:`, error);
            console.error("Full Error Object:", JSON.stringify(error, (key, value) =>
                typeof value === 'bigint' ? value.toString() : value // Handle BigInt serialization
                , 2));

            // Temporary alert for debugging on frontend
            alert(`Transaction Failed at step: ${step}\n\nReason: ${error.details || error.shortMessage || error.message}`);

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
            console.log("🔍 Attempting withdrawal for stake index:", index);

            // Get stake details before attempting withdrawal
            if (stakes && stakes[index]) {
                const stake = stakes[index];
                console.log("Stake details:", {
                    cctAmount: stake.cctAmount?.toString(),
                    unlockTime: stake.unlockTime?.toString(),
                    unlockDate: new Date(Number(stake.unlockTime) * 1000),
                    withdrawn: stake.withdrawn,
                    currentTime: new Date(),
                    currentTimestamp: Math.floor(Date.now() / 1000)
                });

                // Get current block timestamp from blockchain
                const block = await publicClient.getBlock();
                const blockTimestamp = Number(block.timestamp);
                const unlockTimestamp = Number(stake.unlockTime);

                // Check if amount is suspiciously large (Decimal Mismatch Detection)
                if (stake.cctAmount && stake.cctAmount.toString().length > 24) {
                    console.warn("⚠️ WARNING: Stake amount seems extremely large! This might be due to a decimal mismatch (18 vs 6 decimals) during deposit.");
                }

                console.log("⏰ Timestamp Check:", {
                    blockTimestamp,
                    unlockTimestamp,
                    difference: unlockTimestamp - blockTimestamp,
                    isUnlocked: blockTimestamp >= unlockTimestamp
                });

                // Pre-check if stake is unlocked on-chain
                if (blockTimestamp < unlockTimestamp) {
                    const remainingSeconds = unlockTimestamp - blockTimestamp;
                    const remainingMinutes = Math.ceil(remainingSeconds / 60);
                    throw new Error(
                        `Stake is still locked. Please wait ${remainingMinutes} more minute(s). ` +
                        `Unlock time: ${new Date(unlockTimestamp * 1000).toLocaleString()}`
                    );
                }

                // Check if already withdrawn
                if (stake.withdrawn) {
                    throw new Error("This stake has already been withdrawn");
                }
            }


            const hash = await writeContract({
                ...contractConfig,
                functionName: 'withdraw',
                args: [BigInt(index)],
                gas: 300000n, // Set reasonable gas limit to prevent estimation errors
            });
            return await handleTransaction(hash, "Withdraw");
        } catch (error) {
            console.error("❌ Withdraw error:", error);

            // Extract revert reason if available
            const revertReason = error?.reason || error?.message || "Unknown error";
            console.error("Revert reason:", revertReason);

            // Show user-friendly error
            if (revertReason.includes("Already withdrawn")) {
                throw new Error("This stake has already been withdrawn");
            } else if (revertReason.includes("Still locked")) {
                throw new Error("This stake is still locked. Please wait until the unlock time.");
            } else if (revertReason.includes("Insufficient CCT")) {
                throw new Error("Contract has insufficient CCT tokens. Please contact support.");
            } else if (revertReason.includes("Invalid index")) {
                throw new Error("Invalid stake index");
            }

            throw error;
        }
    }, [writeContract, contractConfig, publicClient, stakes]);

    /**
     * Admin function: Add stake for a user
     * @param {string} userAddress - User address
     * @param {string} amount - Amount in CCT
     * @param {number} lockDurationSeconds - Lock duration in seconds
     */
    const addStake = useCallback(async (userAddress, amount, lockDurationSeconds) => {
        try {
            const amountBN = parseUnits(amount, CCT_DECIMALS);
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
            const amountsBN = amounts.map(amt => parseUnits(amt, CCT_DECIMALS));
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
            const amountBN = parseUnits(amount.toString(), CCT_DECIMALS);
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
            const amountBN = parseUnits(amount.toString(), CCT_DECIMALS);
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
