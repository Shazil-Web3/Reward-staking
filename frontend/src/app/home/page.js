import { Button } from "@/app/components/ui/button";
import { Card } from "@/app/components/ui/card";
import PackageCard from "@/app/components/PackageCard";
import { ArrowRight, Lock, Users, TrendingUp, Coins, Calendar } from "lucide-react";
import Link from "next/link";

const Home = () => {
  return (
    <div>
        {/* Hero Section */}
        <section className="relative overflow-hidden py-20 md:py-32 min-h-screen flex items-center">
          {/* Gradient Background */}
          <div className="absolute inset-0 gradient-hero" />
          
          {/* Background Orbs */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="orb orb-1 w-96 h-96 top-10 left-10" />
            <div className="orb orb-2 w-80 h-80 bottom-20 right-10" />
            <div className="orb orb-3 w-64 h-64 top-1/2 left-1/3" />
            <div className="orb orb-1 w-72 h-72 bottom-10 left-1/2" />
            <div className="orb orb-2 w-56 h-56 top-20 right-1/4" />
          </div>

          <div className="container relative z-10">
            <div className="max-w-5xl mx-auto text-center space-y-12 animate-fade-in">
              <div className="space-y-6">
                <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-8xl font-bold leading-tight px-2">
                  Welcome to <span className="gradient-text">CryptoCommunity</span>
                </h1>
                <p className="text-lg sm:text-xl md:text-2xl lg:text-3xl text-muted-foreground font-medium px-4">
                  The Smart Token Holding System
                </p>
                <p className="text-sm sm:text-base md:text-lg text-muted-foreground/80 max-w-3xl mx-auto px-4">
                  Lock your tokens, qualify through referrals, and earn from the reward pool. 
                  Join thousands of users building wealth through our transparent staking ecosystem.
                </p>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-6 justify-center pt-8">
                <Link href="/dashboard">
                  <Button
                    size="lg"
                    className="gradient-primary text-white border-0 text-xl px-12 py-6 h-auto hover:scale-105 transition-transform w-full sm:w-auto"
                  >
                    Start Trading <ArrowRight className="ml-3 h-6 w-6" />
                  </Button>
                </Link>
                <Link href="/about">
                  <Button
                    size="lg"
                    variant="outline"
                    className="text-xl px-12 py-6 h-auto w-full sm:w-auto hover:bg-primary hover:text-white hover:border-primary transition-all"
                  >
                    About Us
                  </Button>
                </Link>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pt-16">
                <div className="text-center space-y-2">
                  <div className="text-4xl font-bold gradient-text">$2.5M+</div>
                  <div className="text-muted-foreground">Total Staked</div>
                </div>
                <div className="text-center space-y-2">
                  <div className="text-4xl font-bold gradient-text">15K+</div>
                  <div className="text-muted-foreground">Active Users</div>
                </div>
                <div className="text-center space-y-2">
                  <div className="text-4xl font-bold gradient-text">98%</div>
                  <div className="text-muted-foreground">Success Rate</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* About Staking Concept */}
        <section className="py-20 bg-muted/30">
          <div className="container">
            <div className="max-w-4xl mx-auto space-y-8">
              <div className="text-center space-y-4">
                <h2 className="text-4xl md:text-5xl font-bold">What is CryptoCommunity?</h2>
                <p className="text-xl text-muted-foreground">
                  A transparent holding system, not a traditional yield-generating stake
                </p>
              </div>

              <div className="grid md:grid-cols-3 gap-6 pt-8">
                {[
                  {
                    icon: <Lock className="h-8 w-8 text-white" />,
                    title: "Lock Your Tokens",
                    desc: "Purchase a staking package and lock your tokens for 1–5 years",
                  },
                  {
                    icon: <Users className="h-8 w-8 text-white" />,
                    title: "Build Your Network",
                    desc: "Meet referral requirements to qualify for the reward pool",
                  },
                  {
                    icon: <TrendingUp className="h-8 w-8 text-white" />,
                    title: "Earn Rewards",
                    desc: "After the lock period, withdraw your tokens plus qualified rewards",
                  },
                ].map((item, i) => (
                  <Card key={i} className="p-6 text-center space-y-4 transition-transform hover:scale-105">
                    <div className="mx-auto w-16 h-16 rounded-full gradient-primary flex items-center justify-center">
                      {item.icon}
                    </div>
                    <h3 className="text-xl font-semibold">{item.title}</h3>
                    <p className="text-muted-foreground">{item.desc}</p>
                  </Card>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Staking Packages */}
        <section className="py-20 relative overflow-hidden">
          {/* Section-specific orbs */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="orb orb-1 w-96 h-96 top-20 left-20" />
            <div className="orb orb-2 w-72 h-72 bottom-20 right-20" />
            <div className="orb orb-3 w-56 h-56 top-1/2 right-1/4" />
          </div>
          
          <div className="container relative z-10">
            <div className="text-center space-y-4 mb-12">
              <h2 className="text-4xl md:text-5xl font-bold">Choose Your Package</h2>
              <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                Select the package that fits your investment goals and start earning today
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-7xl mx-auto">
              <PackageCard
                title="Starter Package"
                amount="$50"
                fee="10%"
                lockPeriod="1 to 5 years"
                referralRequirement="10 direct referrals"
              />
              <PackageCard
                title="Pro Package"
                amount="$100"
                fee="10%"
                lockPeriod="1 to 5 years"
                referralRequirement="5 direct referrals"
                isPopular={true}
              />
{/* <PackageCard
                title="Elite Package"
                amount="$1000"
                fee="10%"
                lockPeriod="1 to 5 years"
                referralRequirement="No referrals required"
              /> */}
              <PackageCard
                title="Custom Package"
                amount="Any amount above $50"
                fee="10%"
                lockPeriod="1 to 5 years"
                referralRequirement="Varies by stake amount"
              />
            </div>
          </div>
        </section>

        {/* Referral System */}
        <section className="py-20 relative overflow-hidden">
          {/* Section-specific orbs */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="orb orb-1 w-72 h-72 top-10 left-1/4" />
            <div className="orb orb-2 w-64 h-64 bottom-10 right-1/4" />
            <div className="orb orb-3 w-56 h-56 top-1/2 right-1/3" />
          </div>
          
          <div className="container relative z-10">
            <div className="max-w-4xl mx-auto space-y-12">
              <div className="text-center space-y-4">
                <h2 className="text-4xl md:text-5xl font-bold">Referral System</h2>
                <p className="text-xl text-muted-foreground">
                  Build your network and unlock rewards through our referral program
                </p>
              </div>

              <div className="grid md:grid-cols-2 gap-8">
                <Card className="p-8 space-y-6 hover-scale transition-all duration-300 border-2 border-transparent hover:border-primary/20 hover:shadow-glow">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-full gradient-primary flex items-center justify-center shadow-lg">
                      <Users className="h-8 w-8 text-white drop-shadow-sm" />
                    </div>
                    <h3 className="text-2xl font-semibold">How Referrals Work</h3>
                  </div>
                  <div className="space-y-4 text-muted-foreground">
                    <div className="flex items-start gap-3">
                      <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0" />
                      <p>Share your unique referral link with friends and family</p>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0" />
                      <p>When they purchase a staking package, you both benefit</p>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0" />
                      <p>Meet referral requirements to qualify for reward pool</p>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0" />
                      <p>Track your referrals in your dashboard</p>
                    </div>
                  </div>
                </Card>

                <Card className="p-8 space-y-6 hover-scale transition-all duration-300 border-2 border-transparent hover:border-secondary/20 hover:shadow-glow">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-full gradient-primary flex items-center justify-center shadow-lg">
                      <TrendingUp className="h-8 w-8 text-white drop-shadow-sm" />
                    </div>
                    <h3 className="text-2xl font-semibold">Referral Benefits</h3>
                  </div>
                  <div className="space-y-4 text-muted-foreground">
                    <div className="flex items-start gap-3">
                      <div className="w-2 h-2 bg-secondary rounded-full mt-2 flex-shrink-0" />
                      <p>Reduced referral requirements for higher packages</p>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="w-2 h-2 bg-secondary rounded-full mt-2 flex-shrink-0" />
                      <p>Early access to new features and packages</p>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="w-2 h-2 bg-secondary rounded-full mt-2 flex-shrink-0" />
                      <p>Priority support for you and your referrals</p>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="w-2 h-2 bg-secondary rounded-full mt-2 flex-shrink-0" />
                      <p>Bonus rewards for top referrers</p>
                    </div>
                  </div>
                </Card>
              </div>
            </div>
          </div>
        </section>

        {/* Reward Pool Explanation */}
        <section className="py-20 gradient-secondary">
          <div className="container">
            <div className="max-w-4xl mx-auto space-y-12">
              <div className="text-center space-y-4">
                <h2 className="text-4xl md:text-5xl font-bold">How Rewards Work</h2>
                <p className="text-xl text-muted-foreground">
                  A transparent and fair reward distribution system
                </p>
              </div>

              <div className="grid md:grid-cols-2 gap-8">
                {[
                  {
                    step: 1,
                    title: "Staking Fees Collected",
                    color: "primary",
                    desc: "10% fee from every package purchase goes into the reward pool wallet",
                  },
                  {
                    step: 2,
                    title: "Token Supply Added",
                    color: "secondary",
                    desc: "An equal 10% value in tokens from total supply is added by the project team",
                  },
                  {
                    step: 3,
                    title: "Total Pool Formed",
                    color: "primary",
                    desc: "Combined fees and tokens create the total reward pool balance",
                  },
                  {
                    step: 4,
                    title: "Equal Distribution",
                    color: "secondary",
                    desc: "Qualified users share the reward pool equally based on referral completion",
                  },
                ].map((step, i) => (
                  <Card key={i} className="p-8 space-y-4">
                    <div className="flex items-center gap-4">
                      <div
                        className={`w-12 h-12 rounded-full bg-${step.color}/10 flex items-center justify-center text-${step.color} font-bold text-xl`}
                      >
                        {step.step}
                      </div>
                      <h3 className="text-xl font-semibold">{step.title}</h3>
                    </div>
                    <p className="text-muted-foreground pl-16">{step.desc}</p>
                  </Card>
                ))}
              </div>

              <Card className="p-8 bg-gradient-to-r from-primary/5 to-secondary/5 border-2">
                <h3 className="text-2xl font-bold mb-4">Example Calculation</h3>
                <div className="space-y-3 text-muted-foreground">
                  <p>
                    ✓ <strong>15 qualified users</strong> contribute $10 fee each ={" "}
                    <strong>$150</strong>
                  </p>
                  <p>✓ Project adds equal <strong>$150</strong> worth of tokens from supply</p>
                  <p className="text-lg font-semibold text-foreground pt-2">
                    = Total Reward Pool:{" "}
                    <span className="gradient-text text-2xl">$300</span> distributed equally
                  </p>
                  <p className="text-primary font-semibold">
                    Each qualified user receives: $20
                  </p>
                </div>
              </Card>
            </div>
          </div>
        </section>

        {/* Tokenomics */}
        <section className="py-20 relative overflow-hidden">
          {/* Section-specific orbs */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="orb orb-2 w-88 h-88 top-20 right-20" />
            <div className="orb orb-1 w-64 h-64 bottom-20 left-20" />
            <div className="orb orb-3 w-48 h-48 top-1/2 left-1/2" />
            <div className="orb orb-1 w-40 h-40 top-1/4 right-1/3" />
          </div>
          
          <div className="container relative z-10">
            <div className="max-w-4xl mx-auto space-y-8">
              <div className="text-center space-y-4">
                <h2 className="text-4xl md:text-5xl font-bold">Tokenomics</h2>
                <p className="text-xl text-muted-foreground">
                  Transparent and sustainable token distribution
                </p>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <Card className="p-8 space-y-4 transition-transform hover:scale-105">
                  <Coins className="h-12 w-12 text-primary" />
                  <h3 className="text-2xl font-semibold">Total Supply</h3>
                  <p className="text-4xl font-bold gradient-text">100 Trillion</p>
                  <p className="text-muted-foreground">Total token supply</p>
                </Card>

                <Card className="p-8 space-y-4 transition-transform hover:scale-105">
                  <TrendingUp className="h-12 w-12 text-secondary" />
                  <h3 className="text-2xl font-semibold">Market Circulation</h3>
                  <p className="text-4xl font-bold gradient-text">10 Billion</p>
                  <p className="text-muted-foreground">Listed on PancakeSwap</p>
                </Card>

                <Card className="p-8 space-y-4 transition-transform hover:scale-105 md:col-span-2">
                  <Lock className="h-12 w-12 text-primary" />
                  <h3 className="text-2xl font-semibold">Reward Pool Allocation</h3>
                  <p className="text-4xl font-bold gradient-text">20% Bonus</p>
                  <p className="text-muted-foreground">
                    10% from staking fees + 10% from total supply = transparent reward system
                  </p>
                </Card>
              </div>
            </div>
          </div>
        </section>

        {/* Staking Time Period */}
        <section className="py-20 bg-muted/30">
          <div className="container">
            <div className="max-w-4xl mx-auto space-y-8">
              <div className="text-center space-y-4">
                <Calendar className="h-16 w-16 mx-auto text-primary" />
                <h2 className="text-4xl md:text-5xl font-bold">Choose Your Lock Period</h2>
                <p className="text-xl text-muted-foreground">
                  Select from 1 to 5 years staking duration
                </p>
              </div>

              <div className="grid grid-cols-5 gap-4">
                {[1, 2, 3, 4, 5].map((year) => (
                  <Button
                    key={year}
                    variant="outline"
                    className="h-24 flex flex-col items-center justify-center gap-2 hover:gradient-primary hover:text-white hover:border-transparent transition-all"
                  >
                    <span className="text-3xl font-bold">{year}</span>
                    <span className="text-sm">{year === 1 ? "Year" : "Years"}</span>
                  </Button>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="py-20 gradient-primary text-white">
          <div className="container">
            <div className="max-w-4xl mx-auto text-center space-y-8">
              <h2 className="text-4xl md:text-5xl font-bold">
                Start Your CryptoCommunity Journey Today
              </h2>
              <p className="text-xl opacity-90">
                Choose your package, refer users, and unlock rewards
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
                <Link href="/dashboard">
                  <Button size="lg" variant="secondary" className="text-lg px-8 w-full sm:w-auto">
                    Start Trading
                  </Button>
                </Link>
                <Link href="/about">
                  <Button
                    size="lg"
                    variant="outline"
                    className="text-lg px-8 border-white text-black bg-white hover:bg-primary hover:text-white hover:border-primary w-full sm:w-auto"
                  >
                    About Us
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </section>
    </div>
  );
};

export default Home;
