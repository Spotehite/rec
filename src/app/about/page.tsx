import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import {
  Compass,
  Zap,
  Users2,
  ShieldCheck,
  HeartHandshake,
  Globe2,
  Sparkles,
  ArrowRight,
  Check,
} from "lucide-react";

export const metadata = {
  title: "About Us — Northfield Careers",
  description:
    "Learn about Northfield's mission to reshape talent acquisition with transparency, speed, and human-centric recruiting.",
};

export default function AboutPage() {
  const values = [
    {
      icon: Zap,
      title: "Radical Speed & Clarity",
      desc: "We eliminate bureaucratic delays and opaque hiring queues. Every candidate deserves fast feedback, direct calendar access, and transparent status updates.",
    },
    {
      icon: Compass,
      title: "Merit & Craft Above All",
      desc: "We value hands-on capability, problem-solving brilliance, and genuine passion. Our interviewers focus on real challenges, not rote trivia.",
    },
    {
      icon: HeartHandshake,
      title: "Human-Centric Technology",
      desc: "Software exists to serve human connections. Our platform automates scheduling and authentication so we can spend meaningful time discussing your career goals.",
    },
    {
      icon: Globe2,
      title: "Nationwide Vision & Impact",
      desc: "Headquartered in New York with talent hubs spanning Austin, San Francisco, Los Angeles, and remote across the US, we bridge exceptional talent with market-leading opportunity.",
    },
  ];

  const perks = [
    "20%–30% above-market compensation benchmarks",
    "Comprehensive platinum health, dental & vision insurance (100% covered)",
    "Flexible hybrid schedule with full remote-first autonomy across the US",
    "Annual $3,500 professional growth & learning stipend",
    "$2,500 ergonomic home workstation equipment budget",
    "401(k) retirement plan with 5% dollar-for-dollar company match",
  ];

  return (
    <div className="min-h-screen flex flex-col bg-paper text-ink selection:bg-brass selection:text-paper">
      <Navbar />

      <main className="flex-1">
        {/* About Hero */}
        <section className="pt-20 pb-16 sm:pt-28 sm:pb-24 border-b rule-hairline bg-gradient-to-b from-paperdim/30 to-paper">
          <div className="mx-auto max-w-6xl px-6">
            <div className="max-w-3xl">
              <span className="font-mono text-xs uppercase tracking-widest2 text-brass mb-4 block">
                About Northfield
              </span>
              <h1 className="font-display text-4xl sm:text-6xl text-ink font-normal leading-[1.1] tracking-tight">
                We believe hiring should be a conversation, not an endurance test.
              </h1>
              <p className="mt-6 text-lg sm:text-xl text-muted leading-relaxed">
                Northfield is redefining the recruitment journey. We combine streamlined scheduling systems with authentic 1-on-1 human connection to match visionary candidates with premier US opportunities.
              </p>
            </div>
          </div>
        </section>

        {/* Our Story Section */}
        <section className="py-20 border-b rule-hairline">
          <div className="mx-auto max-w-6xl px-6">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
              <div className="lg:col-span-5">
                <span className="font-mono text-xs uppercase tracking-widest2 text-brass block mb-3">
                  Our Story
                </span>
                <h2 className="font-display text-3xl sm:text-4xl text-ink font-medium leading-tight">
                  Built to fix what was broken in modern hiring.
                </h2>
              </div>
              <div className="lg:col-span-7 space-y-6 text-muted leading-relaxed text-[15px]">
                <p>
                  Traditional recruitment often feels like sending resumes into a black hole. Candidates wait weeks for automated responses, navigate convoluted scheduling emails, and face impersonal evaluation filters.
                </p>
                <p>
                  At Northfield, we decided to change the paradigm. We created a modern, synchronized scheduling platform that puts candidates directly in the driver’s seat. If you have the drive and mastery, you can choose a convenient time slot and speak directly with our team.
                </p>
                <p>
                  From our headquarters in New York City to our distributed teammates across Austin, San Francisco, and nationwide, we cultivate an environment where creativity, high agency, and craft thrive.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Core Values */}
        <section className="py-24 border-b rule-hairline bg-paperdim/20">
          <div className="mx-auto max-w-6xl px-6">
            <div className="max-w-2xl mb-16">
              <span className="font-mono text-xs uppercase tracking-widest2 text-brass block mb-3">
                Our Core Values
              </span>
              <h2 className="font-display text-3xl sm:text-4xl text-ink font-medium">
                The principles that guide every decision and interview.
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {values.map((v) => {
                const IconComponent = v.icon;
                return (
                  <div
                    key={v.title}
                    className="p-8 rounded-2xl border rule-hairline bg-paper hover:bg-paperdim/40 transition-all space-y-4"
                  >
                    <div className="w-12 h-12 rounded-xl bg-brass/10 flex items-center justify-center text-brass">
                      <IconComponent className="w-6 h-6" />
                    </div>
                    <h3 className="font-display text-xl text-ink font-medium">{v.title}</h3>
                    <p className="text-sm text-muted leading-relaxed">{v.desc}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Culture & Benefits */}
        <section className="py-24 border-b rule-hairline">
          <div className="mx-auto max-w-6xl px-6">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
              <div className="lg:col-span-6 space-y-6">
                <span className="font-mono text-xs uppercase tracking-widest2 text-brass block">
                  Life At Northfield
                </span>
                <h2 className="font-display text-3xl sm:text-4xl text-ink font-medium">
                  We invest in our people so they can do their life&rsquo;s best work.
                </h2>
                <p className="text-muted text-sm leading-relaxed">
                  Joining Northfield means stepping into an ambitious, high-trust environment where you are empowered to make strategic decisions, lead impactful campaigns, and earn top-of-market compensation.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-4">
                  {perks.map((perk, i) => (
                    <div key={i} className="flex items-start gap-2.5 text-xs text-ink font-mono">
                      <div className="w-4 h-4 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0 mt-0.5">
                        <Check className="w-3 h-3" />
                      </div>
                      <span>{perk}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Office / Hub Card */}
              <div className="lg:col-span-6">
                <div className="p-8 sm:p-10 rounded-2xl border rule-hairline bg-paperdim/40 space-y-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-ink text-paper flex items-center justify-center">
                      <Globe2 className="w-5 h-5 text-brass" />
                    </div>
                    <div>
                      <h4 className="font-display text-lg text-ink font-semibold">New York HQ &amp; Nationwide Remote</h4>
                      <p className="font-mono text-xs text-muted">444 Madison Avenue, New York, NY 10022</p>
                    </div>
                  </div>

                  <p className="text-sm leading-relaxed text-muted">
                    Our flagship headquarters is located in Midtown Manhattan, complemented by creative hubs in Austin, Los Angeles, and San Francisco. We support a flexible, high-trust culture giving you the freedom to work from anywhere in the United States.
                  </p>

                  <div className="pt-4 border-t rule-hairline flex flex-wrap gap-4 font-mono text-xs text-muted">
                    <span>🏢 Nationwide &amp; Remote Friendly</span>
                    <span>🗽 Manhattan Flagship Office</span>
                    <span>⚡ 401(k) Match &amp; Platinum Health</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-20">
          <div className="mx-auto max-w-4xl px-6 text-center space-y-6">
            <span className="font-mono text-xs uppercase tracking-widest2 text-brass block">
              Join Our Journey
            </span>
            <h2 className="font-display text-3xl sm:text-5xl text-ink font-medium">
              Ready to find your place at Northfield?
            </h2>
            <p className="text-muted text-base max-w-xl mx-auto">
              Explore our published positions across engineering, marketing, and design, and submit your application today.
            </p>
            <div className="pt-4 flex flex-wrap justify-center items-center gap-4">
              <Link
                href="/#openings"
                className="inline-flex items-center gap-2 bg-ink text-paper px-8 py-4 rounded-lg font-mono text-xs uppercase tracking-widest2 hover:bg-brassdim transition-colors shadow-sm"
              >
                <span>View Open Positions</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
              <Link
                href="/contact"
                className="inline-flex items-center gap-2 border border-ink/20 px-8 py-4 rounded-lg font-mono text-xs uppercase tracking-widest2 text-ink hover:border-ink hover:bg-paperdim transition-colors"
              >
                <span>Contact Recruiting Team</span>
              </Link>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
