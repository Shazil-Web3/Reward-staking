'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { isAddress } from 'viem';

export default function ReferralRedirect({ params }) {
  const router = useRouter();

  useEffect(() => {
    // Extract the address from the route params
    const referralAddress = params.address;

    // Validate the address
    if (referralAddress && isAddress(referralAddress)) {
      // Store in sessionStorage so it persists during navigation
      sessionStorage.setItem('referralAddress', referralAddress);
      
      // Redirect to dashboard with the referral address as a query param
      router.push(`/dashboard?ref=${referralAddress}`);
    } else {
      // Invalid address, redirect to home
      console.error('Invalid referral address:', referralAddress);
      router.push('/');
    }
  }, [params, router]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center space-y-4">
        <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
        <p className="text-lg text-muted-foreground">Processing referral link...</p>
      </div>
    </div>
  );
}
