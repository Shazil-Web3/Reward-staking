'use client';

import { useWallet } from '@/hooks/useWallet';
import { Button } from '@/app/components/ui/button';
import { ShieldAlert, Wallet } from 'lucide-react';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useEffect, useState } from 'react';

const ADMIN_WALLET = "0x728d2415877ecc58c87f5bc3e5f759eb5ac5ab40";

const AdminGuard = ({ children }) => {
    const { address, isConnected, connect, connectors } = useWallet();
    const [isAuthorized, setIsAuthorized] = useState(false);

    useEffect(() => {
        if (isConnected && address && address.toLowerCase() === ADMIN_WALLET.toLowerCase()) {
            setIsAuthorized(true);
        } else {
            setIsAuthorized(false);
        }
    }, [address, isConnected]);

    if (!isConnected) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background p-4">
                <div className="text-center space-y-6 max-w-md w-full p-8 border rounded-xl shadow-lg bg-card">
                    <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
                        <Wallet className="h-8 w-8 text-primary" />
                    </div>
                    <h2 className="text-2xl font-bold">Admin Access Required</h2>
                    <p className="text-muted-foreground">
                        Please connect your wallet to access the admin dashboard.
                    </p>
                    <div className="flex justify-center">
                        <ConnectButton label="Connect Wallet" />
                    </div>
                </div>
            </div>
        );
    }

    if (!isAuthorized) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background p-4">
                <div className="text-center space-y-6 max-w-md w-full p-8 border rounded-xl shadow-lg bg-card border-red-200">
                    <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto">
                        <ShieldAlert className="h-8 w-8 text-red-600" />
                    </div>
                    <h2 className="text-2xl font-bold text-red-600">Access Denied</h2>
                    <p className="text-muted-foreground">
                        The connected wallet is not authorized to access this area.
                    </p>
                    <div className="p-3 bg-muted rounded-lg font-mono text-xs break-all">
                        Connected: {address}
                    </div>
                    <Button
                        variant="outline"
                        onClick={() => window.location.href = '/'}
                    >
                        Return to Home
                    </Button>
                </div>
            </div>
        );
    }

    return <>{children}</>;
};

export default AdminGuard;
