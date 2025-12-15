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

  Copy,
  CheckCircle2,
  Calendar,
  DollarSign,
  Coins,
  ArrowRight,
  Loader2,
  Lock as LockIcon,
  Unlock
} from "lucide-react";
import { useState, useEffect } from "react";
import { useWallet } from '@/hooks/useWallet';
import StakingInterface from '@/app/components/StakingInterface';
import { supabase } from '@/lib/supabase';
import { useStaking } from '@/context/context';

const BACKEND_API_URL = process.env.NEXT_PUBLIC_BACKEND_API_URL || 'http://localhost:3001';

const Dashboard = () => {
  const [copied, setCopied] = useState(false);
  const { address, isConnected, chain, balance, balanceLoading } = useWallet();
  const { withdraw, claim, refetchLocks } = useStaking();
  
  const [userData, setUserData] = useState(null);
  const [stakes, setStakes] = useState([]);
  const [loading, setLoading] = useState(false);
  
  // Reward State
  const [rewardStatus, setRewardStatus] = useState({ eligible: false, amount: 0, proof: null, epochId: null, claimed: false });
  const [checkingReward, setCheckingReward] = useState(false);
  const [claiming, setClaiming] = useState(false);

  useEffect(() => {
    if (isConnected && address) {
      // Register wallet to ensure referral code exists in database
      registerWallet();
      fetchUserData();
      checkRewardStatus();

      // Real-time subscription
      const channel = supabase
        .channel('dashboard-updates')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'stakes', filter: `user_address=eq.${address.toLowerCase()}` },
          (payload) => {
            console.log("Real-time stake update:", payload);
            fetchUserData(); 
          }
        )
        .on(
            'postgres_changes', 
            { event: '*', schema: 'public', table: 'users', filter: `wallet_address=eq.${address.toLowerCase()}` },
            (payload) => {
                console.log("Real-time user update:", payload);
                fetchUserData();
            }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    } else {
        setUserData(null);
        setStakes([]);
    }
  }, [isConnected, address]);

  const registerWallet = async () => {
    if (!address) return;
    try {
      await fetch(`${BACKEND_API_URL}/api/wallet/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ walletAddress: address })
      });
    } catch (error) {
      console.log('Wallet registration info:', error);
      // Non-critical, don't show error to user
    }
  };

  const fetchUserData = async () => {
    setLoading(true);
    try {
        console.log("Fetching data for:", address);
        
        // Fetch User Info
        const { data: user, error: userError } = await supabase
            .from('users')
            .select('*')
            .eq('wallet_address', address.toLowerCase()) // Fix: Ensure lowercase match
            .single();
        
        if (user) setUserData(user);

        // Fetch Stakes
        const { data: userStakes, error: stakesError } = await supabase
            .from('stakes')
            .select('*')
            .eq('user_address', address.toLowerCase()) // Fix: Ensure lowercase match
            .order('created_at', { ascending: false });

        if (userStakes) setStakes(userStakes);

    } catch (e) {
        console.error("Error loading dashboard data", e);
    } finally {
        setLoading(false);
    }
  };

  const checkRewardStatus = async () => {
      try {
          setCheckingReward(true);
          // Fetch latest epoch proof
          const res = await fetch(`${BACKEND_API_URL}/api/rewards/proof/${address}/latest`);
          if (res.ok) {
              const data = await res.json();
              setRewardStatus({
                  eligible: true,
                  amount: data.amount, // in wei
                  proof: data.proof,
                  epochId: data.epochId,
                  claimed: data.claimed // New field from API
              });
          } else {
              setRewardStatus({ eligible: false, amount: 0, proof: null, epochId: null });
          }
      } catch (e) {
          console.error("Reward check error", e);
      } finally {
          setCheckingReward(false);
      }
  };

  const handleClaimReward = async () => {
      if (!rewardStatus.eligible) return;
      try {
          setClaiming(true);
          await claim(rewardStatus.epochId, rewardStatus.amount, rewardStatus.proof);
          // Refresh after claim
          checkRewardStatus(); 
      } catch (e) {
          console.error("Claim failed", e);
      } finally {
          setClaiming(false);
      }
  };

  const handleWithdraw = async (stakeItem) => {
      if (!confirm("Are you sure you want to withdraw this stake?")) return;
      try {
          // Use the lock_id from DB which corresponds to contract index
          if (stakeItem.lock_id === undefined || stakeItem.lock_id === null) {
              alert("Lock ID missing");
              return;
          }
          await withdraw(stakeItem.lock_id);
          fetchUserData(); // Refresh list
      } catch (e) {
          console.error("Withdraw failed", e);
          alert("Withdraw failed: " + e.message);
      }
  };


  // Generate referral code from wallet address (always available)
  const getReferralCode = () => {
    if (userData?.referral_code) {
      return userData.referral_code;
    }
    // If no userData yet, generate from wallet address
    if (address) {
      return address.substring(2, 8).toUpperCase();
    }
    return null;
  };

  const handleCopyReferral = () => {
    const code = getReferralCode();
    if (!code) return;
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Logic for Referral Target based on Total Staked Amount
  const getReferralTarget = (totalStaked) => {
      if (totalStaked >= 1000) return 0;  // $1000+ = No referrals needed
      if (totalStaked >= 100) return 5;   // $100-$1000 = 5 referrals
      return 10;                           // $0-$100 = 10 referrals
  };

  const totalStaked = userData?.total_staked || 0;
  const referralTarget = getReferralTarget(totalStaked);
  const currentReferrals = userData?.direct_referrals_count || 0;
  const isReferralEligible = currentReferrals >= referralTarget;

  return (
    <div className="py-12 bg-muted/30 relative overflow-hidden min-h-screen">
        {/* Dashboard-specific orbs */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="orb orb-1 w-96 h-96 top-20 -left-20" />
          <div className="orb orb-2 w-80 h-80 top-60 right-10" />
          <div className="orb orb-3 w-72 h-72 bottom-40 left-1/3" />
        </div>
        
        <div className="container max-w-7xl space-y-8 relative z-10">
          
          {/* Header & Wallet Profile */}
          <div className="grid gap-8">
            <div className="space-y-2">
                <h1 className="text-4xl font-bold">Dashboard</h1>
                <p className="text-muted-foreground">Monitor your staking activity and rewards</p>
            </div>

            <Card className="p-6 gradient-border">
                {isConnected ? (
                <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                    <div className="h-16 w-16 rounded-full gradient-primary flex items-center justify-center">
                        <Wallet className="h-8 w-8 text-white" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold">Wallet Connected</h2>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <code className="text-xs bg-muted px-2 py-1 rounded">
                            {address ? `${address.slice(0, 6)}...${address.slice(-4)}` : 'N/A'}
                        </code>
                        </div>
                    </div>
                    </div>
                    <div className="flex gap-4">
                        <Badge variant="outline" className="px-4 py-2 bg-green-50 text-green-700 border-green-200">
                            ✓ Connected
                        </Badge>
                    </div>
                </div>
                ) : (
                <div className="text-center py-8">
                    <h2 className="text-2xl font-bold mb-2">Connect Your Wallet</h2>
                    <p className="text-muted-foreground">Please connect your wallet to view your dashboard.</p>
                </div>
                )}
            </Card>
          </div>

          {isConnected && (
            <>
                {/* 1. Stats Grid */}
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[
                    {
                        title: "Total Staked",
                        value: `$${userData?.total_staked?.toLocaleString() || '0'}`,
                        icon: <DollarSign className="h-6 w-6 text-primary" />,
                        bg: "bg-primary/10",
                    },
                    {
                        title: "Referrals",
                        value: `${currentReferrals} / ${referralTarget}`,
                        sub: referralTarget === 0 ? "No Requirement" : "Target",
                        icon: <Users className="h-6 w-6 text-secondary" />,
                        bg: "bg-secondary/10",
                    },
                    {
                        title: "Active Stakes",
                        value: stakes.filter(s => s.status === 'active').length.toString(),
                        icon: <LockIcon className="h-6 w-6 text-primary" />,
                        bg: "bg-primary/10",
                    },

                    ].map((stat, i) => (
                    <Card key={i} className="p-6 transition-transform hover:scale-105">
                        <div className="flex items-center gap-4">
                        <div className={`h-12 w-12 rounded-lg flex items-center justify-center ${stat.bg}`}>
                            {stat.icon}
                        </div>
                        <div>
                            <p className="text-sm text-muted-foreground">{stat.title}</p>
                            <div className="flex items-baseline gap-2">
                                <p className="text-2xl font-bold">{stat.value}</p>
                                {stat.sub && <span className="text-xs text-muted-foreground">({stat.sub})</span>}
                            </div>
                        </div>
                        </div>
                    </Card>
                    ))}
                </div>

                {/* 2. Reward Pool Status Grid */}
                <div className="grid lg:grid-cols-2 gap-6">
                    {/* Reward Status Card */}
                    <Card className="p-6 space-y-6 border-l-4 border-l-primary">
                        <div className="flex justify-between items-start">
                            <div>
                                <h3 className="text-xl font-semibold flex items-center gap-2">
                                    <Coins className="h-5 w-5 text-yellow-500" />
                                    Reward Pool Status
                                </h3>
                                <p className="text-sm text-muted-foreground mt-1">
                                    Check your eligibility and claim rewards from the pool.
                                </p>
                            </div>
                            <Badge variant={rewardStatus.eligible ? "default" : "secondary"}>
                                {rewardStatus.eligible ? "Reward Available" : "No Pending Reward"}
                            </Badge>
                        </div>

                        <div className="space-y-4">
                            <div className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                                <span className="text-sm font-medium">Referral Status</span>
                                <div className="flex items-center gap-2">
                                    {isReferralEligible ? (
                                        <span className="text-green-600 flex items-center text-sm font-bold">
                                            <CheckCircle2 className="h-4 w-4 mr-1" /> Eligible
                                        </span>
                                    ) : (
                                        <span className="text-red-500 flex items-center text-sm font-bold">
                                            Needs {Math.max(0, referralTarget - currentReferrals)} more
                                        </span>
                                    )}
                                </div>
                            </div>

                            <div className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                                <span className="text-sm font-medium">Claimable Amount</span>
                                <span className="text-xl font-bold">
                                    {rewardStatus.amount > 0 ? (rewardStatus.amount / 1e18).toFixed(4) : "0.00"} TOKENS
                                </span>
                            </div>

                            <Button 
                                className="w-full gradient-primary text-white" 
                                size="lg"
                                disabled={!rewardStatus.eligible || claiming || rewardStatus.claimed}
                                onClick={handleClaimReward}
                            >
                                {claiming ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Claiming...
                                    </>
                                ) : rewardStatus.claimed ? (
                                    "Claimed ✓"
                                ) : (
                                    "Claim Reward"
                                )}
                            </Button>
                            {!rewardStatus.eligible && (
                                <p className="text-xs text-center text-muted-foreground">
                                    Withdrawal button will activate automatically when rewards are distributed by Admin.
                                </p>
                            )}
                        </div>
                    </Card>

                    {/* Referral Code Card */}
                    <Card className="p-6 space-y-6">
                        <h3 className="text-xl font-semibold flex items-center gap-2">
                            <Users className="h-5 w-5 text-blue-500" />
                            Share Your Referral Code
                        </h3>
                        <p className="text-sm text-muted-foreground">
                            Share your code for others to use when staking to reach eligibility targets.
                        </p>
                        
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Your Referral Code</label>
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={getReferralCode() || '...'}
                                    readOnly
                                    className="flex-1 px-3 py-2 rounded-lg border bg-muted text-lg font-mono text-center font-bold tracking-wider"
                                />
                                <Button
                                    size="icon"
                                    onClick={handleCopyReferral}
                                    className="shrink-0"
                                >
                                    {copied ? <CheckCircle2 className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                                </Button>
                            </div>
                            <p className="text-xs text-muted-foreground text-center">
                                Others can enter this code when staking to link as your referral
                            </p>
                        </div>
                    </Card>
                </div>

                {/* 3. Main Staking Interface */}
                <StakingInterface />

                {/* 4. Active Staking List */}
                <Card className="p-6">
                    <h3 className="text-xl font-semibold mb-6 flex items-center gap-2">
                        <LockIcon className="h-5 w-5 text-indigo-500" />
                        My Active Stakes
                    </h3>
                    <div className="rounded-md border">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Staked Amount</TableHead>
                                    <TableHead>Package</TableHead>
                                    <TableHead>Start Date</TableHead>
                                    <TableHead>Unlock Date</TableHead>
                                    <TableHead className="text-right">Action</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {stakes.length > 0 ? (
                                    stakes.map((stake, i) => {
                                        const endDate = new Date(stake.end_time);
                                        const now = new Date();
                                        const isUnlocked = now >= endDate;
                                        
                                        return (
                                            <TableRow key={i}>
                                                <TableCell className="font-medium font-mono text-base">${stake.amount}</TableCell>
                                                <TableCell>
                                                    <Badge variant="outline">
                                                        {stake.package_id === 0 ? "Starter" : stake.package_id === 1 ? "Pro" : stake.package_id === 2 ? "Elite" : "Custom"}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="text-muted-foreground">{new Date(stake.start_time).toLocaleDateString()}</TableCell>
                                                <TableCell className={isUnlocked ? "text-green-600 font-medium" : "text-orange-600"}>
                                                    {endDate.toLocaleDateString()}
                                                    {!isUnlocked && <span className="text-xs ml-1 text-muted-foreground">({Math.ceil((endDate - now)/(1000*60*60*24))}d left)</span>}
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    {stake.status === 'withdrawn' ? (
                                                        <Badge variant="secondary">Withdrawn</Badge>
                                                    ) : (
                                                        <Button 
                                                            size="sm" 
                                                            variant={isUnlocked ? "default" : "outline"}
                                                            disabled={!isUnlocked}
                                                            onClick={() => handleWithdraw(stake)}
                                                        >
                                                            {isUnlocked ? (
                                                                <><Unlock className="mr-1 h-3 w-3" /> Withdraw</>
                                                            ) : (
                                                                <><LockIcon className="mr-1 h-3 w-3" /> Locked</>
                                                            )}
                                                        </Button>
                                                    )}
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                                            No active stakes found. Start staking above!
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </Card>

                {/* 5. Transaction History */}
                {/* ... (Existing transaction table can be merged or kept separate, kept separate for now) */}
            </>
          )}
        </div>
    </div>
  );
};

export default Dashboard;
