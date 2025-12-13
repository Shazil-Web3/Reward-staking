'use client';

import { usePathname } from 'next/navigation';

const Footer = () => {
  const pathname = usePathname();

  // Hide footer on admin routes
  if (pathname?.startsWith('/admin')) {
    return null;
  }

  return (
    <footer className="border-t gradient-secondary py-12">
      <div className="container mx-auto px-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">

          {/* About Section */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">About Staking</h3>
            <p className="text-sm text-muted-foreground">
              A transparent and secure token holding ecosystem built to encourage
              long-term holding through structured staking packages and fair reward
              distribution.
            </p>
          </div>

          {/* Quick Links */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Quick Links</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>
                <a
                  href="/"
                  className="hover:text-primary transition-colors"
                >
                  Home
                </a>
              </li>
              <li>
                <a
                  href="/dashboard"
                  className="hover:text-primary transition-colors"
                >
                  Dashboard
                </a>
              </li>
              <li>
                <a
                  href="/about"
                  className="hover:text-primary transition-colors"
                >
                  About Us
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Footer Bottom */}
        <div className="mt-8 pt-8 border-t text-center text-sm text-muted-foreground">
          <p>&copy; {new Date().getFullYear()} Staking. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
