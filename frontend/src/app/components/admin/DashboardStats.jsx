'use client';

import { Card } from '@/app/components/ui/card';
import { Coins, Users, Lock, TrendingUp } from 'lucide-react';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

const DashboardStats = () => {
    const [stats, setStats] = useState([
        { title: "Total Staked", value: "Loading...", change: "...", icon: Lock },
        { title: "Reward Pool", value: "Loading...", change: "...", icon: Coins },
        { title: "Active Users", value: "Loading...", change: "...", icon: Users },
        { title: "Total Supply", value: "100T", change: "Max Supply", icon: TrendingUp },
    ]);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                // Fetch Total Staked (Sum of all users' staked amount)
                const { data: stakedData, error: stakedError } = await supabase
                    .from('users')
                    .select('total_staked');

                const totalStaked = stakedData
                    ? stakedData.reduce((acc, user) => acc + (user.total_staked || 0), 0)
                    : 0;

                // Fetch Total Users
                const { count: userCount, error: userError } = await supabase
                    .from('users')
                    .select('*', { count: 'exact', head: true });

                // Fetch Reward Pool
                const { data: poolData, error: poolError } = await supabase
                    .from('reward_pool')
                    .select('current_balance')
                    .single();

                const rewardBalance = poolData ? poolData.current_balance : 0;

                setStats([
                    {
                        title: "Total Staked",
                        value: `$${totalStaked.toLocaleString()}`,
                        change: "Real-time data",
                        icon: Lock,
                    },
                    {
                        title: "Reward Pool",
                        value: `${rewardBalance.toLocaleString()} TOKENS`,
                        change: "Ready to distribute",
                        icon: Coins,
                    },
                    {
                        title: "Active Users",
                        value: userCount?.toString() || "0",
                        change: "Total registered",
                        icon: Users,
                    },
                    {
                        title: "Total Supply",
                        value: "100T",
                        change: "Max Supply",
                        icon: TrendingUp,
                    },
                ]);

            } catch (error) {
                console.error("Error fetching stats:", error);
                // On error (e.g. missing keys), show zeros or placeholders but don't crash
                setStats(prev => prev.map(s => ({ ...s, value: s.value === "Loading..." ? "0" : s.value })));
            }
        };

        fetchStats();
    }, []);

    return (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {stats.map((stat, index) => {
                const Icon = stat.icon;
                return (
                    <Card key={index} className="p-6 space-y-2">
                        <div className="flex items-center justify-between">
                            <span className="text-sm font-medium text-muted-foreground">{stat.title}</span>
                            <Icon className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <div className="text-2xl font-bold">{stat.value}</div>
                        <p className="text-xs text-muted-foreground">{stat.change}</p>
                    </Card>
                );
            })}
        </div>
    );
};

export default DashboardStats;
