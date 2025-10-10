"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Coins } from "lucide-react";
import { Button } from "./ui/button";

const Header = () => {
  const pathname = usePathname();

  const isActive = (path) => pathname === path;

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between">
        
        {/* Logo */}
        <Link
          href="/"
          className="flex items-center space-x-2 hover:scale-105 transition-transform"
          aria-label="Go to homepage"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-xl gradient-primary">
            <Coins className="h-6 w-6 text-white" />
          </div>
          <span className="text-xl font-bold gradient-text">Staking</span>
        </Link>

        {/* Navigation */}
        <nav className="hidden md:flex items-center gap-6">
          <Link
            href="/"
            className={`text-sm font-medium transition-colors hover:text-primary ${
              isActive("/") ? "text-primary" : "text-muted-foreground"
            }`}
          >
            Home
          </Link>
          <Link
            href="/dashboard"
            className={`text-sm font-medium transition-colors hover:text-primary ${
              isActive("/dashboard") ? "text-primary" : "text-muted-foreground"
            }`}
          >
            Dashboard
          </Link>
          <Link
            href="/about"
            className={`text-sm font-medium transition-colors hover:text-primary ${
              isActive("/about") ? "text-primary" : "text-muted-foreground"
            }`}
          >
            About Us
          </Link>
        </nav>

        {/* Right Section */}
        <div className="flex items-center gap-4">
          <Button
            variant="default"
            className="gradient-primary text-white border-0 hover:opacity-90 transition-opacity"
          >
            Connect Wallet
          </Button>
        </div>
      </div>
    </header>
  );
};

export default Header;
