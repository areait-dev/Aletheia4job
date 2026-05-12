'use client';

import { useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { useRouter, useSearchParams } from "next/navigation";
import { Briefcase, Mail, Lock, ArrowRight, Github } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function LoginPage() {
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
      {/* Background decor */}
      <div className="absolute top-0 left-0 w-full h-full -z-10 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary/10 via-background to-background" />
      <div className="absolute -top-24 -right-24 w-96 h-96 bg-primary/5 rounded-full blur-3xl animate-pulse" />
      <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-primary/5 rounded-full blur-3xl animate-pulse" />

      <div className="w-full max-w-md glass rounded-[3rem] p-10 shadow-2xl border-white/20 animate-in fade-in slide-in-from-bottom-8 duration-700">
        <div className="flex flex-col items-center text-center mb-10">
          <div className="bg-primary p-3 rounded-2xl shadow-lg shadow-primary/20 mb-6">
            <Briefcase className="text-white w-8 h-8" />
          </div>
          <h1 className="text-3xl font-black tracking-tight">Job <span className="text-primary italic">Aletheia</span></h1>
          <p className="text-muted-foreground mt-2 font-medium">Bentornato! Accedi per gestire i tuoi candidati.</p>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-2xl bg-red-500/10 border border-red-200 text-red-600 text-sm font-semibold animate-shake">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-5">
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground ml-1">Email</label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="nome@azienda.it"
                className="w-full h-12 pl-12 pr-4 rounded-2xl border bg-background/50 focus:ring-2 focus:ring-primary/20 outline-none transition-all"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground ml-1">Password</label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full h-12 pl-12 pr-4 rounded-2xl border bg-background/50 focus:ring-2 focus:ring-primary/20 outline-none transition-all"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full h-14 bg-primary text-primary-foreground font-black text-lg rounded-2xl hover:opacity-90 transition-all shadow-xl shadow-primary/20 flex items-center justify-center gap-2 group disabled:opacity-50"
          >
            {loading ? "Accesso in corso..." : "Accedi Ora"} 
            {!loading && <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />}
          </button>
        </form>

        <div className="mt-8 flex items-center gap-4">
          <div className="h-px bg-border flex-1" />
          <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Oppure continua con</span>
          <div className="h-px bg-border flex-1" />
        </div>

        <div className="mt-8 grid grid-cols-1 gap-3">
          <Button 
            onClick={handleGithubLogin}
            variant="outline" 
            className="h-12 rounded-2xl border-2 hover:bg-primary/5 transition-colors font-bold gap-3"
          >
            <Github className="w-5 h-5" /> GitHub
          </Button>
        </div>

        <p className="mt-10 text-center text-sm text-muted-foreground">
          Non hai un account? <span className="text-primary font-bold hover:underline cursor-pointer">Contatta l'amministratore</span>
        </p>
      </div>
    </div>
  );
}
