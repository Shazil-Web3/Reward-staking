'use client';

import { Card } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { useState, useEffect } from 'react';
import { Coins, Wallet, AlertCircle, Loader2, CheckCircle, ArrowRight, RefreshCw, DollarSign } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAccount, useWriteContract, usePublicClient } from 'wagmi';
import { parseEther, formatUnits, parseUnits } from 'viem';
import StakingArtifact from '@/context/staking.json';

const BACKEND_API_URL = process.env.NEXT_PUBLIC_BACKEND_API_URL || 'http://localhost:3001';
const STAKING_CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_STAKING_CONTRACT_ADDRESS;

const PoolManager = () => {
    const { address } = useAccount();
    const { writeContractAsync } = useWriteContract();
    const publicClient = usePublicClient();

    // UI States
    const [fundAmount, setFundAmount] = useState('');
    const [distributeAmount, setDistributeAmount] = useState('');
    const [isFunding, setIsFunding] = useState(false);
    const [isConverting, setIsConverting] = useState(false);
    const [isDistributing, setIsDistributing] = useState(false);
    const [status, setStatus] = useState('');
    const [error, setError] = useState('');

    // --- Contract Reads ---

    // State for Data
    const [accruedFees, setAccruedFees] = useState(0n);
    const [poolBalance, setPoolBalance] = useState(0n);
    const [rewardTokenAddress, setRewardTokenAddress] = useState(null);

    const fetchPoolStats = async () => {
        try {
            const res = await fetch(`${BACKEND_API_URL}/api/admin/pool-stats`);
            if (!res.ok) throw new Error('Failed to fetch pool stats');
            const data = await res.json();

            setAccruedFees(BigInt(data.fees));
            setPoolBalance(BigInt(data.poolBalance));
            setRewardTokenAddress(data.tokenAddress);
        } catch (err) {
            console.error("Stats fetch error:", err);
            // Optionally set error State to show in UI
            if (err.message) setError(err.message);
        }
    };

    useEffect(() => {
        fetchPoolStats();
    }, []);

    const refreshData = () => {
        fetchPoolStats();
    };

    // --- Actions ---

    // A. Convert Accrued Fees to Rewards
    const handleConvertFees = async () => {
        if (!accruedFees || accruedFees === 0n) {
            setError('No fees to convert.');
            return;
        }

        try {
            setIsConverting(true);
            setError('');
            setStatus('Converting accrued USDT fees into Reward Tokens...');

            const txHash = await writeContractAsync({
                address: STAKING_CONTRACT_ADDRESS,
                abi: StakingArtifact.abi,
                functionName: 'convertFeesToPayout',
                args: [0n, BigInt(Math.floor(Date.now() / 1000) + 1200)] // minOut 0 (admin only), 20m deadline
            });

            setStatus(`Conversion submitted! Hash: ${txHash.slice(0, 10)}...`);
            await publicClient.waitForTransactionReceipt({ hash: txHash });

            setStatus('Fees converted successfully! Reward pool updated.');
            refreshData();
            setTimeout(() => setStatus(''), 5000);

        } catch (err) {
            console.error('Conversion error:', err);
            setError(err.message || 'Failed to convert fees');
        } finally {
            setIsConverting(false);
        }
    };

    // B. Distribute Rewards (Generate Epoch)
    const handleDistributeRewards = async () => {
        if (!distributeAmount || parseFloat(distributeAmount) <= 0) {
            setError('Enter a valid amount to distribute');
            return;
        }

        try {
            setIsDistributing(true);
            setError('');
            setStatus('Calculating eligible users via Merkle Tree...');

            const amountInWei = parseEther(distributeAmount).toString();

            // 1. Backend Calculation
            const response = await fetch(`${BACKEND_API_URL}/api/admin/generate-epoch`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ totalAmount: amountInWei })
            });

            // Get the response body first
            const result = await response.json();

            // Check if request failed and show actual error
            if (!response.ok) {
                const errorMessage = result.error || 'Backend generation failed';
                throw new Error(errorMessage);
            }

            setStatus(`Merkle Root generated. Publishing to blockchain...`);

            console.log('📤 Publishing Merkle root to contract:', {
                merkleRoot: result.merkleRoot,
                amount: amountInWei
            });

            // 2. Publish Merkle root to contract
            const txHash = await writeContractAsync({
                address: STAKING_CONTRACT_ADDRESS,
                abi: StakingArtifact.abi,
                functionName: 'publishRewardRoot',
                args: [result.merkleRoot]
            });

            console.log('✅ Transaction hash:', txHash);
            setStatus(`Reward root published! Hash: ${txHash.slice(0, 10)}...`);
            await publicClient.waitForTransactionReceipt({ hash: txHash });

            console.log('✅ Transaction confirmed!');
            setStatus('Rewards distributed successfully! Users can now claim.');
            setDistributeAmount('');
            refreshData();
            setTimeout(() => setStatus(''), 5000);

        } catch (err) {
            console.error('Distribution error:', err);
            setError(err.message || 'Failed to distribute rewards');
        } finally {
            setIsDistributing(false);
        }
    };

    // C. Fund Pool (Add External Tokens)
    const handleFundPool = async () => {
        if (!fundAmount || parseFloat(fundAmount) <= 0) {
            setError('Enter a valid amount to fund');
            return;
        }

        try {
            setIsFunding(true);
            setError('');
            setStatus('Approving tokens...');

            const amountInWei = parseEther(fundAmount);

            // 1. Approve
            const approvalHash = await writeContractAsync({
                address: rewardTokenAddress,
                abi: [{ // Standard ERC20 Approve
                    name: 'approve',
                    type: 'function',
                    inputs: [{ name: 'spender', type: 'address' }, { name: 'amount', type: 'uint256' }],
                    outputs: [{ name: '', type: 'bool' }]
                }],
                functionName: 'approve',
                args: [STAKING_CONTRACT_ADDRESS, amountInWei]
            });
            await publicClient.waitForTransactionReceipt({ hash: approvalHash });

            // 2. Fund
            setStatus('Funding pool...');
            const txHash = await writeContractAsync({
                address: STAKING_CONTRACT_ADDRESS,
                abi: StakingArtifact.abi,
                functionName: 'fundRewardTokens',
                args: [rewardTokenAddress, amountInWei]
            });

            setStatus(`Funding submitted! Hash: ${txHash.slice(0, 10)}...`);
            await publicClient.waitForTransactionReceipt({ hash: txHash });

            setStatus('Pool funded successfully!');
            setFundAmount('');
            refreshData();
            setTimeout(() => setStatus(''), 5000);

        } catch (err) {
            console.error('Funding error:', err);
            setError(err.message || 'Failed to fund pool');
        } finally {
            setIsFunding(false);
        }
    };

    return (
        <Card className="col-span-3 p-6 h-fit bg-gradient-to-b from-white to-gray-50/50">
            <div className="mb-8 flex justify-between items-start">
                <div>
                    <h3 className="font-bold text-2xl flex items-center gap-2 text-gray-900">
                        <Wallet className="h-6 w-6 text-primary" />
                        Pool Management
                    </h3>
                    <p className="text-muted-foreground mt-1">Manage platform fees and reward distributions</p>
                </div>
                <Button variant="ghost" size="sm" onClick={refreshData} className="gap-2">
                    <RefreshCw className="h-4 w-4" /> Refresh
                </Button>
            </div>

            {/* --- Stats Grid --- */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                {/* Available Reward Pool */}
                <div className="p-5 bg-white rounded-xl border border-gray-100 shadow-sm space-y-2">
                    <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                        <Coins className="h-4 w-4" />
                        Available Reward Funds
                    </div>
                    <div className="text-3xl font-bold text-primary">
                        {poolBalance ? formatUnits(poolBalance, 18) : '0'} <span className="text-lg text-muted-foreground font-normal">TOKENS</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                        Ready to be distributed to users
                    </p>
                </div>

                {/* Accrued Fees (Escrow) */}
                <div className="p-5 bg-white rounded-xl border border-gray-100 shadow-sm space-y-3">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                            <DollarSign className="h-4 w-4" />
                            Accrued Fees (Escrow)
                        </div>
                        {Number(accruedFees || 0) > 0 && (
                            <span className="flex h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                        )}
                    </div>

                    <div className="text-3xl font-bold text-gray-900">
                        {accruedFees ? formatUnits(accruedFees, 6) : '0'} <span className="text-lg text-muted-foreground font-normal">USDT</span>
                    </div>

                    <Button
                        size="sm"
                        variant="secondary"
                        className="w-full text-xs h-8"
                        onClick={handleConvertFees}
                        disabled={!accruedFees || accruedFees === 0n || isConverting}
                    >
                        {isConverting ? (
                            <Loader2 className="h-3 w-3 animate-spin mr-1" />
                        ) : (
                            <RefreshCw className="h-3 w-3 mr-1" />
                        )}
                        Convert Fees to Rewards
                    </Button>
                </div>
            </div>

            {/* --- Action Sections --- */}
            <div className="space-y-8">

                {/* 1. Distribute Rewards (Previously Generate Epoch) */}
                <div className="space-y-4 pt-4 border-t">
                    <h4 className="font-semibold flex items-center gap-2">
                        <Users className="h-5 w-5 text-blue-600" />
                        Distribute Rewards
                    </h4>
                    <p className="text-sm text-muted-foreground">
                        Calculate eligible stakers (based on package/referrals) and distribute rewards for this epoch.
                    </p>

                    <div className="flex gap-3">
                        <div className="relative flex-1">
                            <input
                                type="number"
                                value={distributeAmount}
                                onChange={(e) => setDistributeAmount(e.target.value)}
                                placeholder="Amount to distribute (e.g. 1000)"
                                className="w-full h-11 rounded-md border border-input bg-background px-3 py-2 pl-10 text-sm focus-visible:ring-2 focus-visible:ring-primary"
                            />
                            <Coins className="absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" />
                        </div>
                        <Button
                            className="w-48 gradient-primary text-white"
                            onClick={handleDistributeRewards}
                            disabled={isDistributing || isFunding}
                        >
                            {isDistributing ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Processing...
                                </>
                            ) : (
                                <>
                                    Distribute Now
                                    <ArrowRight className="ml-2 h-4 w-4" />
                                </>
                            )}
                        </Button>
                    </div>
                </div>

                {/* 2. Fund Pool Manually */}
                <div className="space-y-4 pt-4 border-t">
                    <h4 className="font-semibold flex items-center gap-2">
                        <Wallet className="h-5 w-5 text-green-600" />
                        Inject External Funds
                    </h4>
                    <p className="text-sm text-muted-foreground">
                        Add tokens from your admin wallet directly into the reward pool.
                    </p>

                    <div className="flex gap-3">
                        <div className="relative flex-1">
                            <input
                                type="number"
                                value={fundAmount}
                                onChange={(e) => setFundAmount(e.target.value)}
                                placeholder="Amount to add (e.g. 5000)"
                                className="w-full h-11 rounded-md border border-input bg-background px-3 py-2 pl-10 text-sm focus-visible:ring-2 focus-visible:ring-primary"
                            />
                            <Coins className="absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" />
                        </div>
                        <Button
                            variant="outline"
                            className="w-48"
                            onClick={handleFundPool}
                            disabled={isFunding || isDistributing}
                        >
                            {isFunding ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Funding...
                                </>
                            ) : (
                                'Fund Pool'
                            )}
                        </Button>
                    </div>
                </div>

                {/* Status Messages */}
                {error && (
                    <div className="bg-red-50 border border-red-200 rounded-md p-3 flex gap-2 items-start animate-in fade-in slide-in-from-top-2">
                        <AlertCircle className="h-4 w-4 text-red-600 mt-0.5" />
                        <p className="text-sm text-red-700 font-medium">{error}</p>
                    </div>
                )}

                {status && (
                    <div className="bg-blue-50 border border-blue-200 rounded-md p-3 flex gap-2 items-start animate-in fade-in slide-in-from-top-2">
                        {status.includes('successfully') ? (
                            <CheckCircle className="h-4 w-4 text-green-600 mt-0.5" />
                        ) : (
                            <Loader2 className="h-4 w-4 text-blue-600 mt-0.5 animate-spin" />
                        )}
                        <p className="text-sm text-blue-700 font-medium">{status}</p>
                    </div>
                )}
            </div>
        </Card>
    );
};

// Icon component since Lucide might not export 'Users' directly in all versions or just to be safe
const Users = ({ className }) => (
    <svg
        xmlns="http://www.w3.org/2000/svg"
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={className}
    >
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
);

export default PoolManager;
