import { Card } from "@/app/components/ui/card";
import {
  Target,
  Eye,
  TrendingUp,
  Users,
  Shield,
  Rocket,
  Star,
} from "lucide-react";

const About = () => {
  return (
    <div>
        {/* Hero Section */}
        <section className="py-20 gradient-secondary">
          <div className="container max-w-4xl mx-auto text-center space-y-6">
            <h1 className="text-5xl md:text-6xl font-bold">About Staking</h1>
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
                Staking is a transparent and secure token holding ecosystem built
                to encourage long-term holding through structured staking
                packages and a fair reward distribution system.
              </p>
            </div>

            <Card className="p-8 md:p-12 space-y-6 text-lg leading-relaxed">
              <p>
                We believe in creating a sustainable crypto economy where
                holders are rewarded for their loyalty and commitment. Unlike
                traditional staking platforms, Staking focuses on transparent
                lock mechanisms and community-driven rewards.
              </p>
              <p>
                Our platform combines the security of time-locked holdings with
                the power of network effects through our referral system,
                ensuring that early adopters and active community members are
                fairly compensated.
              </p>
            </Card>
          </div>
        </section>

        {/* Vision & Mission */}
        <section className="py-20 bg-muted/30">
          <div className="container max-w-6xl mx-auto">
            <div className="grid md:grid-cols-2 gap-8">
              {/* Vision */}
              <Card className="p-8 space-y-6 transition-transform hover:scale-105">
                <div className="flex items-center gap-4">
                  <div className="h-16 w-16 rounded-full gradient-primary flex items-center justify-center">
                    <Eye className="h-8 w-8 text-white" />
                  </div>
                  <h2 className="text-3xl font-bold">Our Vision</h2>
                </div>
                <p className="text-lg text-muted-foreground leading-relaxed">
                  To create a transparent staking model that rewards loyalty and
                  community growth, establishing a new standard for trust and
                  sustainability in the DeFi space.
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

              {/* Mission */}
              <Card className="p-8 space-y-6 transition-transform hover:scale-105">
                <div className="flex items-center gap-4">
                  <div className="h-16 w-16 rounded-full gradient-primary flex items-center justify-center">
                    <Target className="h-8 w-8 text-white" />
                  </div>
                  <h2 className="text-3xl font-bold">Our Mission</h2>
                </div>
                <p className="text-lg text-muted-foreground leading-relaxed">
                  Empower users to hold confidently and earn collectively
                  through a sustainable reward pool mechanism that benefits
                  everyone in the ecosystem.
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
                {[
                  {
                    num: 1,
                    title: "Phase 1: Project Launch & Website",
                    date: "Q1 2024 - Completed ✓",
                    items: [
                      "✓ Website development and launch",
                      "✓ Smart contract development",
                      "✓ Security audit completion",
                    ],
                    completed: true,
                  },
                  {
                    num: 2,
                    title: "Phase 2: Token Listing on PancakeSwap",
                    date: "Q2 2024 - In Progress",
                    items: [
                      "⏳ PancakeSwap listing",
                      "⏳ Initial liquidity pool creation",
                      "⏳ Marketing campaign launch",
                    ],
                    completed: false,
                  },
                  {
                    num: 3,
                    title: "Phase 3: Reward Pool Distribution Automation",
                    date: "Q3 2024 - Planned",
                    items: [
                      "○ Automated reward distribution system",
                      "○ Enhanced dashboard features",
                      "○ Mobile app development",
                    ],
                    completed: false,
                  },
                  {
                    num: 4,
                    title: "Phase 4: Community Expansion",
                    date: "Q4 2024 - Planned",
                    items: [
                      "○ Strategic partnerships",
                      "○ Community governance implementation",
                      "○ Additional exchange listings",
                    ],
                    completed: false,
                  },
                  {
                    num: 5,
                    title: "Phase 5: Global Adoption",
                    date: "2025 - Future",
                    items: [
                      "○ Multi-chain expansion",
                      "○ Institutional partnerships",
                      "○ Global marketing push",
                    ],
                    completed: false,
                  },
                ].map((phase) => (
                  <div
                    key={phase.num}
                    className="relative flex gap-8 items-start"
                  >
                    <div
                      className={`h-16 w-16 rounded-full flex items-center justify-center text-white font-bold text-xl flex-shrink-0 shadow-lg ${
                        phase.completed
                          ? "gradient-primary"
                          : "bg-muted text-foreground"
                      }`}
                    >
                      {phase.num}
                    </div>
                    <Card className="flex-1 p-6 transition-transform hover:scale-105">
                      <h3 className="text-2xl font-bold mb-2">{phase.title}</h3>
                      <p className="text-muted-foreground mb-4">{phase.date}</p>
                      <ul className="space-y-2 text-muted-foreground">
                        {phase.items.map((item, idx) => (
                          <li key={idx}>{item}</li>
                        ))}
                      </ul>
                    </Card>
                  </div>
                ))}
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
              {[
                {
                  text: `"Staking has been a game-changer for my crypto holdings. The transparent reward system and easy-to-use platform make it perfect for long-term investors."`,
                  initials: "SM",
                  name: "Sarah M.",
                  role: "Pro Package Holder",
                  color: "primary",
                },
                {
                  text: `"Finally, a staking platform that actually delivers on its promises. The referral system is fair and the rewards are distributed exactly as described."`,
                  initials: "JD",
                  name: "James D.",
                  role: "Elite Package Holder",
                  color: "secondary",
                },
                {
                  text: `"I love the simplicity and transparency. No hidden fees, no complicated processes. Just stake, refer, and earn. Highly recommend!"`,
                  initials: "AL",
                  name: "Alex L.",
                  role: "Starter Package Holder",
                  color: "primary",
                },
              ].map((review, idx) => (
                <Card
                  key={idx}
                  className="p-6 space-y-4 transition-transform hover:scale-105"
                >
                  <div className="flex gap-1">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        className="h-5 w-5 fill-primary text-primary"
                      />
                    ))}
                  </div>
                  <p className="text-muted-foreground">{review.text}</p>
                  <div className="flex items-center gap-3">
                    <div
                      className={`h-10 w-10 rounded-full bg-${review.color}/10 flex items-center justify-center`}
                    >
                      <span className={`font-bold text-${review.color}`}>
                        {review.initials}
                      </span>
                    </div>
                    <div>
                      <p className="font-semibold">{review.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {review.role}
                      </p>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        </section>
    </div>
  );
};

export default About;
