'use client';

import { Card } from '@/app/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/app/components/ui/table';
import { Badge } from '@/app/components/ui/badge';
import { Search } from 'lucide-react';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

const UserTable = () => {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        try {
            const { data, error } = await supabase
                .from('users')
                .select('*')
                .order('created_at', { ascending: false });

            if (data) setUsers(data);
        } catch (error) {
            console.error("Error fetching users:", error);
        } finally {
            setLoading(false);
        }
    };

    const filteredUsers = users.filter(user =>
        user.wallet_address?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <Card className="col-span-4 p-6">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h3 className="font-semibold text-lg">Platform Users</h3>
                    <p className="text-sm text-muted-foreground">Manage and monitor user staking activity</p>
                </div>
                <div className="relative">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <input
                        placeholder="Search wallet..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-9 h-10 w-[250px] rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    />
                </div>
            </div>

            <div className="rounded-md border">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Wallet Address</TableHead>
                            <TableHead>Referral Code</TableHead>
                            <TableHead>Total Staked</TableHead>
                            <TableHead>Direct Referrals</TableHead>
                            <TableHead>Joined</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            <TableRow>
                                <TableCell colSpan={5} className="text-center py-8">Loading users...</TableCell>
                            </TableRow>
                        ) : filteredUsers.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={5} className="text-center py-8">No users found.</TableCell>
                            </TableRow>
                        ) : (
                            filteredUsers.map((user, i) => (
                                <TableRow key={i}>
                                    <TableCell className="font-mono text-xs md:text-sm">
                                        {user.wallet_address}
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant="outline" className="font-mono">
                                            {user.referral_code}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="font-medium">
                                        ${user.total_staked?.toLocaleString()}
                                    </TableCell>
                                    <TableCell>
                                        {user.direct_referrals_count}
                                    </TableCell>
                                    <TableCell className="text-muted-foreground text-xs">
                                        {new Date(user.created_at).toLocaleDateString()}
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>
        </Card>
    );
};

export default UserTable;
