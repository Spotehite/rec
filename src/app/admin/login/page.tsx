"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function AdminLoginPage() {
  const router = useRouter();
  const supabase = createClient();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    router.push("/admin");
    router.refresh();
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-paper px-6">
      <div className="w-full max-w-sm">
        <p className="font-mono text-xs uppercase tracking-widest2 text-brass mb-3 text-center">
          Admin
        </p>
        <h1 className="font-display text-3xl text-ink text-center mb-10">Sign in</h1>

        {error && (
          <p className="mb-6 rounded-sm border border-rejected/30 bg-rejected/5 px-4 py-3 text-sm text-rejected">
            {error}
          </p>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="font-mono text-xs uppercase tracking-widest2 text-muted">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-2 w-full border-b-2 rule-hairline bg-transparent py-2 text-ink outline-none focus:border-brass transition-colors"
              autoFocus
            />
          </div>
          <div>
            <label className="font-mono text-xs uppercase tracking-widest2 text-muted">Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-2 w-full border-b-2 rule-hairline bg-transparent py-2 text-ink outline-none focus:border-brass transition-colors"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-ink text-paper py-4 font-mono text-xs uppercase tracking-widest2 hover:bg-brassdim transition-colors disabled:opacity-50"
          >
            {loading ? "Signing in…" : "Sign In"}
          </button>
        </form>
      </div>
    </div>
  );
}
