"use client";

import { useState } from "react";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import {
  Mail,
  MapPin,
  Clock,
  Send,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  Calendar,
  Sparkles,
} from "lucide-react";

export default function ContactPage() {
  const [formSubmitted, setFormSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    topic: "Candidate Inquiry",
    message: "",
  });

  const [expandedFaq, setExpandedFaq] = useState<number | null>(0);

  const faqs = [
    {
      q: "How does the application and interview invitation process work?",
      a: "When you submit an application with your CV on any open position, our senior recruitment team reviews your credentials within 48 hours. Shortlisted candidates receive a private calendar invitation link directly to their email to schedule their 1-on-1 screening interview.",
    },
    {
      q: "How does the Candidate ID and Passkey verification work?",
      a: "When accessing your private interview invitation link, the system verifies your unique Candidate ID and Passkey to ensure your slot is protected and reserved exclusively for you.",
    },
    {
      q: "What should I prepare for the initial 30-minute screening conversation?",
      a: "Our initial screening is a two-way discovery conversation. Be prepared to share key technical or creative accomplishments, your career trajectory, and questions about Northfield's team culture, American clients, and compensation.",
    },
    {
      q: "Do you hire remotely across all US time zones?",
      a: "Yes! While our primary headquarters is in New York, NY, we support flexible, fully remote arrangements for candidates across all US time zones (EST, CST, MST, PST).",
    },
    {
      q: "What is the typical turnaround time after submitting an application?",
      a: "We pride ourselves on speed and respect. Every application receives feedback or an invitation for an introductory conversation within 24 to 48 business hours.",
    },
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    // Simulate submission delay
    setTimeout(() => {
      setLoading(false);
      setFormSubmitted(true);
    }, 600);
  };

  return (
    <div className="min-h-screen flex flex-col bg-paper text-ink selection:bg-brass selection:text-paper">
      <Navbar />

      <main className="flex-1">
        {/* Contact Hero */}
        <section className="pt-20 pb-16 sm:pt-28 sm:pb-24 border-b rule-hairline bg-gradient-to-b from-paperdim/30 to-paper">
          <div className="mx-auto max-w-6xl px-6">
            <div className="max-w-3xl">
              <span className="font-mono text-xs uppercase tracking-widest2 text-brass mb-4 block">
                Get In Touch
              </span>
              <h1 className="font-display text-4xl sm:text-6xl text-ink font-normal leading-[1.1] tracking-tight">
                We&rsquo;re here to answer questions and support your application.
              </h1>
              <p className="mt-6 text-lg sm:text-xl text-muted leading-relaxed">
                Whether you need assistance with interview scheduling, have inquiries about our open roles, or want to learn more about Northfield, drop us a message.
              </p>
            </div>
          </div>
        </section>

        {/* Contact Form & Info Grid */}
        <section className="py-20 border-b rule-hairline">
          <div className="mx-auto max-w-6xl px-6">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
              {/* Left Column: Contact Cards */}
              <div className="lg:col-span-5 space-y-6">
                <div>
                  <h2 className="font-display text-2xl text-ink font-medium mb-3">
                    Contact Channels
                  </h2>
                  <p className="text-sm text-muted leading-relaxed">
                    Our talent team operates Monday through Friday, 09:00 to 17:00 EST.
                  </p>
                </div>

                <div className="space-y-4 pt-2">
                  {/* Card 1: Email */}
                  <div className="p-6 rounded-2xl border rule-hairline bg-paper space-y-2">
                    <div className="flex items-center gap-2 text-brass">
                      <Mail className="w-5 h-5" />
                      <span className="font-mono text-xs uppercase tracking-widest2 font-semibold">
                        Recruitment Email
                      </span>
                    </div>
                    <p className="text-sm text-ink font-medium">careers@northfieldcareers.com</p>
                    <p className="text-xs text-muted">Direct candidate inquiries &amp; feedback</p>
                  </div>

                  {/* Card 2: Office */}
                  <div className="p-6 rounded-2xl border rule-hairline bg-paper space-y-2">
                    <div className="flex items-center gap-2 text-brass">
                      <MapPin className="w-5 h-5" />
                      <span className="font-mono text-xs uppercase tracking-widest2 font-semibold">
                        US Headquarters
                      </span>
                    </div>
                    <p className="text-sm text-ink font-medium">New York, NY, USA</p>
                    <p className="text-xs text-muted">444 Madison Avenue · Suite 1800, New York, NY 10022</p>
                  </div>

                  {/* Card 3: Open Positions Shortcut */}
                  <div className="p-6 rounded-2xl border rule-hairline bg-paperdim/50 space-y-3">
                    <div className="flex items-center gap-2 text-brass">
                      <Sparkles className="w-5 h-5" />
                      <span className="font-mono text-xs uppercase tracking-widest2 font-semibold">
                        Open Positions
                      </span>
                    </div>
                    <p className="text-xs text-muted leading-relaxed">
                      Ready to take the next step in your career? Browse all current roles and submit your application.
                    </p>
                    <Link
                      href="/#openings"
                      className="inline-flex items-center gap-2 text-xs font-mono uppercase tracking-widest2 text-brass hover:underline"
                    >
                      <span>Explore Open Positions →</span>
                    </Link>
                  </div>
                </div>
              </div>

              {/* Right Column: Contact Form */}
              <div className="lg:col-span-7">
                <div className="p-8 sm:p-10 rounded-2xl border rule-hairline bg-paper">
                  {formSubmitted ? (
                    <div className="py-12 text-center space-y-4 animate-fade-up">
                      <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto">
                        <CheckCircle2 className="w-8 h-8" />
                      </div>
                      <h3 className="font-display text-2xl text-ink font-medium">Message Sent Successfully</h3>
                      <p className="text-sm text-muted max-w-md mx-auto leading-relaxed">
                        Thank you for reaching out, <span className="font-semibold text-ink">{formData.name}</span>. A member of our recruitment team will review your note and respond to <span className="font-semibold text-ink">{formData.email}</span> within 24 business hours.
                      </p>
                      <button
                        onClick={() => {
                          setFormSubmitted(false);
                          setFormData({ name: "", email: "", topic: "Candidate Inquiry", message: "" });
                        }}
                        className="mt-6 font-mono text-xs uppercase tracking-widest2 text-brass hover:underline"
                      >
                        Send Another Message
                      </button>
                    </div>
                  ) : (
                    <form onSubmit={handleSubmit} className="space-y-6">
                      <h3 className="font-display text-2xl text-ink font-medium">Send Us a Message</h3>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        <div>
                          <label className="block font-mono text-xs uppercase tracking-widest2 text-muted mb-2">
                            Your Name *
                          </label>
                          <input
                            type="text"
                            required
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            placeholder="e.g. Sarah Jenkins"
                            className="w-full border rule-hairline bg-paperdim/30 px-3.5 py-3 rounded-lg text-sm text-ink outline-none focus:border-brass focus:bg-paper transition-all"
                          />
                        </div>
                        <div>
                          <label className="block font-mono text-xs uppercase tracking-widest2 text-muted mb-2">
                            Email Address *
                          </label>
                          <input
                            type="email"
                            required
                            value={formData.email}
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                            placeholder="sarah.jenkins@example.com"
                            className="w-full border rule-hairline bg-paperdim/30 px-3.5 py-3 rounded-lg text-sm text-ink outline-none focus:border-brass focus:bg-paper transition-all"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block font-mono text-xs uppercase tracking-widest2 text-muted mb-2">
                          Inquiry Topic
                        </label>
                        <select
                          value={formData.topic}
                          onChange={(e) => setFormData({ ...formData, topic: e.target.value })}
                          className="w-full border rule-hairline bg-paperdim/30 px-3.5 py-3 rounded-lg text-sm text-ink outline-none focus:border-brass focus:bg-paper transition-all"
                        >
                          <option value="Candidate Inquiry">Candidate Inquiry</option>
                          <option value="Scheduling Assistance">Scheduling Assistance</option>
                          <option value="Passkey / ID Verification">Passkey / ID Verification Help</option>
                          <option value="General Question">General Question</option>
                        </select>
                      </div>

                      <div>
                        <label className="block font-mono text-xs uppercase tracking-widest2 text-muted mb-2">
                          Your Message *
                        </label>
                        <textarea
                          required
                          rows={4}
                          value={formData.message}
                          onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                          placeholder="Tell us how we can help you…"
                          className="w-full border rule-hairline bg-paperdim/30 p-3.5 rounded-lg text-sm text-ink outline-none focus:border-brass focus:bg-paper transition-all resize-y min-h-[120px]"
                        />
                      </div>

                      <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-ink text-paper py-4 rounded-lg font-mono text-xs uppercase tracking-widest2 hover:bg-brassdim transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                      >
                        {loading ? (
                          <span>Sending Message…</span>
                        ) : (
                          <>
                            <span>Submit Message</span>
                            <Send className="w-3.5 h-3.5" />
                          </>
                        )}
                      </button>
                    </form>
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Candidate FAQ Section */}
        <section id="faq" className="py-24 scroll-mt-20">
          <div className="mx-auto max-w-4xl px-6">
            <div className="text-center max-w-2xl mx-auto mb-16">
              <span className="font-mono text-xs uppercase tracking-widest2 text-brass mb-3 block">
                Frequently Asked Questions
              </span>
              <h2 className="font-display text-3xl sm:text-4xl text-ink font-medium">
                Everything you need to know before your interview
              </h2>
            </div>

            <div className="space-y-4">
              {faqs.map((faq, index) => {
                const isExpanded = expandedFaq === index;
                return (
                  <div
                    key={index}
                    className="border rule-hairline rounded-2xl bg-paper overflow-hidden transition-all"
                  >
                    <button
                      type="button"
                      onClick={() => setExpandedFaq(isExpanded ? null : index)}
                      className="w-full p-6 text-left flex items-center justify-between gap-4 hover:bg-paperdim/30 transition-colors"
                    >
                      <span className="font-display text-lg text-ink font-medium">
                        {faq.q}
                      </span>
                      <span className="text-brass shrink-0">
                        {isExpanded ? (
                          <ChevronUp className="w-5 h-5" />
                        ) : (
                          <ChevronDown className="w-5 h-5" />
                        )}
                      </span>
                    </button>

                    {isExpanded && (
                      <div className="px-6 pb-6 pt-2 text-sm text-muted leading-relaxed border-t rule-hairline animate-fade-up">
                        {faq.a}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
