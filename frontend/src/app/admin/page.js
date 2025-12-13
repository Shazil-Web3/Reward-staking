'use client';

import AdminGuard from '@/app/components/admin/AdminGuard';
import DashboardStats from '@/app/components/admin/DashboardStats';
import UserTable from '@/app/components/admin/UserTable';
import PoolManager from '@/app/components/admin/PoolManager';
import { LayoutDashboard } from 'lucide-react';

export default function AdminPage() {
  return (
    <AdminGuard>
      <div className="min-h-screen bg-muted/20 pb-20">
        {/* Admin Header */}
        <header className="bg-background border-b sticky top-0 z-50">
          <div className="container h-16 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <LayoutDashboard className="h-6 w-6 text-primary" />
              <h1 className="text-xl font-bold">Staking Admin</h1>
            </div>
            <div className="flex items-center gap-4">
               <div className="px-3 py-1 bg-primary/10 text-primary rounded-full text-xs font-medium">
                  CONNECTED: ADMIN
               </div>
            </div>
          </div>
        </header>

        <main className="container py-8 space-y-8">
          <div className="flex items-center justify-between">
            <h2 className="text-3xl font-bold tracking-tight">Overview</h2>
          </div>

          {/* Stats Grid */}
          <DashboardStats />

          {/* Main Content - Vertical Stack */}
          <div className="space-y-8">
            {/* Pool Manager - Top Section */}
            <div className="w-full">
              <PoolManager />
            </div>

            {/* User Table - Bottom Section */}
            <div className="w-full">
              <UserTable />
            </div>
          </div>
        </main>
      </div>
    </AdminGuard>
  );
}
