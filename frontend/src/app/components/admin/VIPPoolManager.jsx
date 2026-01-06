'use client';

import { Card } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { useState, useEffect } from 'react';
import { Crown, AlertCircle, Loader2, CheckCircle, RefreshCw, Users, ArrowRight, Coins } from 'lucide-react';
import { useWriteContract, usePublicClient, useReadContract } from 'wagmi';
import { parseUnits, erc20Abi } from 'viem';
import StakingArtifact from '@/context/staking.json';
import { CCT_DECIMALS } from '@/config/constants';

const BACKEND_API_URL = process.env.NEXT_PUBLIC_BACKEND_API_URL || 'http://localhost:3001';
const STAKING_CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_STAKING_CONTRACT_ADDRESS;
const DEFAULT_CCT_ADDRESS = process.env.NEXT_PUBLIC_CCT_TOKEN_ADDRESS;

const VIPPoolManager = () => {
    const { writeContractAsync } = useWriteContract();
    const publicClient = usePublicClient();

    const [vipEligibleCount, setVipEligibleCount] = useState(0);
    const [distributeAmount, setDistributeAmount] = useState('');

    const [isDistributing, setIsDistributing] = useState(false);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [status, setStatus] = useState('');

    const { data: contractCctAddress } = useReadContract({
        address: STAKING_CONTRACT_ADDRESS,
        abi: StakingArtifact.abi,
        functionName: 'cctToken',
    });
    const cctTokenAddress = contractCctAddress || DEFAULT_CCT_ADDRESS;

    const { data: tokenDecimals } = useReadContract({
        address: cctTokenAddress,
        abi: erc20Abi,
        functionName: 'decimals',
        query: { enabled: !!cctTokenAddress }
    });
    const decimals = tokenDecimals || CCT_DECIMALS;


    const fetchVipEligibleUsers = async () => {
        try {
            setLoading(true);
            const res = await fetch(`${BACKEND_API_URL}/api/admin/vip/eligible-count`);
            if (!res.ok) throw new Error('Failed to fetch VIP eligible users');
            const data = await res.json();
            setVipEligibleCount(data.eligibleCount);
        } catch (err) {
            console.error("VIP eligible users fetch error:", err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchVipEligibleUsers();
    }, []);

    // Distribute VIP Rewards
    const handleDistributeVipRewards = async () => {
        if (!distributeAmount || parseFloat(distributeAmount) <= 0) {
            setError('Enter a valid amount to distribute');
            return;
        }

        try {
            setIsDistributing(true);
            setError('');
            setStatus('Calculating VIP eligible users via Merkle Tree...');

            const amountInWei = parseUnits(distributeAmount, decimals).toString();

            const response = await fetch(`${BACKEND_API_URL}/api/admin/generate-vip-epoch`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ totalAmount: amountInWei })
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || 'VIP epoch generation failed');
            }

            setStatus(`VIP Merkle Root generated. Publishing to blockchain...`);

            const txHash = await writeContractAsync({
                address: STAKING_CONTRACT_ADDRESS,
                abi: StakingArtifact.abi,
                functionName: 'publishVIPRoot',
                args: [result.merkleRoot]
            });

            setStatus(`VIP root published! Hash: ${txHash.slice(0, 10)}...`);
            await publicClient.waitForTransactionReceipt({ hash: txHash });

            setStatus('VIP Rewards distributed successfully! Users can now claim.');
            setDistributeAmount('');
            setTimeout(() => setStatus(''), 5000);

        } catch (err) {
            console.error('VIP distribution error:', err);
            setError(err.message || 'Failed to distribute VIP rewards');
        } finally {
            setIsDistributing(false);
        }
    };

    return (
        <Card className="col-span-3 p-6 h-fit bg-gradient-to-b from-purple-50/50 to-pink-50/30">
            <div className="mb-6 flex justify-between items-start">
                <div>
                    <h3 className="font-bold text-2xl flex items-center gap-2 text-gray-900">
                        <Crown className="h-6 w-6 text-purple-600" />
                        VIP Pool Management
                    </h3>
                    <p className="text-muted-foreground mt-1">Manage VIP reward distributions (100+ referrals)</p>
                </div>
                <div className="flex flex-col items-end gap-1">
                    <Button variant="ghost" size="sm" onClick={fetchVipEligibleUsers} className="gap-2">
                        <RefreshCw className="h-4 w-4" /> Refresh
                    </Button>
                </div>
            </div>

            {/* VIP Eligible Users Count */}
            <div className="p-6 bg-white rounded-xl border border-purple-100 shadow-sm space-y-2 mb-6 text-center">
                <p className="text-sm font-medium text-purple-700">VIP Eligible Users</p>
                <div className="text-4xl font-bold text-purple-600">
                    {loading ? (
                        <Loader2 className="h-10 w-10 animate-spin text-purple-400 mx-auto" />
                    ) : (
                        <>
                            {vipEligibleCount} <span className="text-lg text-muted-foreground font-normal">Users</span>
                        </>
                    )}
                </div>
            </div>

            {/* Distribute VIP Rewards */}
            <div className="space-y-3 pt-4 border-t">
                <h4 className="font-semibold flex items-center gap-2">
                    <Crown className="h-5 w-5 text-purple-600" />
                    Distribute VIP Rewards
                </h4>
                <div className="flex gap-3">
                    <div className="relative flex-1">
                        <input
                            type="number"
                            value={distributeAmount}
                            onChange={(e) => setDistributeAmount(e.target.value)}
                            placeholder="Amount to distribute (e.g. 1000)"
                            className="w-full h-11 rounded-md border border-input bg-background px-3 py-2 pl-10 text-sm"
                        />
                        <Coins className="absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" />
                    </div>
                    <Button
                        className="w-48 bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:from-purple-700 hover:to-pink-700"
                        onClick={handleDistributeVipRewards}
                        disabled={isDistributing}
                    >
                        {isDistributing ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Processing...
                            </>
                        ) : (
                            <>
                                Distribute VIP
                                <ArrowRight className="ml-2 h-4 w-4" />
                            </>
                        )}
                    </Button>
                </div>
            </div>

            {/* Status Messages */}
            {error && (
                <div className="mt-4 bg-red-50 border border-red-200 rounded-md p-3 flex gap-2 items-start">
                    <AlertCircle className="h-4 w-4 text-red-600 mt-0.5" />
                    <p className="text-sm text-red-700 font-medium">{error}</p>
                </div>
            )}

            {status && (
                <div className="mt-4 bg-purple-50 border border-purple-200 rounded-md p-3 flex gap-2 items-start">
                    {status.includes('successfully') ? (
                        <CheckCircle className="h-4 w-4 text-green-600 mt-0.5" />
                    ) : (
                        <Loader2 className="h-4 w-4 text-purple-600 mt-0.5 animate-spin" />
                    )}
                    <p className="text-sm text-purple-700 font-medium">{status}</p>
                </div>
            )}
        </Card>
    );
};

export default VIPPoolManager;
