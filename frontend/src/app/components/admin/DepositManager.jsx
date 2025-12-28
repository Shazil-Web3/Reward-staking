'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import {
    CheckCircle,
    XCircle,
    ExternalLink,
    Clock,
    Search,
    RefreshCw,
    Loader2
} from 'lucide-react';

const DepositManager = () => {
    const [deposits, setDeposits] = useState([]);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [adminNotes, setAdminNotes] = useState({});

    // Fetch deposits that are verified (by Moralis) but not yet approved (by Admin)
    const fetchPendingDeposits = async () => {
        setLoading(true);
        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_API_URL || 'http://localhost:3001'}/api/admin/deposits/pending`);
            if (res.ok) {
                const data = await res.json();
                setDeposits(data || []); // API returns the array directly or inside data object? Checking API... returns list directly.
            }
        } catch (error) {
            console.error('Error fetching deposits:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPendingDeposits();
    }, []);

    const handleApprove = async (deposit) => {
        if (!confirm(`Are you sure you want to approve deposit for $${deposit.amount}?`)) return;

        setActionLoading(deposit.order_id);
        try {
            // Calculate tokens allocated (Example: 1 USDT = 1 Token for now, or fetch price)
            // In real app, you might want to fetch live rate or input it
            const tokensAllocated = deposit.amount * 0.9; // Deduct 10% fee example or similar

            const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_API_URL || 'http://localhost:3001'}/api/admin/deposits/approve/${deposit.order_id}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    tokensAllocated: tokensAllocated,
                    adminNotes: adminNotes[deposit.order_id]
                })
            });

            if (res.ok) {
                setDeposits(prev => prev.filter(d => d.order_id !== deposit.order_id));
                alert('Deposit approved successfully!');
            } else {
                const error = await res.json();
                alert('Error: ' + (error.error || 'Failed to approve'));
            }
        } catch (error) {
            console.error(error);
            alert('Failed to approve deposit');
        } finally {
            setActionLoading(null);
        }
    };

    const filteredDeposits = deposits.filter(d =>
        d.user_address.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (d.tx_hash && d.tx_hash.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    return (
        <Card className="p-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                <div>
                    <h3 className="text-xl font-bold flex items-center gap-2">
                        <Clock className="h-5 w-5 text-primary" />
                        Pending Approvals
                    </h3>
                    <p className="text-sm text-muted-foreground">Approve verified blockchain deposits</p>
                </div>
                <div className="flex items-center gap-2">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <input
                            type="text"
                            placeholder="Search address or hash..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-9 pr-4 py-2 border rounded-lg bg-background text-sm w-64 focus:outline-none focus:ring-2 focus:ring-primary/20"
                        />
                    </div>
                    <Button variant="outline" size="sm" onClick={fetchPendingDeposits} disabled={loading}>
                        <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                    </Button>
                </div>
            </div>

            {loading ? (
                <div className="flex flex-col items-center justify-center py-20 gap-3 text-muted-foreground">
                    <Loader2 className="h-10 w-10 animate-spin" />
                    <p>Fetching pending deposits...</p>
                </div>
            ) : filteredDeposits.length === 0 ? (
                <div className="text-center py-20 border-2 border-dashed rounded-xl bg-muted/5">
                    <p className="text-muted-foreground">No deposits pending approval</p>
                </div>
            ) : (
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b text-left font-medium text-muted-foreground">
                                <th className="pb-3 pr-4">User</th>
                                <th className="pb-3 pr-4">Amount</th>
                                <th className="pb-3 pr-4">Status</th>
                                <th className="pb-3 pr-4">TX Hash</th>
                                <th className="pb-3 pr-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {filteredDeposits.map((deposit) => (
                                <tr key={deposit.order_id} className="group hover:bg-muted/30 transition-colors">
                                    <td className="py-4 pr-4">
                                        <div className="font-mono text-xs max-w-[120px] truncate" title={deposit.user_address}>
                                            {deposit.user_address}
                                        </div>
                                        <div className="text-[10px] text-muted-foreground mt-1">
                                            {new Date(deposit.created_at).toLocaleString()}
                                        </div>
                                    </td>
                                    <td className="py-4 pr-4">
                                        <span className="font-bold text-green-600">${deposit.amount}</span>
                                    </td>
                                    <td className="py-4 pr-4">
                                        <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs font-semibold">
                                            {deposit.status}
                                        </span>
                                    </td>
                                    <td className="py-4 pr-4">
                                        {deposit.tx_hash ? (
                                            <a
                                                href={`https://etherscan.io/tx/${deposit.tx_hash}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-blue-500 hover:text-blue-700 flex items-center gap-1 font-mono text-xs"
                                            >
                                                {deposit.tx_hash.substring(0, 8)}...
                                                <ExternalLink className="h-3 w-3" />
                                            </a>
                                        ) : 'N/A'}
                                    </td>
                                    <td className="py-4 text-right">
                                        <div className="flex justify-end gap-2">
                                            <Button
                                                size="sm"
                                                onClick={() => handleApprove(deposit)}
                                                className="h-8 px-3 gradient-primary text-white text-xs font-bold"
                                                disabled={actionLoading === deposit.order_id}
                                            >
                                                {actionLoading === deposit.order_id ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Approve & Stake'}
                                            </Button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </Card>
    );
};

export default DepositManager;
