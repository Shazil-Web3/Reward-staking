import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Card } from "@/components/ui/card";
import { Target, Eye, TrendingUp, Users, Shield, Rocket, Star } from "lucide-react";

const About = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      
      <main className="flex-1">
        {/* Hero Section */}
        <section className="py-20 gradient-secondary">
          <div className="container max-w-4xl mx-auto text-center space-y-6">
            <h1 className="text-5xl md:text-6xl font-bold">About Stacking</h1>
            <p className="text-xl text-muted-foreground">
              Building the future of transparent token holding ecosystems
            </p>
          </div>
        </section>

        {/* Project Overview */}
        <section className="py-20">
          <div className="container max-w-4xl mx-auto space-y-8">
            <div className="text-center space-y-4">
              <h2 className="text-4xl font-bold">Project Overview</h2>
              <p className="text-xl text-muted-foreground leading-relaxed">
                Stacking is a transparent and secure token holding ecosystem built to encourage 
                long-term holding through structured staking packages and a fair reward distribution system.
              </p>
            </div>
            
            <Card className="p-8 md:p-12 space-y-6 text-lg leading-relaxed">
              <p>
                We believe in creating a sustainable crypto economy where holders are rewarded for their 
                loyalty and commitment. Unlike traditional staking platforms, Stacking focuses on 
                transparent lock mechanisms and community-driven rewards.
              </p>
              <p>
                Our platform combines the security of time-locked holdings with the power of network 
                effects through our referral system, ensuring that early adopters and active community 
                members are fairly compensated.
              </p>
            </Card>
          </div>
        </section>

        {/* Vision & Mission */}
        <section className="py-20 bg-muted/30">
          <div className="container max-w-6xl mx-auto">
            <div className="grid md:grid-cols-2 gap-8">
              <Card className="p-8 space-y-6 hover-scale">
                <div className="flex items-center gap-4">
                  <div className="h-16 w-16 rounded-full gradient-primary flex items-center justify-center">
                    <Eye className="h-8 w-8 text-white" />
                  </div>
                  <h2 className="text-3xl font-bold">Our Vision</h2>
                </div>
                <p className="text-lg text-muted-foreground leading-relaxed">
                  To create a transparent staking model that rewards loyalty and community growth, 
                  establishing a new standard for trust and sustainability in the DeFi space.
                </p>
                <ul className="space-y-3 text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <Shield className="h-5 w-5 text-primary mt-1 flex-shrink-0" />
                    <span>100% transparent reward distribution</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Users className="h-5 w-5 text-primary mt-1 flex-shrink-0" />
                    <span>Community-first approach</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <TrendingUp className="h-5 w-5 text-primary mt-1 flex-shrink-0" />
                    <span>Sustainable long-term growth</span>
                  </li>
                </ul>
              </Card>

              <Card className="p-8 space-y-6 hover-scale">
                <div className="flex items-center gap-4">
                  <div className="h-16 w-16 rounded-full gradient-primary flex items-center justify-center">
                    <Target className="h-8 w-8 text-white" />
                  </div>
                  <h2 className="text-3xl font-bold">Our Mission</h2>
                </div>
                <p className="text-lg text-muted-foreground leading-relaxed">
                  Empower users to hold confidently and earn collectively through a sustainable 
                  reward pool mechanism that benefits everyone in the ecosystem.
                </p>
                <ul className="space-y-3 text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <Rocket className="h-5 w-5 text-secondary mt-1 flex-shrink-0" />
                    <span>Make staking accessible to everyone</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Shield className="h-5 w-5 text-secondary mt-1 flex-shrink-0" />
                    <span>Ensure security and transparency</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Star className="h-5 w-5 text-secondary mt-1 flex-shrink-0" />
                    <span>Build a thriving global community</span>
                  </li>
                </ul>
              </Card>
            </div>
          </div>
        </section>

        {/* Roadmap */}
        <section className="py-20">
          <div className="container max-w-5xl mx-auto space-y-12">
            <div className="text-center space-y-4">
              <h2 className="text-4xl font-bold">Milestones & Roadmap</h2>
              <p className="text-xl text-muted-foreground">
                Our journey to revolutionize token holding
              </p>
            </div>

            <div className="relative">
              {/* Timeline Line */}
              <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-gradient-to-b from-primary to-secondary hidden md:block" />
              
              <div className="space-y-8">
                {/* Phase 1 */}
                <div className="relative flex gap-8 items-start">
                  <div className="h-16 w-16 rounded-full gradient-primary flex items-center justify-center text-white font-bold text-xl flex-shrink-0 shadow-lg">
                    1
                  </div>
                  <Card className="flex-1 p-6 hover-scale">
                    <h3 className="text-2xl font-bold mb-2">Phase 1: Project Launch & Website</h3>
                    <p className="text-muted-foreground mb-4">Q1 2024 - Completed ✓</p>
                    <ul className="space-y-2 text-muted-foreground">
                      <li>✓ Website development and launch</li>
                      <li>✓ Smart contract development</li>
                      <li>✓ Security audit completion</li>
                    </ul>
                  </Card>
                </div>

                {/* Phase 2 */}
                <div className="relative flex gap-8 items-start">
                  <div className="h-16 w-16 rounded-full gradient-primary flex items-center justify-center text-white font-bold text-xl flex-shrink-0 shadow-lg">
                    2
                  </div>
                  <Card className="flex-1 p-6 hover-scale">
                    <h3 className="text-2xl font-bold mb-2">Phase 2: Token Listing on PancakeSwap</h3>
                    <p className="text-muted-foreground mb-4">Q2 2024 - In Progress</p>
                    <ul className="space-y-2 text-muted-foreground">
                      <li>⏳ PancakeSwap listing</li>
                      <li>⏳ Initial liquidity pool creation</li>
                      <li>⏳ Marketing campaign launch</li>
                    </ul>
                  </Card>
                </div>

                {/* Phase 3 */}
                <div className="relative flex gap-8 items-start">
                  <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center text-foreground font-bold text-xl flex-shrink-0 shadow-lg">
                    3
                  </div>
                  <Card className="flex-1 p-6 hover-scale">
                    <h3 className="text-2xl font-bold mb-2">Phase 3: Reward Pool Distribution Automation</h3>
                    <p className="text-muted-foreground mb-4">Q3 2024 - Planned</p>
                    <ul className="space-y-2 text-muted-foreground">
                      <li>○ Automated reward distribution system</li>
                      <li>○ Enhanced dashboard features</li>
                      <li>○ Mobile app development</li>
                    </ul>
                  </Card>
                </div>

                {/* Phase 4 */}
                <div className="relative flex gap-8 items-start">
                  <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center text-foreground font-bold text-xl flex-shrink-0 shadow-lg">
                    4
                  </div>
                  <Card className="flex-1 p-6 hover-scale">
                    <h3 className="text-2xl font-bold mb-2">Phase 4: Community Expansion</h3>
                    <p className="text-muted-foreground mb-4">Q4 2024 - Planned</p>
                    <ul className="space-y-2 text-muted-foreground">
                      <li>○ Strategic partnerships</li>
                      <li>○ Community governance implementation</li>
                      <li>○ Additional exchange listings</li>
                    </ul>
                  </Card>
                </div>

                {/* Phase 5 */}
                <div className="relative flex gap-8 items-start">
                  <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center text-foreground font-bold text-xl flex-shrink-0 shadow-lg">
                    5
                  </div>
                  <Card className="flex-1 p-6 hover-scale">
                    <h3 className="text-2xl font-bold mb-2">Phase 5: Global Adoption</h3>
                    <p className="text-muted-foreground mb-4">2025 - Future</p>
                    <ul className="space-y-2 text-muted-foreground">
                      <li>○ Multi-chain expansion</li>
                      <li>○ Institutional partnerships</li>
                      <li>○ Global marketing push</li>
                    </ul>
                  </Card>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Testimonials */}
        <section className="py-20 gradient-secondary">
          <div className="container max-w-6xl mx-auto space-y-12">
            <div className="text-center space-y-4">
              <h2 className="text-4xl font-bold">What Our Community Says</h2>
              <p className="text-xl text-muted-foreground">
                Real experiences from our users
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
              <Card className="p-6 space-y-4 hover-scale">
                <div className="flex gap-1">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="h-5 w-5 fill-primary text-primary" />
                  ))}
                </div>
                <p className="text-muted-foreground">
                  "Stacking has been a game-changer for my crypto holdings. The transparent 
                  reward system and easy-to-use platform make it perfect for long-term investors."
                </p>
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <span className="font-bold text-primary">SM</span>
                  </div>
                  <div>
                    <p className="font-semibold">Sarah M.</p>
                    <p className="text-sm text-muted-foreground">Pro Package Holder</p>
                  </div>
                </div>
              </Card>

              <Card className="p-6 space-y-4 hover-scale">
                <div className="flex gap-1">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="h-5 w-5 fill-primary text-primary" />
                  ))}
                </div>
                <p className="text-muted-foreground">
                  "Finally, a staking platform that actually delivers on its promises. 
                  The referral system is fair and the rewards are distributed exactly as described."
                </p>
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-secondary/10 flex items-center justify-center">
                    <span className="font-bold text-secondary">JD</span>
                  </div>
                  <div>
                    <p className="font-semibold">James D.</p>
                    <p className="text-sm text-muted-foreground">Elite Package Holder</p>
                  </div>
                </div>
              </Card>

              <Card className="p-6 space-y-4 hover-scale">
                <div className="flex gap-1">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="h-5 w-5 fill-primary text-primary" />
                  ))}
                </div>
                <p className="text-muted-foreground">
                  "I love the simplicity and transparency. No hidden fees, no complicated processes. 
                  Just stake, refer, and earn. Highly recommend!"
                </p>
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <span className="font-bold text-primary">AL</span>
                  </div>
                  <div>
                    <p className="font-semibold">Alex L.</p>
                    <p className="text-sm text-muted-foreground">Starter Package Holder</p>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        </section>
      </main>
      
      <Footer />
    </div>
  );
};

export default About;
