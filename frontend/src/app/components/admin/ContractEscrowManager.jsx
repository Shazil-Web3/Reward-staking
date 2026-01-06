'use client';

import { Card } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { useState } from 'react';
import { Wallet, Loader2, CheckCircle, AlertCircle, Coins } from 'lucide-react';
import { useAccount, useWriteContract, usePublicClient, useReadContract } from 'wagmi';
import { parseUnits, erc20Abi } from 'viem';
import StakingArtifact from '@/context/staking.json';

const STAKING_CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_STAKING_CONTRACT_ADDRESS;
const DEFAULT_CCT_ADDRESS = process.env.NEXT_PUBLIC_CCT_TOKEN_ADDRESS || "0x4B4C80667cd1C40BFD2382126809C1890a08eBD4";

const ContractEscrowManager = () => {
    const { address } = useAccount();
    const { writeContractAsync } = useWriteContract();
    const publicClient = usePublicClient();

    const [fundAmount, setFundAmount] = useState('');
    const [isFunding, setIsFunding] = useState(false);
    const [isApproving, setIsApproving] = useState(false);
    const [error, setError] = useState('');
    const [status, setStatus] = useState('');

    // 1. Fetch CCT Token Address
    const { data: contractCctAddress } = useReadContract({
        address: STAKING_CONTRACT_ADDRESS,
        abi: StakingArtifact.abi,
        functionName: 'cctToken',
    });
    const cctTokenAddress = contractCctAddress || DEFAULT_CCT_ADDRESS;

    // 2. Fetch Decimals
    const { data: tokenDecimals } = useReadContract({
        address: cctTokenAddress,
        abi: erc20Abi,
        functionName: 'decimals',
        query: { enabled: !!cctTokenAddress }
    });
    const decimals = tokenDecimals || 18;

    // 3. Check Allowance
    const { data: currentAllowance, refetch: refetchAllowance } = useReadContract({
        address: cctTokenAddress,
        abi: erc20Abi,
        functionName: 'allowance',
        args: [address, STAKING_CONTRACT_ADDRESS],
        query: { enabled: !!address && !!cctTokenAddress }
    });

    // 4. Check User Balance
    const { data: userBalance } = useReadContract({
        address: cctTokenAddress,
        abi: erc20Abi,
        functionName: 'balanceOf',
        args: [address],
        query: { enabled: !!address && !!cctTokenAddress }
    });

    // Approve
    const handleApprove = async () => {
        try {
            setIsApproving(true);
            setStatus('Approving CCT tokens...');
            const txHash = await writeContractAsync({
                address: cctTokenAddress,
                abi: erc20Abi,
                functionName: 'approve',
                args: [STAKING_CONTRACT_ADDRESS, parseUnits('1000000000', decimals)],
            });
            await publicClient.waitForTransactionReceipt({ hash: txHash });
            setStatus('Approval successful! You can now fund.');
            refetchAllowance();
            setTimeout(() => setStatus(''), 3000);
        } catch (err) {
            console.error('Approval Error:', err);
            setError('Approval failed');
        } finally {
            setIsApproving(false);
        }
    };

    // Fund
    const handleFundPool = async () => {
        if (!fundAmount || parseFloat(fundAmount) <= 0) {
            setError('Enter a valid amount');
            return;
        }

        const amountInWei = parseUnits(fundAmount, decimals);

        if (userBalance !== undefined && userBalance < amountInWei) {
            setError(`Insufficient User Balance.`);
            return;
        }

        if (!currentAllowance || currentAllowance < amountInWei) {
            setError('Insufficient allowance. Please Approve first.');
            return;
        }

        try {
            setIsFunding(true);
            setError('');
            setStatus('Injecting tokens to contract...');

            const txHash = await writeContractAsync({
                address: STAKING_CONTRACT_ADDRESS,
                abi: StakingArtifact.abi,
                functionName: 'fundContract',
                args: [amountInWei]
            });

            setStatus(`Funding submitted! Hash: ${txHash.slice(0, 10)}...`);
            await publicClient.waitForTransactionReceipt({ hash: txHash });

            setStatus('Contract escrow funded successfully!');
            setFundAmount('');
            setTimeout(() => setStatus(''), 5000);

        } catch (err) {
            console.error('Funding error:', err);
            setError(err.message || 'Failed to fund contract');
        } finally {
            setIsFunding(false);
        }
    };

    const needsApproval = fundAmount && currentAllowance !== undefined && currentAllowance < parseUnits(fundAmount, decimals);

    return (
        <Card className="p-6 bg-gradient-to-r from-gray-50 to-white border-l-4 border-l-green-500 shadow-sm">
            <div className="flex flex-col md:flex-row items-center gap-6 justify-between">

                <div className="flex-1">
                    <h3 className="text-xl font-bold flex items-center gap-2 text-gray-900">
                        <Wallet className="h-6 w-6 text-green-600" />
                        Inject Tokens to Contract
                    </h3>
                    <p className="text-sm text-muted-foreground mt-1">
                        Fund the central escrow contract. These tokens are used for both Standard and VIP rewards.
                    </p>
                </div>

                <div className="flex flex-col md:flex-row items-center gap-4 w-full md:w-auto">
                    <div className="relative w-full md:w-64">
                        <input
                            type="number"
                            value={fundAmount}
                            onChange={(e) => setFundAmount(e.target.value)}
                            placeholder="Amount (CCT)"
                            className="w-full h-11 rounded-md border border-input bg-white px-3 py-2 pl-10 text-sm shadow-sm focus:ring-2 focus:ring-green-500"
                        />
                        <Coins className="absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" />
                    </div>

                    {needsApproval ? (
                        <Button
                            className="w-full md:w-40 bg-yellow-500 hover:bg-yellow-600 text-white font-semibold"
                            onClick={handleApprove}
                            disabled={isApproving}
                        >
                            {isApproving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Approve CCT'}
                        </Button>
                    ) : (
                        <Button
                            className="w-full md:w-40 bg-green-600 hover:bg-green-700 text-white font-semibold"
                            onClick={handleFundPool}
                            disabled={isFunding || !fundAmount}
                        >
                            {isFunding ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Fund Contract'}
                        </Button>
                    )}
                </div>
            </div>

            {/* Status Messages */}
            {(error || status) && (
                <div className="mt-4 flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
                    {error ? (
                        <div className="flex items-center gap-2 text-red-600 bg-red-50 px-3 py-2 rounded-md text-sm w-full">
                            <AlertCircle className="h-4 w-4" /> {error}
                        </div>
                    ) : (
                        <div className="flex items-center gap-2 text-green-700 bg-green-50 px-3 py-2 rounded-md text-sm w-full">
                            {status.includes('Injecting') || status.includes('Approving') ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                                <CheckCircle className="h-4 w-4" />
                            )}
                            {status}
                        </div>
                    )}
                </div>
            )}
        </Card>
    );
};

export default ContractEscrowManager;
