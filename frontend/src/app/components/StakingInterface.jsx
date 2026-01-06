'use client';

import { useState, useEffect } from 'react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { DollarSign, Clock, TrendingUp, Loader2, Users, X, RefreshCw } from 'lucide-react';
import { useStaking } from '@/context/context';
import { useAccount } from 'wagmi';
import { useSearchParams } from 'next/navigation';
import { isAddress } from 'viem';
import { usePancakePrice } from '@/hooks/usePancakePrice';

const StakingInterface = () => {
  const searchParams = useSearchParams();
  const { address } = useAccount();
  const { deposit, isLoading, cctBalance, minDeposit } = useStaking();
  const [stakingAmount, setStakingAmount] = useState('');
  const [selectedPackage, setSelectedPackage] = useState('custom');
  const [selectedYears, setSelectedYears] = useState(1);
  const [showCustomInput, setShowCustomInput] = useState(true);
  const [error, setError] = useState('');
  const [txStatus, setTxStatus] = useState('');

  // Referral popup states
  const [showReferralPopup, setShowReferralPopup] = useState(false);
  const [referralAddress, setReferralAddress] = useState('');
  const [referralError, setReferralError] = useState('');

  // Live price from PancakeSwap
  const { cctAmount, pricePerToken, wbnbQuote, loading: priceLoading, error: priceError } = usePancakePrice(stakingAmount);

  // Get referrer from URL on mount (e.g., /ref/0xAddress)
  useEffect(() => {
    const refParam = searchParams.get('ref');
    if (refParam && isAddress(refParam)) {
      setReferralAddress(refParam);
    }
  }, [searchParams]);

  // Package options - UI-only suggestions (not enforced by contract)
  const packageOptions = [
    { value: 'starter', label: '$50 Package', amount: 50 },
    { value: 'pro', label: '$100 Package', amount: 100 },
    { value: 'custom', label: 'Custom Amount', amount: null },
  ];

  const handlePackageChange = (e) => {
    const selected = e.target.value;
    setSelectedPackage(selected);
    const packageOption = packageOptions.find(pkg => pkg.value === selected);

    if (selected === 'custom') {
      setShowCustomInput(true);
      setStakingAmount('');
    } else {
      setShowCustomInput(false);
      setStakingAmount(packageOption.amount.toString());
    }
    setError('');
    setTxStatus('');
  };

  const handleAmountChange = (e) => {
    const value = e.target.value;
    setStakingAmount(value);

    const numValue = parseFloat(value);
    if (value && numValue < 1) {
      setError('Minimum staking amount is $1');
    } else {
      setError('');
    }
  };

  const handleInitiateStake = () => {
    const amount = parseFloat(stakingAmount);
    if (!stakingAmount || amount < 1) {
      setError('Minimum staking amount is $1');
      return;
    }

    // Show referral popup before staking
    setShowReferralPopup(true);
  };

  const handleStakeWithReferral = async () => {
    let resolvedReferralCode = "";

    // If referral input is provided, process it
    if (referralAddress && referralAddress.trim()) {
      const input = referralAddress.trim();

      // ALWAYS Validate via API to ensure it exists and is correct
      try {
        setReferralError('');
        const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_API_URL || 'http://localhost:3001'}/api/referral/resolve/${input}`);

        if (!response.ok) {
          setReferralError('Invalid referral code or address');
          return;
        }

        const data = await response.json();

        // Check for self-referral
        if (data.walletAddress.toLowerCase() === address?.toLowerCase()) {
          setReferralError('You cannot use your own address/code');
          return;
        }

        // Use the resolved code from backend (handles both address inputs and code inputs)
        resolvedReferralCode = data.referralCode;

      } catch (error) {
        console.error('Error resolving referral code:', error);
        setReferralError('Failed to verify referral code');
        return;
      }
    }

    // Close popup and proceed with deposit
    setShowReferralPopup(false);

    const amount = parseFloat(stakingAmount);

    try {
      setTxStatus('Preparing transaction...');
      setError('');

      // Calculate CCT amount from USDT amount
      // For now, using the live price from PancakeSwap
      if (!cctAmount || priceLoading || priceError) {
        setError('Unable to fetch CCT price. Please try again.');
        return;
      }

      setTxStatus('Approving USDT tokens...');

      // Call deposit with USD amount, CCT amount, lock duration, and RESOLVED referral code
      const depositResult = await deposit(
        stakingAmount,    // USD amount (user is depositing USDT)
        cctAmount,        // CCT amount (stake amount they'll get later)
        selectedYears,    // Lock duration in years
        resolvedReferralCode // Pass the validated code
      );

      setTxStatus(`Success! Deposited $${stakingAmount} USDT for ${cctAmount} CCT stake (${selectedYears} year lock). TX: ${depositResult.txHash}`);

      // Notify backend about the deposit for tracking
      try {
        await fetch(`${process.env.NEXT_PUBLIC_BACKEND_API_URL || 'http://localhost:3001'}/api/deposits/track`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            orderId: depositResult.orderId,
            walletAddress: address,
            amount: amount,
            cctAmount: cctAmount,
            lockYears: selectedYears,
            referralCode: resolvedReferralCode, // Use resolved code
            txHash: depositResult.txHash
          })
        });
      } catch (backendError) {
        console.error('Backend tracking error:', backendError);
        // Don't fail the transaction if backend fails
      }

      setTimeout(() => {
        setStakingAmount('');
        setTxStatus('');
        setSelectedPackage('custom');
        setSelectedYears(1);
        setShowCustomInput(true);
      }, 5000);

    } catch (err) {
      console.error('Deposit error:', err);
      setError(err.message || 'Transaction failed. Please try again.');
      setTxStatus('');
    }
  };

  const getReferralRequirement = (amount) => {
    if (!amount || amount < 1) return 'N/A';
    if (amount >= 1000) return 'No referrals required';
    if (amount >= 100) return '5 direct referrals';
    return '10 direct referrals';
  };

  return (
    <>
      <Card className="p-6 space-y-6">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg gradient-primary flex items-center justify-center">
            <DollarSign className="h-6 w-6 text-white" />
          </div>
          <h2 className="text-2xl font-bold">Stake Your Tokens</h2>
        </div>

        {/* Package Selector */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-muted-foreground">
            Select Package
          </label>
          <select
            value={selectedPackage}
            onChange={handlePackageChange}
            className="w-full p-3 border rounded-lg bg-background"
            disabled={isLoading}
          >
            {packageOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        {/* Amount Input */}
        {showCustomInput && (
          <div className="space-y-2">
            <label className="text-sm font-medium text-muted-foreground">
              Custom Amount (USD)
            </label>
            <div className="relative">
              <input
                type="number"
                value={stakingAmount}
                onChange={handleAmountChange}
                placeholder="Enter amount (minimum $50)"
                min="50"
                step="1"
                disabled={isLoading}
                className={`w-full p-3 border rounded-lg bg-background pl-8 ${error ? 'border-red-500 bg-red-50' : ''
                  }`}
              />
              <span className="absolute left-3 top-3.5 text-muted-foreground">$</span>
            </div>
            {error && (
              <p className="text-red-500 text-sm mt-1 p-2 bg-red-50 rounded border border-red-200">
                {error}
              </p>
            )}
          </div>
        )}

        {!showCustomInput && (
          <div className="p-4 bg-muted rounded-lg">
            <p className="text-sm text-muted-foreground">Selected Amount:</p>
            <p className="text-2xl font-bold gradient-text">${stakingAmount}</p>
          </div>
        )}

        {/* Year Selection */}
        <div className="space-y-3">
          <label className="text-sm font-medium text-muted-foreground">
            Lock Period
          </label>
          <div className="grid grid-cols-5 gap-2">
            {[1, 2, 3, 4, 5].map((year) => (
              <Button
                key={year}
                variant={selectedYears === year ? "default" : "outline"}
                onClick={() => setSelectedYears(year)}
                disabled={isLoading}
                className={`h-16 flex flex-col items-center justify-center gap-1 ${selectedYears === year ? 'gradient-primary text-white border-0' : ''
                  }`}
              >
                <span className="text-lg font-bold">{year}</span>
                <span className="text-xs">{year === 1 ? 'Year' : 'Years'}</span>
              </Button>
            ))}
          </div>
        </div>

        {/* Live PancakeSwap Price */}
        {stakingAmount && parseFloat(stakingAmount) >= 1 && (
          <Card className="p-4 bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-950 dark:to-cyan-950 border-2  border-blue-200">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-blue-900 dark:text-blue-100 flex items-center gap-2">
                <RefreshCw className={`h-4 w-4 ${priceLoading ? 'animate-spin' : ''}`} />
                Live PancakeSwap Conversion
              </h3>
              <span className="text-xs text-blue-600 dark:text-blue-300">Real-time</span>
            </div>

            {priceLoading ? (
              <div className="flex items-center gap-2 text-blue-700">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm">Fetching price...</span>
              </div>
            ) : priceError ? (
              <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg">
                <p className="text-sm text-orange-700">⚠️ {priceError}</p>
                <p className="text-xs text-orange-600 mt-1">Low liquidity detected. Contact admin for manual distribution.</p>
              </div>
            ) : cctAmount ? (
              <div className="space-y-3">
                <div className="p-3 bg-white dark:bg-gray-900 rounded-lg border border-blue-200">
                  <p className="text-xs text-blue-700 dark:text-blue-300 mb-1">You will receive (after 10% fee):</p>
                  <p className="text-2xl font-bold text-blue-900 dark:text-blue-100">
                    ≈ {parseFloat(cctAmount) * 0.9 < 0.0001
                      ? (parseFloat(cctAmount) * 0.9).toExponential(4)
                      : (parseFloat(cctAmount) * 0.9).toFixed(4)} CCT
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded">
                    <p className="text-blue-700 dark:text-blue-300">Price (1 CCT)</p>
                    <p className="font-semibold text-blue-900 dark:text-blue-100">
                      ~${pricePerToken ? pricePerToken.toFixed(6) : '0.00'}
                    </p>
                  </div>
                  <div className="p-2 bg-cyan-100 dark:bg-cyan-900 rounded">
                    <p className="text-cyan-700 dark:text-cyan-300">Before Fee</p>
                    <p className="font-semibold text-cyan-900 dark:text-cyan-100">
                      {parseFloat(cctAmount).toFixed(2)} CCT
                    </p>
                  </div>
                </div>

                <p className="text-xs text-center text-blue-600 dark:text-blue-400">
                  🔄 Price updates automatically from PancakeSwap
                </p>
              </div>
            ) : wbnbQuote ? (
              <div className="space-y-2">
                <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-sm font-semibold text-yellow-800">⚠️ CCT Liquidity Not Found</p>
                  <p className="text-xs text-yellow-700 mt-1">System is working, but CCT pool is empty.</p>
                </div>
                <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
                  <p className="text-xs text-gray-500 mb-1">System Check (WBNB Reference):</p>
                  <p className="font-mono text-sm text-gray-700">
                    Input: {stakingAmount} USDT<br />
                    Output: {parseFloat(wbnbQuote).toFixed(6)} WBNB
                  </p>
                  <p className="text-[10px] text-green-600 mt-1">✅ RPC & Router Connected Successfully</p>
                </div>
              </div>
            ) : null}
          </Card>
        )}

        {/* Staking Details */}
        {stakingAmount && parseFloat(stakingAmount) >= 1 && (
          <div className="p-4 bg-primary/5 rounded-lg border border-primary/20">
            <h3 className="font-semibold text-primary mb-3">Staking Summary</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Stake Amount:</p>
                <p className="font-semibold">${stakingAmount}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Lock Period:</p>
                <p className="font-semibold">{selectedYears} {selectedYears === 1 ? 'Year' : 'Years'}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Staking Fee (10%):</p>
                <p className="font-semibold text-red-600">-${(parseFloat(stakingAmount) * 0.1).toFixed(2)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Net Staked:</p>
                <p className="font-semibold text-primary">${(parseFloat(stakingAmount) * 0.9).toFixed(2)}</p>
              </div>
              <div className="col-span-2">
                <p className="text-muted-foreground">Referral Requirement:</p>
                <p className="font-semibold">{getReferralRequirement(parseFloat(stakingAmount))}</p>
              </div>
            </div>
          </div>
        )}

        {/* Transaction Status */}
        {txStatus && (
          <div className={`p-3 rounded-lg border ${txStatus.includes('Success') ? 'bg-green-50 border-green-200' : 'bg-blue-50 border-blue-200'
            }`}>
            <p className={`text-sm ${txStatus.includes('Success') ? 'text-green-700' : 'text-blue-700'
              }`}>
              {txStatus}
            </p>
          </div>
        )}

        {/* Stake Button */}
        <Button
          onClick={handleInitiateStake}
          disabled={!stakingAmount || parseFloat(stakingAmount) < 1 || !!error || isLoading}
          className="w-full gradient-primary text-white border-0 hover:opacity-90 transition-opacity h-12 text-lg font-semibold"
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Processing...
            </>
          ) : (
            <>
              <TrendingUp className="mr-2 h-5 w-5" />
              Stake Tokens
            </>
          )}
        </Button>
      </Card>

      {/* Referral Popup Modal */}
      {showReferralPopup && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="h-6 w-6 text-primary" />
                <h3 className="text-xl font-bold">Referral Code</h3>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowReferralPopup(false)}
                className="h-8 w-8 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <p className="text-sm text-muted-foreground">
              Do you have a referral code or address? Enter it below to help your referrer earn rewards!
            </p>

            <div className="space-y-2">
              <label className="text-sm font-medium">
                Referral Code or Wallet Address (Optional)
              </label>
              <input
                type="text"
                value={referralAddress}
                onChange={(e) => {
                  setReferralAddress(e.target.value);
                  setReferralError('');
                }}
                placeholder="e.g., 728D24 or 0x..."
                className={`w-full p-3 border rounded-lg bg-background text-sm font-mono ${referralError ? 'border-red-500' : ''
                  }`}
              />
              {referralError && (
                <p className="text-red-500 text-xs">{referralError}</p>
              )}
              <p className="text-xs text-muted-foreground">
                Enter a 6-character referral code or a full wallet address
              </p>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-xs text-blue-700">
                ℹ️ Your referrer will earn rewards when you stake. This helps build the community!
              </p>
            </div>

            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => {
                  setReferralAddress('');
                  setReferralError('');
                  handleStakeWithReferral();
                }}
                className="flex-1"
              >
                Skip
              </Button>
              <Button
                onClick={handleStakeWithReferral}
                className="flex-1 gradient-primary text-white"
              >
                Continue
              </Button>
            </div>
          </Card>
        </div>
      )}
    </>
  );
};

export default StakingInterface;