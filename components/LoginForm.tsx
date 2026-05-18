'use client';

import { useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { useRouter, useSearchParams } from "next/navigation";
import { Briefcase, Mail, Lock, ArrowRight, Github } from "lucide-react";
import { Button } from "@/components/ui/button";

export function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();
  
  const nextPath = searchParams.get("redirect_url") || "/dashboard";

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    
    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      router.push(nextPath);
      router.refresh();
    }
  }

  async function handleGithubLogin() {
    await supabase.auth.signInWithOAuth({
      provider: 'github',
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${nextPath}`
      }
    });
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6 relative overflow-hidden">
      <div className="fixed top-0 left-0 w-full h-full -z-10 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary/10 via-background to-background" />
      <div className="fixed -top-24 -right-24 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
      <div className="fixed -bottom-24 -left-24 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />

      <div className="w-full max-w-md glass rounded-[2.5rem] p-10 shadow-2xl shadow-black/5 dark:shadow-black/20 animate-in fade-in slide-in-from-bottom-8 duration-700">
        <div className="flex flex-col items-center text-center mb-8">
          <div className="bg-gradient-to-br from-primary to-primary/80 p-3.5 rounded-2xl shadow-xl shadow-primary/30 mb-6">
            <Briefcase className="text-white w-7 h-7" />
          </div>
          <h1 className="text-3xl font-black tracking-tight">Job <span className="text-primary">Aletheia</span></h1>
          <p className="text-muted-foreground mt-1.5 text-sm font-medium">Bentornato! Accedi per gestire i tuoi candidati.</p>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-600 text-sm font-semibold">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground ml-1">Email</label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/60" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="nome@azienda.it"
                className="w-full h-12 pl-11 pr-4 rounded-2xl border-2 border-border bg-background/50 focus:border-primary/40 focus:ring-0 outline-none transition-all text-sm"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground ml-1">Password</label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/60" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full h-12 pl-11 pr-4 rounded-2xl border-2 border-border bg-background/50 focus:border-primary/40 focus:ring-0 outline-none transition-all text-sm"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full h-12 bg-gradient-to-br from-primary to-primary/90 text-primary-foreground font-bold text-base rounded-2xl hover:opacity-90 transition-all shadow-xl shadow-primary/30 flex items-center justify-center gap-2 group disabled:opacity-50 active:scale-[0.98]"
          >
            {loading ? "Accesso in corso..." : "Accedi Ora"} 
            {!loading && <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />}
          </button>
        </form>

        <div className="my-8 flex items-center gap-4">
          <div className="h-px bg-border/50 flex-1" />
          <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">Oppure continua con</span>
          <div className="h-px bg-border/50 flex-1" />
        </div>

        <Button
          onClick={handleGithubLogin}
          variant="outline"
          className="w-full h-12 rounded-2xl border-2 border-border bg-background/50 hover:bg-primary/5 hover:border-primary/30 transition-all font-bold gap-3 text-sm"
        >
          <Github className="w-5 h-5" /> GitHub
        </Button>

        <p className="mt-8 text-center text-sm text-muted-foreground">
          Non hai un account?{' '}
          <span className="text-primary font-bold hover:underline cursor-pointer">Contatta l'amministratore</span>
        </p>
      </div>
    </div>
  );
}
