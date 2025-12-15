"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Lock, Menu, X } from "lucide-react";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useState } from "react";

const Header = () => {
  const pathname = usePathname();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const isActive = (path) => pathname === path;

  const toggleMenu = () => setIsMenuOpen(!isMenuOpen);

  return (
    <>
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center">

          {/* Mobile Layout */}
          <div className="md:hidden flex items-center justify-between w-full">
            {/* Left side - Hamburger + Logo */}
            <div className="flex items-center gap-2">
              {/* Mobile Hamburger Button */}
              <button
                onClick={toggleMenu}
                className="p-2 hover:bg-muted rounded-lg transition-colors"
                aria-label="Toggle menu"
              >
                {isMenuOpen ? (
                  <X className="h-6 w-6" />
                ) : (
                  <Menu className="h-6 w-6" />
                )}
              </button>

              {/* Mobile Logo - Right next to hamburger */}
              <Link
                href="/"
                className="flex items-center hover:scale-105 transition-transform"
                aria-label="Go to homepage"
              >
                <span className="text-xl font-bold gradient-text">CryptoCommunity</span>
              </Link>
            </div>

            {/* Mobile Connect Wallet - Right */}
            <div className="scale-90">
              <ConnectButton
                chainStatus="none"
                showBalance={false}
                accountStatus={{
                  smallScreen: "avatar",
                  largeScreen: "full",
                }}
              />
            </div>
          </div>

          {/* Desktop Layout */}
          <div className="hidden md:grid md:grid-cols-3 items-center w-full">
            {/* Logo - Desktop */}
            <div className="flex justify-start">
              <Link
                href="/"
                className="flex items-center space-x-2 hover:scale-105 transition-transform"
                aria-label="Go to homepage"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-xl gradient-primary">
                  <Lock className="h-6 w-6 text-white" />
                </div>
                <span className="text-xl font-bold gradient-text">CryptoCommunity</span>
              </Link>
            </div>

            {/* Desktop Navigation - Always centered */}
            <nav className="flex items-center justify-center gap-6">
              <Link
                href="/"
                className={`text-sm font-medium transition-colors hover:text-primary ${isActive("/") ? "text-primary" : "text-muted-foreground"
                  }`}
              >
                Home
              </Link>
              <Link
                href="/dashboard"
                className={`text-sm font-medium transition-colors hover:text-primary ${isActive("/dashboard") ? "text-primary" : "text-muted-foreground"
                  }`}
              >
                Dashboard
              </Link>
              <Link
                href="/about"
                className={`text-sm font-medium transition-colors hover:text-primary ${isActive("/about") ? "text-primary" : "text-muted-foreground"
                  }`}
              >
                About Us
              </Link>
            </nav>

            {/* Desktop Connect Wallet - Always right */}
            <div className="flex justify-end">
              <ConnectButton
                chainStatus="icon"
                showBalance={true}
                accountStatus={{
                  smallScreen: "avatar",
                  largeScreen: "full",
                }}
              />
            </div>
          </div>
        </div>

        {/* Mobile Menu Dropdown */}
        {isMenuOpen && (
          <div className="md:hidden border-t bg-background/95 backdrop-blur">
            <nav className="container py-4 space-y-2">
              <Link
                href="/"
                onClick={() => setIsMenuOpen(false)}
                className={`block px-4 py-2 rounded-lg text-sm font-medium transition-colors hover:bg-muted ${isActive("/") ? "text-primary bg-primary/10" : "text-muted-foreground"
                  }`}
              >
                Home
              </Link>
              <Link
                href="/dashboard"
                onClick={() => setIsMenuOpen(false)}
                className={`block px-4 py-2 rounded-lg text-sm font-medium transition-colors hover:bg-muted ${isActive("/dashboard") ? "text-primary bg-primary/10" : "text-muted-foreground"
                  }`}
              >
                Dashboard
              </Link>
              <Link
                href="/about"
                onClick={() => setIsMenuOpen(false)}
                className={`block px-4 py-2 rounded-lg text-sm font-medium transition-colors hover:bg-muted ${isActive("/about") ? "text-primary bg-primary/10" : "text-muted-foreground"
                  }`}
              >
                About Us
              </Link>
            </nav>
          </div>
        )}
      </header>
    </>
  );
};

export default Header;
