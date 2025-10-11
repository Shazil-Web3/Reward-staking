'use client';

import { useState } from 'react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { DollarSign, Clock, TrendingUp } from 'lucide-react';

const StakingInterface = () => {
  const [stakingAmount, setStakingAmount] = useState('');
  const [selectedPackage, setSelectedPackage] = useState('custom');
  const [selectedYears, setSelectedYears] = useState(1);
  const [showCustomInput, setShowCustomInput] = useState(true);
  const [error, setError] = useState('');

  const packageOptions = [
    { value: 'starter', label: 'Starter Package ($50)', amount: 50 },
    { value: 'pro', label: 'Pro Package ($100)', amount: 100 },
    { value: 'elite', label: 'Elite Package ($1000)', amount: 1000 },
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
  };

  const handleAmountChange = (e) => {
    const value = e.target.value;
    setStakingAmount(value);
    
    const numValue = parseFloat(value);
    if (value && numValue < 50) {
      setError('Minimum staking amount is $50');
    } else {
      setError('');
    }
  };

  const handleStake = () => {
    const amount = parseFloat(stakingAmount);
    if (!stakingAmount || amount < 50) {
      setError('Minimum staking amount is $50');
      return;
    }
    
    // TODO: Implement actual staking transaction
    console.log('Staking:', {
      amount: amount,
      years: selectedYears,
      package: selectedPackage,
    });
    
    alert(`Staking $${amount} for ${selectedYears} year(s). Transaction would be initiated here.`);
  };

  const getReferralRequirement = (amount) => {
    if (!amount || amount < 50) return 'N/A';
    if (amount >= 1000) return 'No referrals required';
    if (amount >= 100) return '5 direct referrals';
    return '10 direct referrals';
  };

  return (
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
              className={`w-full p-3 border rounded-lg bg-background pl-8 ${
                error ? 'border-red-500 bg-red-50' : ''
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
              className={`h-16 flex flex-col items-center justify-center gap-1 ${
                selectedYears === year ? 'gradient-primary text-white border-0' : ''
              }`}
            >
              <span className="text-lg font-bold">{year}</span>
              <span className="text-xs">{year === 1 ? 'Year' : 'Years'}</span>
            </Button>
          ))}
        </div>
      </div>

      {/* Staking Details */}
      {stakingAmount && parseFloat(stakingAmount) >= 50 && (
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

      {/* Stake Button */}
      <Button
        onClick={handleStake}
        disabled={!stakingAmount || parseFloat(stakingAmount) < 50 || !!error}
        className="w-full gradient-primary text-white border-0 hover:opacity-90 transition-opacity h-12 text-lg font-semibold"
      >
        <TrendingUp className="mr-2 h-5 w-5" />
        Stake Tokens
      </Button>
    </Card>
  );
};

export default StakingInterface;