import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { 
  User, 
  Wallet, 
  Clock, 
  Users, 
  TrendingUp, 
  Copy, 
  CheckCircle2,
  Calendar,
  DollarSign
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

const Dashboard = () => {
  const [copied, setCopied] = useState(false);
  
  const handleCopyReferral = () => {
    navigator.clipboard.writeText("https://stacking.app/ref/user123");
    setCopied(true);
    toast.success("Referral link copied!");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      
      <main className="flex-1 py-12 bg-muted/30">
        <div className="container max-w-7xl space-y-8">
          {/* Page Header */}
          <div className="space-y-2">
            <h1 className="text-4xl font-bold">Dashboard</h1>
            <p className="text-muted-foreground">Monitor your staking activity and rewards</p>
          </div>

          {/* User Profile Card */}
          <Card className="p-6 gradient-border">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="h-16 w-16 rounded-full gradient-primary flex items-center justify-center">
                  <User className="h-8 w-8 text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold">John Doe</h2>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Wallet className="h-4 w-4" />
                    <code className="text-xs">0x742d...9a3f</code>
                  </div>
                </div>
              </div>
              <Badge className="gradient-primary text-white border-0 px-6 py-2 text-sm">
                Pro Package
              </Badge>
            </div>
          </Card>

          {/* Stats Grid */}
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="p-6 hover-scale">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                  <DollarSign className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Amount Staked</p>
                  <p className="text-2xl font-bold">$100</p>
                </div>
              </div>
            </Card>

            <Card className="p-6 hover-scale">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-lg bg-secondary/10 flex items-center justify-center">
                  <Calendar className="h-6 w-6 text-secondary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Lock Period</p>
                  <p className="text-2xl font-bold">3 Years</p>
                </div>
              </div>
            </Card>

            <Card className="p-6 hover-scale">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Clock className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Time Remaining</p>
                  <p className="text-2xl font-bold">2y 8m</p>
                </div>
              </div>
            </Card>

            <Card className="p-6 hover-scale">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-lg bg-secondary/10 flex items-center justify-center">
                  <TrendingUp className="h-6 w-6 text-secondary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Rewards</p>
                  <p className="text-2xl font-bold">$15.50</p>
                </div>
              </div>
            </Card>
          </div>

          {/* Staking Summary & Referral Stats */}
          <div className="grid lg:grid-cols-2 gap-6">
            <Card className="p-6 space-y-6">
              <h3 className="text-xl font-semibold flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-primary" />
                Staking Summary
              </h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center pb-3 border-b">
                  <span className="text-muted-foreground">Package Type</span>
                  <span className="font-semibold">Pro Package ($100)</span>
                </div>
                <div className="flex justify-between items-center pb-3 border-b">
                  <span className="text-muted-foreground">Start Date</span>
                  <span className="font-semibold">Jan 15, 2024</span>
                </div>
                <div className="flex justify-between items-center pb-3 border-b">
                  <span className="text-muted-foreground">End Date</span>
                  <span className="font-semibold">Jan 15, 2027</span>
                </div>
                <div className="flex justify-between items-center pb-3 border-b">
                  <span className="text-muted-foreground">Staking Fee</span>
                  <span className="font-semibold">$10 (10%)</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Net Staked</span>
                  <span className="font-semibold text-primary">$90</span>
                </div>
              </div>
            </Card>

            <Card className="p-6 space-y-6">
              <h3 className="text-xl font-semibold flex items-center gap-2">
                <Users className="h-5 w-5 text-secondary" />
                Referral Stats
              </h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center pb-3 border-b">
                  <span className="text-muted-foreground">Total Referrals</span>
                  <span className="font-semibold text-2xl">3 / 5</span>
                </div>
                <div className="flex justify-between items-center pb-3 border-b">
                  <span className="text-muted-foreground">Qualification Status</span>
                  <Badge variant="outline" className="border-orange-500 text-orange-500">
                    In Progress
                  </Badge>
                </div>
                <div className="space-y-2">
                  <label className="text-sm text-muted-foreground">Your Referral Link</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value="https://stacking.app/ref/user123"
                      readOnly
                      className="flex-1 px-3 py-2 rounded-lg border bg-muted text-sm"
                    />
                    <Button
                      size="sm"
                      onClick={handleCopyReferral}
                      className="gradient-primary text-white border-0"
                    >
                      {copied ? <CheckCircle2 className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">
                  Refer <strong>2 more users</strong> to qualify for the reward pool
                </p>
              </div>
            </Card>
          </div>

          {/* Reward Pool Status */}
          <Card className="p-6 space-y-6">
            <h3 className="text-xl font-semibold flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              Reward Pool Status
            </h3>
            <div className="grid md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Qualification Status</p>
                <Badge variant="outline" className="border-orange-500 text-orange-500 px-4 py-1">
                  Not Yet Qualified
                </Badge>
                <p className="text-xs text-muted-foreground">Complete 2 more referrals</p>
              </div>
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Reward Earned</p>
                <p className="text-3xl font-bold gradient-text">$15.50</p>
                <p className="text-xs text-muted-foreground">Projected reward if qualified</p>
              </div>
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Next Distribution</p>
                <p className="text-2xl font-semibold">7 days</p>
                <p className="text-xs text-muted-foreground">March 1, 2025</p>
              </div>
            </div>
          </Card>

          {/* Transaction History */}
          <Card className="p-6 space-y-6">
            <h3 className="text-xl font-semibold">Transaction History</h3>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Fee Deducted</TableHead>
                  <TableHead>Reward Earned</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell className="font-medium">Stake</TableCell>
                  <TableCell>$100</TableCell>
                  <TableCell className="text-destructive">-$10</TableCell>
                  <TableCell>-</TableCell>
                  <TableCell>Jan 15, 2024</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">Reward</TableCell>
                  <TableCell>-</TableCell>
                  <TableCell>-</TableCell>
                  <TableCell className="text-secondary">+$8.50</TableCell>
                  <TableCell>Feb 1, 2024</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">Reward</TableCell>
                  <TableCell>-</TableCell>
                  <TableCell>-</TableCell>
                  <TableCell className="text-secondary">+$7.00</TableCell>
                  <TableCell>Feb 15, 2024</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </Card>
        </div>
      </main>
      
      <Footer />
    </div>
  );
};

export default Dashboard;
