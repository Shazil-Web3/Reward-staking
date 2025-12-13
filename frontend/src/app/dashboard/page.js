"use client";

import { Card } from "@/app/components/ui/card";
import { Button } from "@/app/components/ui/button";
import { Badge } from "@/app/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/app/components/ui/table";
import {
  User,
  Wallet,
  Clock,
  Users,
  TrendingUp,
  Copy,
  CheckCircle2,
  Calendar,
  DollarSign,
} from "lucide-react";
import { useState, useEffect } from "react";
import { useWallet } from '@/hooks/useWallet';
import StakingInterface from '@/app/components/StakingInterface';
import { supabase } from '@/lib/supabase';

const Dashboard = () => {
  const [copied, setCopied] = useState(false);
  const { address, isConnected, chain, balance, balanceLoading } = useWallet();
  const [userData, setUserData] = useState(null);
  const [stakes, setStakes] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isConnected && address) {
      fetchUserData();
    } else {
        setUserData(null);
        setStakes([]);
    }
  }, [isConnected, address]);

  const fetchUserData = async () => {
    setLoading(true);
    try {
        // Fetch User Info
        const { data: user, error: userError } = await supabase
            .from('users')
            .select('*')
            .eq('wallet_address', address.toLowerCase())
            .single();
        
        if (user) setUserData(user);

        // Fetch Stakes
        const { data: userStakes, error: stakesError } = await supabase
            .from('stakes')
            .select('*')
            .eq('user_address', address.toLowerCase())
            .order('created_at', { ascending: false });

        if (userStakes) setStakes(userStakes);

    } catch (e) {
        console.error("Error loading dashboard data", e);
    } finally {
        setLoading(false);
    }
  };

  const handleCopyReferral = () => {
    if (!address) return;
    const link = `${window.location.origin}/ref/${address}`;
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Calculate Stats
  const latestStake = stakes.length > 0 ? stakes[0] : null;
  const lockPeriodYears = latestStake ? Math.floor((new Date(latestStake.end_time) - new Date(latestStake.start_time)) / (1000 * 60 * 60 * 24 * 365)) : 0;
  
  // Time remaining helper
  const getTimeRemaining = (endTime) => {
    if (!endTime) return "0d";
    const now = new Date();
    const end = new Date(endTime);
    const diff = end - now;
    if (diff <= 0) return "Unlocked";
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    return `${days} days`;
  };

  return (
    <div className="py-12 bg-muted/30 relative overflow-hidden min-h-screen">
        {/* Dashboard-specific orbs */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="orb orb-1 w-96 h-96 top-20 -left-20" />
          <div className="orb orb-2 w-80 h-80 top-60 right-10" />
          <div className="orb orb-3 w-72 h-72 bottom-40 left-1/3" />
        </div>
        
        <div className="container max-w-7xl space-y-8 relative z-10">
          {/* Page Header */}
          <div className="space-y-2">
            <h1 className="text-4xl font-bold">Dashboard</h1>
            <p className="text-muted-foreground">
              Monitor your staking activity and rewards
            </p>
          </div>

          {/* Wallet Profile Card */}
          <Card className="p-6 gradient-border">
            {isConnected ? (
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="h-16 w-16 rounded-full gradient-primary flex items-center justify-center">
                    <Wallet className="h-8 w-8 text-white" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold">Wallet Connected</h2>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Wallet className="h-4 w-4" />
                      <code className="text-xs">
                        {address ? `${address.slice(0, 6)}...${address.slice(-4)}` : 'N/A'}
                      </code>
                    </div>
                    <div className="flex items-center gap-4 mt-2">
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <span>Network:</span>
                        <span className="font-medium">{chain?.name || 'Unknown'}</span>
                      </div>
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <span>Balance:</span>
                        <span className="font-medium">
                          {balanceLoading ? 'Loading...' : balance ? `${parseFloat(balance.formatted).toFixed(4)} ${balance.symbol}` : 'N/A'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
                <Badge className="bg-green-100 text-green-800 border border-green-200 px-6 py-2 text-sm">
                  ✓ Connected
                </Badge>
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                  <Wallet className="h-8 w-8 text-muted-foreground" />
                </div>
                <h2 className="text-2xl font-bold mb-2">Connect Your Wallet</h2>
                <p className="text-muted-foreground mb-4">
                  Please connect your wallet to access the dashboard and start staking.
                </p>
              </div>
            )}
          </Card>

          {/* Staking Interface - Only show when wallet is connected */}
          {isConnected && (
            <StakingInterface />
          )}

          {isConnected && (
            <>
                {/* Stats Grid */}
                <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {[
                    {
                        title: "Amount Staked",
                        value: `$${userData?.total_staked?.toLocaleString() || '0'}`,
                        icon: <DollarSign className="h-6 w-6 text-primary" />,
                        bg: "bg-primary/10",
                    },
                    {
                        title: "Lock Period",
                        value: latestStake ? `${lockPeriodYears} Years` : "N/A",
                        icon: <Calendar className="h-6 w-6 text-secondary" />,
                        bg: "bg-secondary/10",
                    },
                    {
                        title: "Time Remaining",
                        value: latestStake ? getTimeRemaining(latestStake.end_time) : "-",
                        icon: <Clock className="h-6 w-6 text-primary" />,
                        bg: "bg-primary/10",
                    },
                    {
                        title: "Total Rewards",
                        value: "TBD", // Requires Reward Calculation logic
                        icon: <TrendingUp className="h-6 w-6 text-secondary" />,
                        bg: "bg-secondary/10",
                    },
                    ].map((stat, i) => (
                    <Card key={i} className="p-6 transition-transform hover:scale-105">
                        <div className="flex items-center gap-4">
                        <div
                            className={`h-12 w-12 rounded-lg flex items-center justify-center ${stat.bg}`}
                        >
                            {stat.icon}
                        </div>
                        <div>
                            <p className="text-sm text-muted-foreground">{stat.title}</p>
                            <p className="text-2xl font-bold">{stat.value}</p>
                        </div>
                        </div>
                    </Card>
                    ))}
                </div>

                {/* Staking Summary & Referral Stats */}
                <div className="grid lg:grid-cols-2 gap-6">
                    {/* Staking Summary */}
                    <Card className="p-6 space-y-6">
                    <h3 className="text-xl font-semibold flex items-center gap-2">
                        <DollarSign className="h-5 w-5 text-primary" />
                        Staking Summary
                    </h3>
                    <div className="space-y-4">
                        {latestStake ? (
                             <>
                                <div className="flex justify-between items-center pb-3 border-b">
                                    <span className="text-muted-foreground">Package ID</span>
                                    <span className="font-semibold">{latestStake.package_id}</span>
                                </div>
                                <div className="flex justify-between items-center pb-3 border-b">
                                    <span className="text-muted-foreground">Start Date</span>
                                    <span className="font-semibold">{new Date(latestStake.start_time).toLocaleDateString()}</span>
                                </div>
                                <div className="flex justify-between items-center pb-3 border-b">
                                    <span className="text-muted-foreground">End Date</span>
                                    <span className="font-semibold">{new Date(latestStake.end_time).toLocaleDateString()}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-muted-foreground">Net Staked</span>
                                    <span className="font-semibold text-primary">${latestStake.amount}</span>
                                </div>
                             </>
                        ) : (
                            <div className="text-center text-muted-foreground py-4">No active stakes found.</div>
                        )}
                    </div>
                    </Card>

                    {/* Referral Stats */}
                    <Card className="p-6 space-y-6">
                    <h3 className="text-xl font-semibold flex items-center gap-2">
                        <Users className="h-5 w-5 text-secondary" />
                        Referral Stats
                    </h3>
                    <div className="space-y-4">
                        <div className="flex justify-between items-center pb-3 border-b">
                        <span className="text-muted-foreground">Total Referrals</span>
                        <span className="font-semibold text-2xl">{userData?.direct_referrals_count || 0}</span>
                        </div>

                        <div className="space-y-2">
                        <label className="text-sm text-muted-foreground">
                            Your Referral Link
                        </label>
                        <div className="flex gap-2">
                            <input
                            type="text"
                            value={address ? `${window.location.origin}/ref/${address}` : 'Connect wallet to generate link'}
                            readOnly
                            className="flex-1 px-3 py-2 rounded-lg border bg-muted text-sm"
                            />
                            <Button
                            size="sm"
                            onClick={handleCopyReferral}
                            className="gradient-primary text-white border-0"
                            aria-label="Copy referral link"
                            disabled={!address}
                            >
                            {copied ? (
                                <CheckCircle2 className="h-4 w-4" />
                            ) : (
                                <Copy className="h-4 w-4" />
                            )}
                            </Button>
                        </div>
                        </div>
                    </div>
                    </Card>
                </div>

                 {/* Transaction History */}
                <Card className="p-6 space-y-6">
                    <h3 className="text-xl font-semibold">Transaction History</h3>
                    <Table>
                    <TableHeader>
                        <TableRow>
                        <TableHead>Type</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Tx Hash</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {stakes.length > 0 ? (
                            stakes.map((tx, i) => (
                                <TableRow key={i}>
                                    <TableCell className="font-medium">Stake</TableCell>
                                    <TableCell>${tx.amount}</TableCell>
                                    <TableCell>{new Date(tx.created_at).toLocaleDateString()}</TableCell>
                                    <TableCell>
                                        <Badge variant="outline" className={tx.status === 'active' ? 'text-green-600 border-green-200' : ''}>
                                            {tx.status}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        <a 
                                            href={`https://testnet.bscscan.com/tx/${tx.tx_hash}`} 
                                            target="_blank" 
                                            rel="noreferrer"
                                            className="text-xs text-blue-500 hover:underline"
                                        >
                                            View
                                        </a>
                                    </TableCell>
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell colSpan={5} className="text-center py-4 text-muted-foreground">
                                    No transaction history.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                    </Table>
                </Card>
            </>
          )}

        </div>
    </div>
  );
};

export default Dashboard;
