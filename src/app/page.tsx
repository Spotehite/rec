import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import JobListings from "@/components/JobListings";
import { USA_JOBS_LIST } from "@/lib/mockJobs";
import type { Job } from "@/lib/types";
import {
  Calendar,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Zap,
  Globe2,
  Users,
  Award,
  Clock,
  CheckCircle2,
  Quote,
} from "lucide-react";

export const revalidate = 0;

export default async function HomePage() {
  const supabase = createClient();
  const { data: jobs } = await supabase
    .from("jobs")
    .select("*")
    .eq("status", "published")
    .order("created_at", { ascending: false });

  // Use database jobs if available, otherwise use complete USA openings list
  const openings = (jobs && jobs.length > 0 ? jobs : USA_JOBS_LIST) as Job[];

  return (
    <div className="min-h-screen flex flex-col bg-paper text-ink selection:bg-brass selection:text-paper">
      <Navbar />

      <main className="flex-1">
        {/* Hero Section with High-End USA Background Image */}
        <section className="relative overflow-hidden pt-20 pb-20 sm:pt-28 sm:pb-28 border-b rule-hairline bg-paper">
          {/* Background Image with Cinematic Gradient Overlays */}
          <div className="absolute inset-0 z-0 pointer-events-none">
            {/* Background Image */}
            <div
              className="absolute inset-0 bg-cover bg-right sm:bg-center transform scale-105 transition-transform duration-1000 ease-out opacity-85"
              style={{ backgroundImage: "url('/images/hero-bg.jpg')" }}
            />
            {/* Gradient Overlays for Razor-Sharp Text Contrast */}
            <div className="absolute inset-0 bg-gradient-to-r from-paper via-paper/95 sm:via-paper/85 to-paper/30 sm:to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-t from-paper via-transparent to-paper/60" />
            <div className="absolute inset-0 bg-paper/20 backdrop-blur-[0.5px]" />
          </div>

          <div className="relative z-10 mx-auto max-w-6xl px-6">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
              {/* Left Column: Headline, Copy & CTAs */}
              <div className="lg:col-span-7 xl:col-span-8 max-w-3xl">
                {/* Hiring Badge */}
                <div
                  className="animate-fade-up inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-paper/90 backdrop-blur-sm border rule-hairline text-brass font-mono text-xs uppercase tracking-widest2 mb-8 shadow-xs"
                >
                  <span className="flex h-2 w-2 relative">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brass opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-brass"></span>
                  </span>
                  <span>Active Hiring &middot; {openings.length} Available Role{openings.length === 1 ? "" : "s"}</span>
                </div>

                {/* Main Headline */}
                <h1
                  className="animate-fade-up font-display text-5xl sm:text-6xl lg:text-7xl leading-[1.08] text-ink font-normal tracking-tight"
                  style={{ animationDelay: "80ms" }}
                >
                  Where exceptional talent meets{" "}
                  <span className="italic font-medium text-brass">unlimited opportunity.</span>
                </h1>

                {/* Subtitle */}
                <p
                  className="animate-fade-up mt-8 text-lg sm:text-xl leading-relaxed text-muted max-w-2xl"
                  style={{ animationDelay: "160ms" }}
                >
                  Skip the opaque resume queues. Discover our open positions across Social Media, Growth Marketing, Creative Design, and Web Engineering — and schedule a direct conversation with our hiring team in seconds.
                </p>

                {/* Action Buttons */}
                <div
                  className="animate-fade-up mt-10 flex flex-wrap items-center gap-4"
                  style={{ animationDelay: "240ms" }}
                >
                  <Link
                    href="#openings"
                    className="inline-flex items-center gap-2 bg-ink text-paper px-7 py-4 rounded-lg font-mono text-xs uppercase tracking-widest2 hover:bg-brassdim transition-all shadow-sm hover:shadow group"
                  >
                    <span>Explore Open Positions</span>
                    <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1" />
                  </Link>

                  <Link
                    href="/contact"
                    className="inline-flex items-center gap-2 border border-ink/20 bg-paper/90 backdrop-blur-md px-7 py-4 rounded-lg font-mono text-xs uppercase tracking-widest2 text-ink hover:border-ink hover:bg-paperdim transition-all shadow-xs"
                  >
                    <span>Contact Talent Team</span>
                  </Link>
                </div>

                {/* Trust Indicators */}
                <div
                  className="animate-fade-up mt-12 pt-8 border-t rule-hairline flex flex-wrap items-center gap-y-3 gap-x-8 font-mono text-xs text-muted"
                  style={{ animationDelay: "320ms" }}
                >
                  <div className="flex items-center gap-2">
                    <Zap className="w-4 h-4 text-brass" />
                    <span>Curated 48-Hour Review</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Globe2 className="w-4 h-4 text-brass" />
                    <span>New York HQ &amp; USA Remote</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-brass" />
                    <span>Confidential Executive Search</span>
                  </div>
                </div>
              </div>

              {/* Right Column: Floating Glassmorphism Hub Card on Desktop */}
              <div className="hidden lg:block lg:col-span-5 xl:col-span-4 animate-fade-up" style={{ animationDelay: "200ms" }}>
                <div className="p-8 rounded-3xl bg-paper/85 backdrop-blur-xl border border-white/60 shadow-xl space-y-6">
                  <div className="flex items-center justify-between border-b rule-hairline pb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-ink text-paper flex items-center justify-center">
                        <Globe2 className="w-5 h-5 text-brass" />
                      </div>
                      <div>
                        <h4 className="font-display text-base font-semibold text-ink leading-tight">Northfield Executive Search</h4>
                        <p className="font-mono text-[11px] text-muted">New York, NY 10022</p>
                      </div>
                    </div>
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-mono font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                      <span>Hiring</span>
                    </span>
                  </div>

                  <div className="space-y-3 font-sans text-xs text-muted leading-relaxed">
                    <div className="flex items-start gap-2.5">
                      <Clock className="w-4 h-4 text-brass shrink-0 mt-0.5" />
                      <span>Curated candidate review with private calendar invitations sent to shortlisted talent.</span>
                    </div>
                    <div className="flex items-start gap-2.5">
                      <Award className="w-4 h-4 text-brass shrink-0 mt-0.5" />
                      <span>20–30% above-market compensation benchmarks across all US roles.</span>
                    </div>
                  </div>

                  <div className="pt-2">
                    <Link
                      href="#openings"
                      className="w-full bg-ink hover:bg-brassdim text-paper py-3 rounded-xl font-mono text-xs uppercase tracking-widest2 flex items-center justify-center gap-2 transition-all shadow-sm"
                    >
                      <span>Explore Open Roles</span>
                      <ArrowRight className="w-3.5 h-3.5 text-brass" />
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Numbers & Impact Strip */}
        <section className="border-b rule-hairline bg-paperdim/30 py-12">
          <div className="mx-auto max-w-6xl px-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center sm:text-left">
              <div className="space-y-1">
                <p className="font-display text-3xl sm:text-4xl text-ink font-semibold">48 Hours</p>
                <p className="font-mono text-xs uppercase tracking-widest2 text-muted">Average Review Time</p>
              </div>
              <div className="space-y-1">
                <p className="font-display text-3xl sm:text-4xl text-brass font-semibold">98.4%</p>
                <p className="font-mono text-xs uppercase tracking-widest2 text-muted">Candidate Satisfaction</p>
              </div>
              <div className="space-y-1">
                <p className="font-display text-3xl sm:text-4xl text-ink font-semibold">450+</p>
                <p className="font-mono text-xs uppercase tracking-widest2 text-muted">Talents Placed in US</p>
              </div>
              <div className="space-y-1">
                <p className="font-display text-3xl sm:text-4xl text-brass font-semibold">20-30%</p>
                <p className="font-mono text-xs uppercase tracking-widest2 text-muted">Above-Market Packages</p>
              </div>
            </div>
          </div>
        </section>

        {/* Why Northfield Section (Spirit & Culture) */}
        <section className="py-24 border-b rule-hairline">
          <div className="mx-auto max-w-6xl px-6">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-16">
              <div className="max-w-2xl">
                <p className="font-mono text-xs uppercase tracking-widest2 text-brass mb-3">
                  Why Join Northfield
                </p>
                <h2 className="font-display text-3xl sm:text-4xl text-ink font-medium">
                  A recruitment process designed with respect, clarity, and speed.
                </h2>
              </div>
              <p className="text-sm text-muted max-w-sm">
                We believe top talent deserves a transparent, modern hiring experience without unnecessary hurdles.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* Card 1 */}
              <div className="p-8 rounded-2xl border rule-hairline bg-paper hover:bg-paperdim/40 transition-all hover:shadow-sm space-y-4">
                <div className="w-12 h-12 rounded-xl bg-brass/10 flex items-center justify-center text-brass">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <h3 className="font-display text-xl text-ink font-medium">Curated Review</h3>
                <p className="text-sm leading-relaxed text-muted">
                  Every application is personally reviewed by our senior recruitment leads within 48 hours.
                </p>
              </div>

              {/* Card 2 */}
              <div className="p-8 rounded-2xl border rule-hairline bg-paper hover:bg-paperdim/40 transition-all hover:shadow-sm space-y-4">
                <div className="w-12 h-12 rounded-xl bg-ink/5 flex items-center justify-center text-ink">
                  <Award className="w-6 h-6 text-brass" />
                </div>
                <h3 className="font-display text-xl text-ink font-medium">Top Compensation</h3>
                <p className="text-sm leading-relaxed text-muted">
                  Clear role expectations, 20–30% above-market compensation benchmarks, and transparent equity.
                </p>
              </div>

              {/* Card 3 */}
              <div className="p-8 rounded-2xl border rule-hairline bg-paper hover:bg-paperdim/40 transition-all hover:shadow-sm space-y-4">
                <div className="w-12 h-12 rounded-xl bg-brass/10 flex items-center justify-center text-brass">
                  <Globe2 className="w-6 h-6" />
                </div>
                <h3 className="font-display text-xl text-ink font-medium">Nationwide Reach</h3>
                <p className="text-sm leading-relaxed text-muted">
                  Work on high-impact projects with collaborative teams across the United States and globally.
                </p>
              </div>

              {/* Card 4 */}
              <div className="p-8 rounded-2xl border rule-hairline bg-paper hover:bg-paperdim/40 transition-all hover:shadow-sm space-y-4">
                <div className="w-12 h-12 rounded-xl bg-ink/5 flex items-center justify-center text-ink">
                  <Sparkles className="w-6 h-6 text-brass" />
                </div>
                <h3 className="font-display text-xl text-ink font-medium">Growth &amp; Wellness</h3>
                <p className="text-sm leading-relaxed text-muted">
                  Comprehensive 100% health coverage, 401(k) match, and generous remote home office stipends.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* How It Works Section */}
        <section id="how-it-works" className="py-24 border-b rule-hairline bg-paperdim/20 scroll-mt-20">
          <div className="mx-auto max-w-6xl px-6">
            <div className="text-center max-w-2xl mx-auto mb-16">
              <p className="font-mono text-xs uppercase tracking-widest2 text-brass mb-3">
                Seamless Candidate Journey
              </p>
              <h2 className="font-display text-3xl sm:text-4xl text-ink font-medium">
                How Our Selection Process Works
              </h2>
              <p className="mt-4 text-sm text-muted">
                From application review to your introductory interview in four streamlined steps.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
              {/* Step 1 */}
              <div className="relative p-6 rounded-xl border rule-hairline bg-paper space-y-3">
                <span className="font-mono text-xs font-semibold text-brass">STEP 01</span>
                <h3 className="font-display text-lg text-ink font-medium">Explore &amp; Apply</h3>
                <p className="text-xs leading-relaxed text-muted">
                  Review our open positions and submit your profile, portfolio, and CV directly through our portal.
                </p>
              </div>

              {/* Step 2 */}
              <div className="relative p-6 rounded-xl border rule-hairline bg-paper space-y-3">
                <span className="font-mono text-xs font-semibold text-brass">STEP 02</span>
                <h3 className="font-display text-lg text-ink font-medium">Talent Review</h3>
                <p className="text-xs leading-relaxed text-muted">
                  Our executive recruitment leads evaluate your background and experience within 48 hours.
                </p>
              </div>

              {/* Step 3 */}
              <div className="relative p-6 rounded-xl border rule-hairline bg-paper space-y-3">
                <span className="font-mono text-xs font-semibold text-brass">STEP 03</span>
                <h3 className="font-display text-lg text-ink font-medium">Private Invitation</h3>
                <p className="text-xs leading-relaxed text-muted">
                  Shortlisted candidates receive an exclusive calendar link to schedule a 1-on-1 screening call.
                </p>
              </div>

              {/* Step 4 */}
              <div className="relative p-6 rounded-xl border rule-hairline bg-paper space-y-3">
                <span className="font-mono text-xs font-semibold text-brass">STEP 04</span>
                <h3 className="font-display text-lg text-ink font-medium">Direct Placement</h3>
                <p className="text-xs leading-relaxed text-muted">
                  Fast-track final interviews, compensation alignment, and smooth onboarding with US teams.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Open Positions Section */}
        <section id="openings" className="py-24 border-b rule-hairline scroll-mt-20">
          <div className="mx-auto max-w-6xl px-6">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-12">
              <div>
                <p className="font-mono text-xs uppercase tracking-widest2 text-brass mb-2">
                  Join Our Team
                </p>
                <h2 className="font-display text-3xl sm:text-4xl text-ink font-medium">
                  Current Open Positions
                </h2>
              </div>
              <p className="font-mono text-xs text-muted">
                Showing {openings.length} published opening{openings.length === 1 ? "" : "s"}
              </p>
            </div>

            {/* Interactive Job Listing Component with Search & Department Filters */}
            <JobListings jobs={openings} />
          </div>
        </section>

        {/* Candidate Testimonials Section */}
        <section className="py-24 border-b rule-hairline bg-paperdim/30">
          <div className="mx-auto max-w-6xl px-6">
            <div className="text-center max-w-2xl mx-auto mb-16">
              <p className="font-mono text-xs uppercase tracking-widest2 text-brass mb-3">
                Candidate Stories
              </p>
              <h2 className="font-display text-3xl sm:text-4xl text-ink font-medium">
                Hear from candidates who joined through Northfield
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {/* Testimonial 1 */}
              <div className="p-8 rounded-2xl border rule-hairline bg-paper flex flex-col justify-between space-y-6">
                <div>
                  <Quote className="w-8 h-8 text-brass/40 mb-4" />
                  <p className="text-sm leading-relaxed text-ink italic">
                    &ldquo;The entire application process was transparent and human. Getting a dedicated invitation link after my resume review made scheduling seamless.&rdquo;
                  </p>
                </div>
                <div className="pt-4 border-t rule-hairline flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-ink text-paper flex items-center justify-center font-display font-medium text-xs">
                    EB
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-ink">Ethan Brooks</p>
                    <p className="font-mono text-[11px] text-muted">Senior Frontend Engineer · New York, NY</p>
                  </div>
                </div>
              </div>

              {/* Testimonial 2 */}
              <div className="p-8 rounded-2xl border rule-hairline bg-paper flex flex-col justify-between space-y-6">
                <div>
                  <Quote className="w-8 h-8 text-brass/40 mb-4" />
                  <p className="text-sm leading-relaxed text-ink italic">
                    &ldquo;Northfield values your time as much as their own. The screening conversation was deeply focused on design craft, product impact, and real growth.&rdquo;
                  </p>
                </div>
                <div className="pt-4 border-t rule-hairline flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-brass text-paper flex items-center justify-center font-display font-medium text-xs">
                    LH
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-ink">Lauren Hayes</p>
                    <p className="font-mono text-[11px] text-muted">Product Design Lead · San Francisco, CA</p>
                  </div>
                </div>
              </div>

              {/* Testimonial 3 */}
              <div className="p-8 rounded-2xl border rule-hairline bg-paper flex flex-col justify-between space-y-6">
                <div>
                  <Quote className="w-8 h-8 text-brass/40 mb-4" />
                  <p className="text-sm leading-relaxed text-ink italic">
                    &ldquo;Fast feedback, top-tier compensation packages, and crystal-clear communication gave me immense confidence in Northfield&rsquo;s standards.&rdquo;
                  </p>
                </div>
                <div className="pt-4 border-t rule-hairline flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-ink text-paper flex items-center justify-center font-display font-medium text-xs">
                    DB
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-ink">Daniel Bennett</p>
                    <p className="font-mono text-[11px] text-muted">Growth Marketing Lead · Austin, TX</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Pre-Footer High-Impact CTA */}
        <section className="py-20">
          <div className="mx-auto max-w-6xl px-6">
            <div className="relative rounded-3xl bg-ink text-paper p-10 sm:p-16 overflow-hidden shadow-xl">
              {/* Background Glow */}
              <div className="absolute top-0 right-0 -mr-24 -mt-24 w-96 h-96 rounded-full bg-brass/15 blur-3xl pointer-events-none" />
              
              <div className="relative z-10 max-w-2xl space-y-6">
                <span className="font-mono text-xs uppercase tracking-widest2 text-brass">
                  Ready To Begin?
                </span>
                <h2 className="font-display text-3xl sm:text-5xl leading-tight font-medium text-paper">
                  Your next career breakthrough starts here.
                </h2>
                <p className="text-paper/70 text-base sm:text-lg leading-relaxed">
                  Browse our open positions across engineering, marketing, and design, and submit your application today.
                </p>

                <div className="pt-4 flex flex-wrap items-center gap-4">
                  <Link
                    href="#openings"
                    className="inline-flex items-center gap-2 bg-brass hover:bg-brassdim text-paper px-8 py-4 rounded-lg font-mono text-xs uppercase tracking-widest2 transition-all shadow-md"
                  >
                    <span>Browse All Open Roles</span>
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                  <Link
                    href="/contact"
                    className="inline-flex items-center gap-2 border border-paper/30 hover:border-paper px-7 py-4 rounded-lg font-mono text-xs uppercase tracking-widest2 text-paper transition-all"
                  >
                    <span>Contact Recruiting Team</span>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
