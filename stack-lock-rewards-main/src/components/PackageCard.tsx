import { Button } from "./ui/button";
import { Card } from "./ui/card";
import { Check } from "lucide-react";

interface PackageCardProps {
  title: string;
  amount: string;
  fee: string;
  lockPeriod: string;
  referralRequirement: string;
  isPopular?: boolean;
}

const PackageCard = ({
  title,
  amount,
  fee,
  lockPeriod,
  referralRequirement,
  isPopular = false,
}: PackageCardProps) => {
  return (
    <Card className={`relative p-6 hover-scale ${isPopular ? 'gradient-border shadow-lg' : ''}`}>
      {isPopular && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <span className="gradient-primary text-white px-4 py-1 rounded-full text-xs font-semibold">
            Most Popular
          </span>
        </div>
      )}
      
      <div className="space-y-6">
        <div className="text-center space-y-2">
          <h3 className="text-2xl font-bold">{title}</h3>
          <div className="text-4xl font-bold gradient-text">{amount}</div>
          <p className="text-sm text-muted-foreground">Minimum Stake Amount</p>
        </div>
        
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Check className="h-5 w-5 text-primary" />
            <span className="text-sm">Staking Fee: <strong>{fee}</strong></span>
          </div>
          <div className="flex items-center gap-2">
            <Check className="h-5 w-5 text-primary" />
            <span className="text-sm">Lock Period: <strong>{lockPeriod}</strong></span>
          </div>
          <div className="flex items-center gap-2">
            <Check className="h-5 w-5 text-secondary" />
            <span className="text-sm">Referrals: <strong>{referralRequirement}</strong></span>
          </div>
          <div className="flex items-center gap-2">
            <Check className="h-5 w-5 text-accent" />
            <span className="text-sm"><strong>Eligible for reward pool</strong></span>
          </div>
        </div>
        
        <Button className="w-full gradient-primary text-white border-0 hover:opacity-90">
          Choose Package
        </Button>
      </div>
    </Card>
  );
};

export default PackageCard;
