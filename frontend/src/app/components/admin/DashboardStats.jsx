'use client';

import { Card } from '@/app/components/ui/card';
import { Coins, Users, Lock, TrendingUp, Wallet } from 'lucide-react';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useReadContract } from 'wagmi';
import { formatUnits, erc20Abi } from 'viem';
import StakingArtifact from '@/context/staking.json';
import { CCT_DECIMALS } from '@/config/constants';

const STAKING_CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_STAKING_CONTRACT_ADDRESS;
// Fallback if contract read fails
const DEFAULT_CCT_ADDRESS = process.env.NEXT_PUBLIC_CCT_TOKEN_ADDRESS;

const DashboardStats = () => {
    const [stats, setStats] = useState([
        { title: "Total Staked", value: "Loading...", change: "...", icon: Lock, bg: "bg-blue-50 text-blue-600" },
        { title: "Escrow Balance", value: "Loading...", change: "Contract Holdings", icon: Wallet, bg: "bg-green-50 text-green-600" },
        { title: "Active Users", value: "Loading...", change: "...", icon: Users, bg: "bg-indigo-50 text-indigo-600" },
    ]);

    // 1. Fetch CCT Token Address from Contract
    const { data: contractCctAddress } = useReadContract({
        address: STAKING_CONTRACT_ADDRESS,
        abi: StakingArtifact.abi,
        functionName: 'cctToken',
    });

    const cctTokenAddress = contractCctAddress || DEFAULT_CCT_ADDRESS;

    // 2. Fetch Token Decimals
    const { data: tokenDecimals } = useReadContract({
        address: cctTokenAddress,
        abi: erc20Abi,
        functionName: 'decimals',
        query: { enabled: !!cctTokenAddress }
    });
    // We force CCT_DECIMALS for CCT display to ensure consistency, 
    // effectively ignoring potential RPC anomalies unless specifically needed.
    const decimals = CCT_DECIMALS;

    // 3. Fetch Contract's CCT Balance (Escrow)
    const { data: contractBalance } = useReadContract({
        address: cctTokenAddress,
        abi: erc20Abi,
        functionName: 'balanceOf',
        args: [STAKING_CONTRACT_ADDRESS],
        query: { enabled: !!cctTokenAddress },
        watch: true, // Auto-update
    });

    useEffect(() => {
        const fetchStats = async () => {
            try {
                // Fetch Total Staked (Sum of all users' staked amount)
                const { data: stakedData } = await supabase
                    .from('users')
                    .select('total_deposited_usdt');

                const totalStaked = stakedData
                    ? stakedData.reduce((acc, user) => acc + (user.total_deposited_usdt || 0), 0)
                    : 0;

                // Fetch Total Users
                const { count: userCount } = await supabase
                    .from('users')
                    .select('*', { count: 'exact', head: true });

                // Format Contract Balance
                const safeDecimals = CCT_DECIMALS;



                const formattedBalance = contractBalance !== undefined
                    ? parseFloat(formatUnits(contractBalance, safeDecimals)).toLocaleString(undefined, { maximumFractionDigits: 2 })
                    : "...";

                setStats([
                    {
                        title: "Total Staked",
                        value: `$${totalStaked.toLocaleString()}`,
                        change: "Real-time data",
                        icon: Lock,
                        bg: "bg-blue-50 text-blue-600"
                    },
                    {
                        title: "Contract Escrow (CCT)",
                        value: `${formattedBalance} CCT`,
                        change: "Verified on-chain",
                        icon: Wallet,
                        bg: "bg-green-50 text-green-600"
                    },
                    {
                        title: "Active Users",
                        value: userCount?.toString() || "0",
                        change: "Total registered",
                        icon: Users,
                        bg: "bg-indigo-50 text-indigo-600"
                    },
                ]);

            } catch (error) {
                console.error("Error fetching stats:", error);
            }
        };

        fetchStats();
    }, [contractBalance, decimals, contractCctAddress, tokenDecimals]); // Re-run when wagmi data changes

    return (
        <div className="grid gap-6 md:grid-cols-3">
            {stats.map((stat, index) => {
                const Icon = stat.icon;
                return (
                    <Card key={index} className="p-6 transition-all hover:shadow-md border-t-4 border-t-primary/20">
                        <div className="flex items-center justify-between space-y-0 pb-2">
                            <div className={`p-2 rounded-lg ${stat.bg}`}>
                                <Icon className="h-6 w-6" />
                            </div>
                            <span className="text-xs font-medium text-muted-foreground bg-muted px-2 py-1 rounded-full">{stat.change}</span>
                        </div>
                        <div className="mt-3">
                            <h3 className="text-sm font-medium text-muted-foreground mb-1">{stat.title}</h3>
                            <div className="text-2xl font-bold text-gray-900">{stat.value}</div>
                        </div>
                    </Card>
                );
            })}
        </div>
    );
};

export default DashboardStats;
