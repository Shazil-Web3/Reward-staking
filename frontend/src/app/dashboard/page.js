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
  Crown,
  Copy,
  CheckCircle2,
  Calendar,
  DollarSign,
  Coins,
  ArrowRight,
  Loader2,
  Lock as LockIcon,
  Unlock,
  AlertCircle
} from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { useWallet } from '@/hooks/useWallet';
import { useSwitchChain, usePublicClient } from 'wagmi';
import StakingInterface from '@/app/components/StakingInterface';
import { supabase } from '@/lib/supabase';
import { useStaking } from '@/context/context';
import { formatUnits, erc20Abi } from 'viem';
import StakingArtifact from '@/context/staking.json';

const BACKEND_API_URL = process.env.NEXT_PUBLIC_BACKEND_API_URL || 'http://localhost:3001';
const STAKING_CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_STAKING_CONTRACT_ADDRESS;

const Dashboard = () => {
  const [copied, setCopied] = useState(false);
  const { address, isConnected, chain, balance, balanceLoading } = useWallet();
  const { chains, switchChain } = useSwitchChain();
  const publicClient = usePublicClient();
  const { withdraw, stakes: contractStakes, refetchStakes, isLoading: stakesLoading, claimReward, claimVIPReward } = useStaking();
  const referralInputRef = useRef(null);
  
  const [userData, setUserData] = useState(null);
  const [stakes, setStakes] = useState([]);
  const [deposits, setDeposits] = useState([]);
  const [loading, setLoading] = useState(false);
  const [switching, setSwitching] = useState(false);
  
  // Withdrawing state
  const [withdrawing, setWithdrawing] = useState(false);

  // Contract CCT Balance for debug
  const [contractCctBalance, setContractCctBalance] = useState(null);

  // Reward State (Backend-managed)
  const [rewardStatus, setRewardStatus] = useState({ eligible: false, amount: 0, proof: null, epochId: null, claimed: false });
  const [checkingReward, setCheckingReward] = useState(false);
  const [claiming, setClaiming] = useState(false);
  
  // VIP Reward State (Backend-managed)
  const [vipRewardStatus, setVipRewardStatus] = useState({ eligible: false, amount: 0, proof: null, epochId: null, claimed: false });
  const [checkingVipReward, setCheckingVipReward] = useState(false);
  const [claimingVip, setClaimingVip] = useState(false);

  const isCorrectNetwork = true; 

  useEffect(() => {
    if (isConnected && address) {
      registerWallet();
      fetchUserData();
      checkRewardStatus();
      checkVipRewardStatus();

      const channel = supabase
        .channel('dashboard-updates')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'stakes', filter: `user_address=eq.${address.toLowerCase()}` },
          () => fetchUserData()
        )
        .on(
          'postgres_changes', 
          { event: '*', schema: 'public', table: 'deposits', filter: `user_address=eq.${address.toLowerCase()}` },
          () => fetchUserData()
        )
        .on(
            'postgres_changes', 
            { event: '*', schema: 'public', table: 'users', filter: `wallet_address=eq.${address.toLowerCase()}` },
            () => fetchUserData()
        )
        .subscribe();

      const handleRewardUpdate = () => {
        checkRewardStatus();
        checkVipRewardStatus();
      };

      window.addEventListener('reward-claimed', handleRewardUpdate);
      window.addEventListener('vip-reward-claimed', handleRewardUpdate);

      return () => {
        supabase.removeChannel(channel);
        window.removeEventListener('reward-claimed', handleRewardUpdate);
        window.removeEventListener('vip-reward-claimed', handleRewardUpdate);
      };
    } else {
        setUserData(null);
        setStakes([]);
        setDeposits([]);
    }
  }, [isConnected, address]);

  // Fetch contract CCT balance for debugging
  useEffect(() => {
    const fetchContractBalance = async () => {
      if (!publicClient || !STAKING_CONTRACT_ADDRESS) return;
      
      try {
        // Use CCT address from env (simpler than reading from contract)
        const cctAddress = process.env.NEXT_PUBLIC_CCT_TOKEN_ADDRESS;
        
        if (!cctAddress) {
          console.warn('CCT token address not configured');
          return;
        }

        // Get contract's CCT balance
        const balance = await publicClient.readContract({
          address: cctAddress,
          abi: erc20Abi,
          functionName: 'balanceOf',
          args: [STAKING_CONTRACT_ADDRESS]
        });

        setContractCctBalance(balance);
      } catch (e) {
        console.error('Error fetching contract balance:', e);
      }
    };

    fetchContractBalance();
    // Refetch every 10 seconds
    const interval = setInterval(fetchContractBalance, 10000);
    return () => clearInterval(interval);
  }, [publicClient]);

  // Separate effect to handle blockchain stakes
  useEffect(() => {
    if (contractStakes && contractStakes.length > 0) {
      const formattedStakes = contractStakes.map((stake, index) => ({
        amount: stake.cctAmount ? parseFloat(formatUnits(stake.cctAmount, 6)) : 0,
        package_id: index,
        start_time: stake.createdAt ? new Date(Number(stake.createdAt) * 1000) : new Date(),
        end_time: stake.unlockTime ? new Date(Number(stake.unlockTime) * 1000) : new Date(),
        status: stake.withdrawn ? 'withdrawn' : 'active'
      }));
      setStakes(formattedStakes);
    } else {
      setStakes([]);
    }
  }, [contractStakes]);

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
    }
  };

  const fetchUserData = async () => {
    setLoading(true);
    try {
        const { data: user } = await supabase
            .from('users')
            .select('*')
            .eq('wallet_address', address.toLowerCase())
            .single();
        
        if (user) {
            // Fetch referral counts from API
            try {
                const referralRes = await fetch(`${BACKEND_API_URL}/api/referrals/tree/${address}`);
                if (referralRes.ok) {
                    const referralData = await referralRes.json();
                    user.direct_referrals_count = referralData.directReferrals;
                    user.indirect_referrals_count = referralData.indirectReferrals;
                    user.total_referrals_count = referralData.totalReferrals;
                }
            } catch (err) {
                console.error('Error fetching referral counts:', err);
            }
            setUserData(user);
        }



        const { data: userDeposits } = await supabase
          .from('deposits')
          .select('*')
          .eq('user_address', address.toLowerCase())
          .order('created_at', { ascending: false });

        if (userDeposits) {
            setDeposits(userDeposits);
        }

        // Stakes are now handled by separate useEffect watching contractStakes

    } catch (e) {
        console.error("Error loading dashboard data:", e);
    } finally {
        setLoading(false);
    }
  };

  // Backend-managed reward checking
  const checkRewardStatus = async () => {
      try {
          setCheckingReward(true);
          const url = `${BACKEND_API_URL}/api/rewards/proof/${address}/latest`;
          const res = await fetch(url);
          if (res.ok) {
              const data = await res.json();
              setRewardStatus({
                  eligible: data.eligible,
                  amount: data.amount,
                  proof: data.proof,
                  epochId: data.epochId,
                  claimed: data.claimed
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

  const checkVipRewardStatus = async () => {
      try {
          setCheckingVipReward(true);
          const url = `${BACKEND_API_URL}/api/vip/proof/${address}/latest`;
          const res = await fetch(url);
          if (res.ok) {
              const data = await res.json();
              setVipRewardStatus({
                  eligible: data.eligible,
                  amount: data.amount,
                  proof: data.proof,
                  epochId: data.epochId,
                  claimed: data.claimed,
                  totalReferrals: data.totalReferrals,
                  directReferrals: data.directReferrals,
                  indirectReferrals: data.indirectReferrals
              });
          } else {
              setVipRewardStatus({ eligible: false, amount: 0, proof: null, epochId: null });
          }
      } catch (e) {
          console.error("VIP reward check error", e);
      } finally {
          setCheckingVipReward(false);
      }
  };

  // Direct contract-based claim handler
  const handleClaimReward = async () => {
      if (!rewardStatus.eligible || rewardStatus.claimed) return;
      
      // Safety check for proof
      if (!rewardStatus.proof || !Array.isArray(rewardStatus.proof) || rewardStatus.proof.length === 0) {
          alert("Error: Invalid or missing reward proof. Please refresh.");
          return;
      }

      try {
          setClaiming(true);
          
          // Call contract directly with Merkle proof
          await claimReward(
              rewardStatus.epochId,
              rewardStatus.amount,
              rewardStatus.proof
          );
          
          // Notify backend of successful claim
          await fetch(`${BACKEND_API_URL}/api/rewards/mark-claimed`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                  walletAddress: address,
                  epochId: rewardStatus.epochId
              })
          });
          
          alert('Reward claimed successfully!');
          checkRewardStatus();
      } catch (e) {
          console.error("Claim failed", e);
          alert('Claim failed: ' + e.message);
      } finally {
          setClaiming(false);
      }
  };

  const handleClaimVipReward = async () => {
      if (!vipRewardStatus.eligible || vipRewardStatus.claimed) return;
      try {
          setClaimingVip(true);
          
          // Call contract directly with Merkle proof
          await claimVIPReward(
              vipRewardStatus.epochId,
              vipRewardStatus.amount,
              vipRewardStatus.proof
          );
          
          // Notify backend of successful claim
          await fetch(`${BACKEND_API_URL}/api/vip/mark-claimed`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                  walletAddress: address,
                  epochId: vipRewardStatus.epochId
              })
          });
          
          alert('VIP reward claimed successfully!');
          checkVipRewardStatus();
      } catch (e) {
          console.error("VIP claim failed", e);
          alert("VIP claim failed: " + e.message);
      } finally {
          setClaimingVip(false);
      }
  };

  const handleWithdraw = async (stakeIndex) => {
      if (!confirm("Are you sure you want to withdraw this stake?")) return;
      try {
          setWithdrawing(true);
          await withdraw(stakeIndex);
          // Refresh data from both contract and database
          await Promise.all([
              refetchStakes(),
              fetchUserData()
          ]);
      } catch (e) {
          console.error("Withdraw failed", e);
          alert("Withdraw failed: " + (e.message || "Unknown error"));
      } finally {
          setWithdrawing(false);
      }
  };

  const getReferralCode = () => {
    if (userData?.referral_code) return userData.referral_code;
    if (address) return address.substring(2, 8).toUpperCase();
    return null;
  };

  const handleSwitchNetwork = async () => {
    try {
      setSwitching(true);
      await switchChain({ chainId: 56 });
    } catch (error) {
      console.error(error);
      alert('Failed to switch network.');
    } finally {
      setSwitching(false);
    }
  };

  const handleCopyReferral = async () => {
    const code = getReferralCode();
    if (!code) return;
    if (referralInputRef.current) referralInputRef.current.select();
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error(err);
    }
  };

  const getReferralTarget = (totalStaked) => {
      // Updated: Removed $1000 tier
      if (totalStaked >= 100) return 5;  // $100+ = 5 referrals
      return 10;                          // $50-$99 = 10 referrals
  };

  const totalStaked = userData?.total_deposited_usdt || 0;
  const referralTarget = getReferralTarget(totalStaked);
  const currentReferrals = userData?.direct_referrals_count || 0;
  const isReferralEligible = currentReferrals >= referralTarget;

  return (
    <div className="py-12 bg-muted/30 relative overflow-hidden min-h-screen">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="orb orb-1 w-96 h-96 top-20 -left-20" />
          <div className="orb orb-2 w-80 h-80 top-60 right-10" />
          <div className="orb orb-3 w-72 h-72 bottom-40 left-1/3" />
        </div>
        
        <div className="container max-w-7xl space-y-8 relative z-10">
          
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
                <Card className="p-6 gradient-border shadow-sm">
                    <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                        <div className="flex-1 space-y-2 text-center md:text-left">
                            <h3 className="text-xl font-semibold flex items-center justify-center md:justify-start gap-2">
                                <Users className="h-5 w-5 text-blue-500" />
                                Share Your Referral Code
                            </h3>
                            <p className="text-sm text-muted-foreground">
                                Share your code for others to use when staking.
                            </p>
                        </div>
                        
                        <div className="flex-none w-full md:w-auto min-w-[320px]">
                            <div className="flex gap-2">
                                <input
                                    ref={referralInputRef}
                                    type="text"
                                    value={getReferralCode() || '...'}
                                    readOnly
                                    onClick={handleCopyReferral}
                                    className="flex-1 px-4 py-2 rounded-lg border bg-muted text-lg font-mono text-center font-bold tracking-wider cursor-pointer hover:bg-muted/80 transition-colors"
                                />
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleCopyReferral();
                                    }}
                                    className="shrink-0 h-10 w-10 flex items-center justify-center rounded-md bg-orange-500 hover:bg-orange-600 text-white transition-colors z-20"
                                >
                                    {copied ? <CheckCircle2 className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                                </button>
                            </div>
                        </div>
                    </div>
                </Card>

                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[
                    {
                        title: "Total Staked",
                        value: `$${userData?.total_deposited_usdt?.toLocaleString() || '0'}`,
                        icon: <DollarSign className="h-6 w-6 text-primary" />,
                        bg: "bg-primary/10",
                    },
                    {
                        title: "Referrals",
                        value: `${userData?.total_referrals_count || 0}`,
                        sub: `${userData?.direct_referrals_count || 0} direct + ${userData?.indirect_referrals_count || 0} indirect`,
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

                <div className="py-8">
                    <StakingInterface />
                </div>
                


                <Card className="p-6 mb-8">
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
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    {stake.status === 'withdrawn' ? (
                                                        <Badge variant="secondary">Withdrawn</Badge>
                                                    ) : (
                                                        <Button 
                                                            size="sm" 
                                                            variant={isUnlocked ? "default" : "outline"}
                                                            disabled={!isUnlocked}
                                                            onClick={() => handleWithdraw(i)}
                                                        >
                                                            {isUnlocked ? "Withdraw" : "Locked"}
                                                        </Button>
                                                    )}
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                                            No active stakes found.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </Card>
                
                <div className="grid lg:grid-cols-2 gap-6 mb-8">
                     <Card className="p-6 space-y-6 border-l-4 border-l-primary">
                        <div className="flex justify-between items-start">
                            <div>
                                <h3 className="text-xl font-semibold flex items-center gap-2">
                                    <Coins className="h-5 w-5 text-yellow-500" />
                                    Reward Pool Status
                                </h3>
                                <p className="text-sm text-muted-foreground mt-1">Check eligibility and claim rewards</p>
                            </div>
                            <Badge variant={rewardStatus.eligible ? "default" : "secondary"}>
                                {rewardStatus.eligible ? "Available" : "Not Eligible"}
                            </Badge>
                        </div>
                        <div className="space-y-4">
                            {/* Referral Status */}
                            <div className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                                <span className="text-sm font-medium">Referral Status</span>
                                <div className="flex items-center gap-2">
                                    {isReferralEligible ? (
                                        <span className="text-green-600 flex items-center text-sm font-bold">
                                            <CheckCircle2 className="h-4 w-4 mr-1" /> Eligible
                                        </span>
                                    ) : (
                                        <span className="text-orange-600 text-sm font-bold">
                                            {currentReferrals}/{referralTarget} Refs
                                        </span>
                                    )}
                                </div>
                            </div>
                            
                            {/* Requirement Info */}
                            {!isReferralEligible && (
                                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                                    <p className="text-xs text-blue-800">
                                        <strong>Need {Math.max(0, referralTarget - currentReferrals)} more referrals</strong><br/>
                                        {totalStaked >= 100 ? "$100+ package: 5 referrals required" : "$50-99 package: 10 referrals required"}
                                    </p>
                                </div>
                            )}

                            <div className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                                <span className="text-sm font-medium">Claimable</span>
                                <span className="text-xl font-bold">{(rewardStatus.amount / 1e18).toFixed(4)} TOKENS</span>
                            </div>
                            
                            <Button 
                                className="w-full gradient-primary text-white" 
                                size="lg"
                                disabled={!rewardStatus.eligible || claiming || rewardStatus.claimed}
                                onClick={handleClaimReward}
                            >
                                {claiming ? (
                                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Claiming...</>
                                ) : rewardStatus.claimed ? "Claimed ✓" : "Claim Reward"}
                            </Button>
                        </div>
                    </Card>
                    
                    <Card className="p-6 space-y-6 border-l-4 border-l-purple-500 bg-gradient-to-br from-purple-50/50 to-pink-50/50">
                         <div className="flex justify-between items-start">
                             <div>
                                 <h3 className="text-xl font-semibold flex items-center gap-2">
                                    <Crown className="h-5 w-5 text-purple-600" />
                                    VIP Reward Pool
                                </h3>
                                <p className="text-sm text-muted-foreground mt-1">100+ total referrals required</p>
                             </div>
                            <Badge variant={(userData?.total_referrals_count || 0) >= 100 ? "default" : "secondary"} className={(userData?.total_referrals_count || 0) >= 100 ? "bg-purple-600" : ""}>
                                {(userData?.total_referrals_count || 0) >= 100 ? "VIP ✨" : "Not Eligible"}
                            </Badge>
                        </div>
                        <div className="space-y-4">
                            {/* VIP Progress */}
                            <div className="flex justify-between items-center p-3 bg-white rounded-lg border">
                                <span className="text-sm font-medium">Total Referrals</span>
                                <div className="flex items-center gap-2">
                                    <span className="text-2xl font-bold">{userData?.total_referrals_count || 0}</span>
                                    <span className="text-sm text-muted-foreground">/ 100</span>
                                </div>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-3">
                                <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                                    <p className="text-xs text-blue-700 font-medium">Direct</p>
                                    <p className="text-lg font-bold text-blue-900">{userData?.direct_referrals_count || 0}</p>
                                </div>
                                <div className="p-3 bg-purple-50 rounded-lg border border-purple-200">
                                    <p className="text-xs text-purple-700 font-medium">Indirect</p>
                                    <p className="text-lg font-bold text-purple-900">{userData?.indirect_referrals_count || 0}</p>
                                </div>
                            </div>

                            <div className="flex justify-between items-center p-3 bg-white rounded-lg border">
                                <span className="text-sm font-medium">Claimable VIP Reward</span>
                                <span className="text-xl font-bold text-purple-600">
                                    {vipRewardStatus.amount > 0 ? (vipRewardStatus.amount / 1e18).toFixed(4) : "0.00"} TOKENS
                                </span>
                            </div>

                            <Button 
                                className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:from-purple-700 hover:to-pink-700" 
                                size="lg"
                                disabled={!vipRewardStatus.eligible || claimingVip || vipRewardStatus.claimed}
                                onClick={handleClaimVipReward}
                            >
                                {claimingVip ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Claiming...
                                    </>
                                ) : vipRewardStatus.claimed ? (
                                    "Claimed ✓"
                                ) : (
                                    <>
                                        <Crown className="mr-2 h-4 w-4" />
                                        Claim VIP Reward 👑
                                    </>
                                )}
                            </Button>
                            {!vipRewardStatus.eligible && (
                                <p className="text-xs text-center text-muted-foreground">
                                    VIP rewards available for users with 100+ referrals.
                                </p>
                            )}
                        </div>
                    </Card>
                </div>

            </>
          )}
        </div>
    </div>
  );
};

export default Dashboard;
