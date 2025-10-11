import { Button } from "./ui/button";
import { Card } from "./ui/card";
import { Check } from "lucide-react";

const PackageCard = ({
  title,
  amount,
  fee,
  lockPeriod,
  referralRequirement,
  isPopular = false,
}) => {
  return (
    <Card
      className={`relative p-6 transition-transform hover:scale-105 ${
        isPopular ? "gradient-border shadow-xl" : ""
      }`}
    >
      {/* Popular Badge */}
      {isPopular && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <span className="gradient-primary text-white px-4 py-1 rounded-full text-xs font-semibold shadow-sm">
            Most Popular
          </span>
        </div>
      )}

      <div className="space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <h3 className="text-2xl font-bold">{title}</h3>
          <div className={`font-bold gradient-text ${amount.length > 10 ? 'text-2xl' : 'text-4xl'}`}>{amount}</div>
          <p className="text-sm text-muted-foreground">{title === 'Custom Package' ? 'Flexible Stake Amount' : 'Minimum Stake Amount'}</p>
        </div>

        {/* Details */}
        <ul className="space-y-3">
          <li className="flex items-center gap-2">
            <Check className="h-5 w-5 text-primary" />
            <span className="text-sm">
              Staking Fee: <strong>{fee}</strong>
            </span>
          </li>
          <li className="flex items-center gap-2">
            <Check className="h-5 w-5 text-primary" />
            <span className="text-sm">
              Lock Period: <strong>{lockPeriod}</strong>
            </span>
          </li>
          <li className="flex items-center gap-2">
            <Check className="h-5 w-5 text-secondary" />
            <span className="text-sm">
              Referrals: <strong>{referralRequirement}</strong>
            </span>
          </li>
          <li className="flex items-center gap-2">
            <Check className="h-5 w-5 text-accent" />
            <span className="text-sm font-semibold">
              Eligible for reward pool
            </span>
          </li>
        </ul>

        {/* Action */}
        <Button
          className="w-full gradient-primary text-white border-0 hover:opacity-90 transition-opacity"
          aria-label={`Choose ${title} package`}
        >
          Choose Package
        </Button>
      </div>
    </Card>
  );
};

export default PackageCard;
