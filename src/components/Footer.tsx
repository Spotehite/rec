import Link from "next/link";
import Logo from "./Logo";
import { Mail, MapPin, Clock, ArrowUpRight, ShieldCheck } from "lucide-react";

export default function Footer() {
  return (
    <footer className="border-t rule-hairline bg-paperdim/40 pt-16 pb-12 mt-28">
      <div className="mx-auto max-w-6xl px-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10 pb-12 border-b rule-hairline">
          {/* Brand & About */}
          <div className="md:col-span-1 space-y-4">
            <Logo size="md" showTagline />
            <p className="text-xs leading-relaxed text-muted mt-3">
              Direct, transparent recruitment connecting exceptional talent with high-impact US roles.
            </p>
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-800 text-[11px] font-mono">
              <span className="h-1.5 w-1.5 rounded-full bg-blue-500 animate-pulse" />
              <span>Executive Search Active</span>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="font-mono text-xs uppercase tracking-widest2 text-ink font-semibold mb-4">
              Explore
            </h4>
            <ul className="space-y-2.5 font-mono text-xs text-muted">
              <li>
                <Link href="/#openings" className="hover:text-ink transition-colors flex items-center gap-1">
                  Open Positions
                </Link>
              </li>
              <li>
                <Link href="/#how-it-works" className="hover:text-ink transition-colors">
                  How It Works
                </Link>
              </li>
              <li>
                <Link href="/about" className="hover:text-ink transition-colors">
                  About Our Team
                </Link>
              </li>
              <li>
                <Link href="/contact" className="hover:text-ink transition-colors">
                  Candidate Inquiries
                </Link>
              </li>
            </ul>
          </div>

          {/* Candidate Support */}
          <div>
            <h4 className="font-mono text-xs uppercase tracking-widest2 text-ink font-semibold mb-4">
              Candidate Portal
            </h4>
            <ul className="space-y-2.5 font-mono text-xs text-muted">
              <li>
                <Link href="/contact" className="hover:text-ink transition-colors">
                  Contact Support
                </Link>
              </li>
              <li>
                <Link href="/contact#faq" className="hover:text-ink transition-colors">
                  Interview FAQs
                </Link>
              </li>
              <li>
                <span className="flex items-center gap-1.5 text-muted">
                  <ShieldCheck className="w-3.5 h-3.5 text-brass" /> Passkey Protected
                </span>
              </li>
            </ul>
          </div>

          {/* Location & Contact */}
          <div>
            <h4 className="font-mono text-xs uppercase tracking-widest2 text-ink font-semibold mb-4">
              Headquarters
            </h4>
            <div className="space-y-3 font-mono text-xs text-muted">
              <div className="flex items-start gap-2">
                <MapPin className="w-3.5 h-3.5 text-brass shrink-0 mt-0.5" />
                <span>444 Madison Ave, New York, NY &amp; US Remote</span>
              </div>
              <div className="flex items-center gap-2">
                <Mail className="w-3.5 h-3.5 text-brass shrink-0" />
                <a href="mailto:careers@northfieldcareers.com" className="hover:text-ink transition-colors">
                  careers@northfieldcareers.com
                </a>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-3.5 h-3.5 text-brass shrink-0" />
                <span>Mon – Fri, 09:00 – 17:00 EST</span>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 font-mono text-xs text-muted">
          <p>© {new Date().getFullYear()} Northfield Recruitment Systems USA. All rights reserved.</p>
          <div className="flex items-center gap-6">
            <Link href="/contact" className="hover:text-ink transition-colors">
              Privacy Notice
            </Link>
            <span aria-hidden>·</span>
            <Link href="/contact" className="hover:text-ink transition-colors">
              Terms of Use
            </Link>
            <span aria-hidden>·</span>
            <Link href="/admin/login" className="hover:text-brass transition-colors opacity-70 hover:opacity-100">
              Admin Access
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
