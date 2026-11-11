'use client';

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Mail, Lock, ArrowRight } from "lucide-react";
import Logo from "@/components/Logo";
import { createClient } from "@/utils/supabase/client";

const INPUT =
  "w-full h-12 pl-11 pr-4 rounded-2xl border-2 border-border bg-background/50 focus:border-primary/40 focus:ring-0 outline-none transition-all text-sm";
const BUTTON =
  "w-full h-12 bg-gradient-to-br from-primary to-primary/90 text-primary-foreground font-bold text-base rounded-2xl hover:opacity-90 transition-all shadow-xl shadow-primary/30 flex items-center justify-center gap-2 group disabled:opacity-50 active:scale-[0.98]";

function Shell({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center p-6 relative overflow-hidden">
      <div className="fixed top-0 left-0 w-full h-full -z-10 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary/10 via-background to-background" />
      <div className="w-full max-w-md glass rounded-[2.5rem] p-10 shadow-2xl shadow-black/5 dark:shadow-black/20">
        <div className="flex flex-col items-center text-center mb-8">
          <div className="mb-6">
            <Logo size={56} showText={false} />
          </div>
          <h1 className="text-2xl font-black tracking-tight">{title}</h1>
          <p className="text-muted-foreground mt-1.5 text-sm font-medium">{subtitle}</p>
        </div>
        {children}
      </div>
    </div>
  );
}

function ErrorBox({ message }: { message: string }) {
  return (
    <div className="mb-6 p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-600 text-sm font-semibold">
      {message}
    </div>
  );
}

/** Passo 1: l'utente inserisce l'email e riceve il link di recupero. */
export function RichiediReimpostazioneForm() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const redirectTo = `${window.location.origin}/auth/callback?next=/reimposta-password/nuova`;
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo });
    setLoading(false);
    // Stessa risposta anche se l'email non esiste, per non rivelare quali account sono registrati.
    // Si mostra un errore solo per problemi non legati all'esistenza dell'utente (es. troppe richieste).
    if (error && error.status === 429) {
      setError("Troppe richieste. Riprova tra qualche minuto.");
      return;
    }
    setSent(true);
  }

  if (sent) {
    return (
      <Shell title="Controlla la tua email" subtitle="Se l'indirizzo è registrato, riceverai un link per scegliere una nuova password.">
        <p className="text-sm text-muted-foreground text-center mb-6">
          Il link è valido per un tempo limitato. Controlla anche la cartella spam.
        </p>
        <Link href="/login" className="block text-center text-sm font-bold text-primary hover:underline">
          Torna all&apos;accesso
        </Link>
      </Shell>
    );
  }

  return (
    <Shell title="Password dimenticata?" subtitle="Inserisci la tua email: ti invieremo un link per reimpostarla.">
      {error && <ErrorBox message={error} />}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <label className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground ml-1">Email</label>
          <div className="relative">
            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/60" />
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="nome@azienda.it" className={INPUT} />
          </div>
        </div>
        <button type="submit" disabled={loading} className={BUTTON}>
          {loading ? "Invio in corso..." : "Invia il link"}
          {!loading && <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />}
        </button>
      </form>
      <Link href="/login" className="block mt-6 text-center text-sm font-bold text-primary hover:underline">
        Torna all&apos;accesso
      </Link>
    </Shell>
  );
}

/** Passo 2: dopo il link nell'email l'utente ha una sessione di recupero e sceglie la nuova password. */
export function NuovaPasswordForm() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password.length < 8) return setError("La password deve avere almeno 8 caratteri.");
    if (password !== confirm) return setError("Le due password non coincidono.");

    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <Shell title="Scegli una nuova password" subtitle="Usa almeno 8 caratteri.">
      {error && <ErrorBox message={error} />}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <label className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground ml-1">Nuova password</label>
          <div className="relative">
            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/60" />
            <input type="password" required minLength={8} autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} className={INPUT} />
          </div>
        </div>
        <div className="space-y-1.5">
          <label className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground ml-1">Ripeti la password</label>
          <div className="relative">
            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/60" />
            <input type="password" required minLength={8} autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} className={INPUT} />
          </div>
        </div>
        <button type="submit" disabled={loading} className={BUTTON}>
          {loading ? "Salvataggio..." : "Salva la password"}
          {!loading && <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />}
        </button>
      </form>
    </Shell>
  );
}
