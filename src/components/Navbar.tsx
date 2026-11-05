"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import Logo from "./Logo";
import { Calendar, Menu, X, ArrowRight } from "lucide-react";

export default function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const pathname = usePathname();

  const navLinks = [
    { label: "Openings", href: "/#openings" },
    { label: "How It Works", href: "/#how-it-works" },
    { label: "About", href: "/about" },
    { label: "Contact", href: "/contact" },
  ];

  const isActive = (href: string) => {
    if (href.startsWith("/#")) return pathname === "/";
    return pathname === href;
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b rule-hairline bg-paper/90 backdrop-blur-md transition-all">
      <div className="mx-auto max-w-6xl px-6 py-4 flex items-center justify-between">
        {/* Brand Logo */}
        <Logo size="md" showTagline />

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-8 font-mono text-xs uppercase tracking-widest2">
          {navLinks.map((link) => (
            <Link
              key={link.label}
              href={link.href}
              className={`transition-colors py-1 relative ${
                isActive(link.href)
                  ? "text-ink font-semibold"
                  : "text-muted hover:text-ink"
              }`}
            >
              {link.label}
              {isActive(link.href) && (
                <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-brass rounded-full" />
              )}
            </Link>
          ))}
        </nav>

        {/* CTA Actions */}
        <div className="hidden sm:flex items-center gap-4">
          <Link
            href="/#openings"
            className="inline-flex items-center gap-2 bg-ink text-paper px-4 py-2.5 rounded-sm font-mono text-xs uppercase tracking-widest2 hover:bg-brassdim transition-colors shadow-sm"
          >
            <span>Explore Positions</span>
            <ArrowRight className="w-3.5 h-3.5 text-brass" />
          </Link>
        </div>

        {/* Mobile menu button */}
        <button
          type="button"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="md:hidden p-2 text-ink hover:text-brass transition-colors focus:outline-none"
          aria-label="Toggle navigation menu"
        >
          {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Mobile dropdown menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-b rule-hairline bg-paper px-6 py-6 space-y-4 animate-fade-up">
          <div className="flex flex-col space-y-3 font-mono text-xs uppercase tracking-widest2">
            {navLinks.map((link) => (
              <Link
                key={link.label}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`py-2 px-3 rounded-sm transition-colors ${
                  isActive(link.href)
                    ? "bg-paperdim text-ink font-semibold"
                    : "text-muted hover:bg-paperdim/50 hover:text-ink"
                }`}
              >
                {link.label}
              </Link>
            ))}
          </div>

          <div className="pt-4 border-t rule-hairline">
            <Link
              href="/#openings"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center justify-center gap-2 w-full bg-ink text-paper py-3 rounded-sm font-mono text-xs uppercase tracking-widest2 hover:bg-brassdim transition-colors"
            >
              <span>Explore Positions</span>
              <ArrowRight className="w-3.5 h-3.5 text-brass ml-1" />
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
