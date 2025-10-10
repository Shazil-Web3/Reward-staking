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
  TrendingUp,
  Copy,
  CheckCircle2,
  Calendar,
  DollarSign,
} from "lucide-react";
import { useState } from "react";

const Dashboard = () => {
  const [copied, setCopied] = useState(false);

  const handleCopyReferral = () => {
    navigator.clipboard.writeText("https://staking.app/ref/user123");
    setCopied(true);
    // Simple alert instead of toast for now
    alert("Referral link copied!");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="py-12 bg-muted/30">
        <div className="container max-w-7xl space-y-8">
          {/* Page Header */}
          <div className="space-y-2">
            <h1 className="text-4xl font-bold">Dashboard</h1>
            <p className="text-muted-foreground">
              Monitor your staking activity and rewards
            </p>
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
            {[
              {
                title: "Amount Staked",
                value: "$100",
                icon: <DollarSign className="h-6 w-6 text-primary" />,
                bg: "bg-primary/10",
              },
              {
                title: "Lock Period",
                value: "3 Years",
                icon: <Calendar className="h-6 w-6 text-secondary" />,
                bg: "bg-secondary/10",
              },
              {
                title: "Time Remaining",
                value: "2y 8m",
                icon: <Clock className="h-6 w-6 text-primary" />,
                bg: "bg-primary/10",
              },
              {
                title: "Total Rewards",
                value: "$15.50",
                icon: <TrendingUp className="h-6 w-6 text-secondary" />,
                bg: "bg-secondary/10",
              },
            ].map((stat, i) => (
              <Card key={i} className="p-6 transition-transform hover:scale-105">
                <div className="flex items-center gap-4">
                  <div
                    className={`h-12 w-12 rounded-lg flex items-center justify-center ${stat.bg}`}
                  >
                    {stat.icon}
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">{stat.title}</p>
                    <p className="text-2xl font-bold">{stat.value}</p>
                  </div>
                </div>
              </Card>
            ))}
          </div>

          {/* Staking Summary & Referral Stats */}
          <div className="grid lg:grid-cols-2 gap-6">
            {/* Staking Summary */}
            <Card className="p-6 space-y-6">
              <h3 className="text-xl font-semibold flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-primary" />
                Staking Summary
              </h3>
              <div className="space-y-4">
                {[
                  { label: "Package Type", value: "Pro Package ($100)" },
                  { label: "Start Date", value: "Jan 15, 2024" },
                  { label: "End Date", value: "Jan 15, 2027" },
                  { label: "Staking Fee", value: "$10 (10%)" },
                  { label: "Net Staked", value: "$90", highlight: true },
                ].map((item, i) => (
                  <div
                    key={i}
                    className={`flex justify-between items-center ${
                      i < 4 ? "pb-3 border-b" : ""
                    }`}
                  >
                    <span className="text-muted-foreground">{item.label}</span>
                    <span
                      className={`font-semibold ${
                        item.highlight ? "text-primary" : ""
                      }`}
                    >
                      {item.value}
                    </span>
                  </div>
                ))}
              </div>
            </Card>

            {/* Referral Stats */}
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
                  <span className="text-muted-foreground">
                    Qualification Status
                  </span>
                  <Badge
                    variant="outline"
                    className="border-orange-500 text-orange-500"
                  >
                    In Progress
                  </Badge>
                </div>

                <div className="space-y-2">
                  <label className="text-sm text-muted-foreground">
                    Your Referral Link
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value="https://staking.app/ref/user123"
                      readOnly
                      className="flex-1 px-3 py-2 rounded-lg border bg-muted text-sm"
                    />
                    <Button
                      size="sm"
                      onClick={handleCopyReferral}
                      className="gradient-primary text-white border-0"
                      aria-label="Copy referral link"
                    >
                      {copied ? (
                        <CheckCircle2 className="h-4 w-4" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>

                <p className="text-sm text-muted-foreground">
                  Refer <strong>2 more users</strong> to qualify for the reward
                  pool
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
                <p className="text-sm text-muted-foreground">
                  Qualification Status
                </p>
                <Badge
                  variant="outline"
                  className="border-orange-500 text-orange-500 px-4 py-1"
                >
                  Not Yet Qualified
                </Badge>
                <p className="text-xs text-muted-foreground">
                  Complete 2 more referrals
                </p>
              </div>

              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Reward Earned</p>
                <p className="text-3xl font-bold gradient-text">$15.50</p>
                <p className="text-xs text-muted-foreground">
                  Projected reward if qualified
                </p>
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
                {[
                  {
                    type: "Stake",
                    amount: "$100",
                    fee: "-$10",
                    reward: "-",
                    date: "Jan 15, 2024",
                    feeColor: "text-destructive",
                  },
                  {
                    type: "Reward",
                    amount: "-",
                    fee: "-",
                    reward: "+$8.50",
                    date: "Feb 1, 2024",
                    rewardColor: "text-secondary",
                  },
                  {
                    type: "Reward",
                    amount: "-",
                    fee: "-",
                    reward: "+$7.00",
                    date: "Feb 15, 2024",
                    rewardColor: "text-secondary",
                  },
                ].map((tx, i) => (
                  <TableRow key={i}>
                    <TableCell className="font-medium">{tx.type}</TableCell>
                    <TableCell>{tx.amount}</TableCell>
                    <TableCell className={tx.feeColor}>{tx.fee}</TableCell>
                    <TableCell className={tx.rewardColor}>{tx.reward}</TableCell>
                    <TableCell>{tx.date}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </div>
    </div>
  );
};

export default Dashboard;
