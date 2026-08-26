'use client';

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Building2, Mail, Lock, Phone, FileDigit, Briefcase, ArrowRight, MailCheck } from "lucide-react";
import { signUpOrganizationAction } from "@/utils/actions";

const SECTOR_OPTIONS = [
  "Agenzia per il Lavoro generalista",
  "Ricerca & Selezione specializzata",
  "Somministrazione",
  "Altro",
];

const VAT_NUMBER_PATTERN = "\\d{11}";

export function CompanySignUpForm() {
  const [companyName, setCompanyName] = useState("");
  const [vatNumber, setVatNumber] = useState("");
  const [phone, setPhone] = useState("");
  const [sector, setSector] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [marketingConsent, setMarketingConsent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [awaitingConfirmation, setAwaitingConfirmation] = useState(false);

  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const result = await signUpOrganizationAction({
      companyName,
      email,
      password,
      vatNumber,
      phone,
      sector: sector || undefined,
      termsAccepted,
      marketingConsent,
    });

    if (!result.ok) {
      setError(result.error ?? "Registrazione non riuscita");
      setLoading(false);
      return;
    }

    if (result.requiresEmailConfirmation) {
      setAwaitingConfirmation(true);
      setLoading(false);
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6 relative overflow-hidden">
      <div className="fixed top-0 left-0 w-full h-full -z-10 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary/10 via-background to-background" />
      <div className="fixed -top-24 -right-24 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
      <div className="fixed -bottom-24 -left-24 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />

      <div className="w-full max-w-md glass rounded-[2.5rem] p-10 shadow-2xl shadow-black/5 dark:shadow-black/20 animate-in fade-in slide-in-from-bottom-8 duration-700">
        <div className="flex flex-col items-center text-center mb-8">
          {/* Wordmark testuale: pagina pubblica multi-agenzia, niente logo Aletheia APL specifico */}
          <p className="text-sm font-black tracking-tight text-muted-foreground mb-6">
            Aletheia<span className="text-primary">4Job</span>
          </p>
          <h1 className="text-3xl font-black tracking-tight">Registra la tua <span className="text-primary">azienda</span></h1>
          <p className="text-muted-foreground mt-1.5 text-sm font-medium">Crea il tuo spazio dedicato per pubblicare annunci e gestire candidature.</p>
        </div>

        {awaitingConfirmation ? (
          <div className="p-6 rounded-2xl bg-primary/10 border border-primary/20 text-center space-y-3">
            <MailCheck className="w-8 h-8 mx-auto text-primary" />
            <p className="text-sm font-semibold text-foreground">Controlla la tua casella email</p>
            <p className="text-sm text-muted-foreground">
              Ti abbiamo inviato un link di conferma a <span className="font-semibold">{email}</span>. Confermalo per accedere alla dashboard della tua azienda.
            </p>
          </div>
        ) : (
          <>
            {error && (
              <div className="mb-6 p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-600 text-sm font-semibold">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground ml-1">Nome azienda</label>
                <div className="relative">
                  <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/60" />
                  <input
                    type="text"
                    required
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    placeholder="Ragione sociale"
                    className="w-full h-12 pl-11 pr-4 rounded-2xl border-2 border-border bg-background/50 focus:border-primary/40 focus:ring-0 outline-none transition-all text-sm"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground ml-1">Partita IVA</label>
                <div className="relative">
                  <FileDigit className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/60" />
                  <input
                    type="text"
                    required
                    inputMode="numeric"
                    pattern={VAT_NUMBER_PATTERN}
                    title="11 cifre numeriche"
                    value={vatNumber}
                    onChange={(e) => setVatNumber(e.target.value)}
                    placeholder="12345678901"
                    className="w-full h-12 pl-11 pr-4 rounded-2xl border-2 border-border bg-background/50 focus:border-primary/40 focus:ring-0 outline-none transition-all text-sm"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground ml-1">Telefono</label>
                <div className="relative">
                  <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/60" />
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+39 02 1234567"
                    className="w-full h-12 pl-11 pr-4 rounded-2xl border-2 border-border bg-background/50 focus:border-primary/40 focus:ring-0 outline-none transition-all text-sm"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground ml-1">Settore (opzionale)</label>
                <div className="relative">
                  <Briefcase className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/60 pointer-events-none" />
                  <select
                    value={sector}
                    onChange={(e) => setSector(e.target.value)}
                    className="w-full h-12 pl-11 pr-4 rounded-2xl border-2 border-border bg-background/50 focus:border-primary/40 focus:ring-0 outline-none transition-all text-sm appearance-none"
                  >
                    <option value="">Preferisco non specificare</option>
                    {SECTOR_OPTIONS.map((option) => (
                      <option key={option} value={option}>{option}</option>
                    ))}
                  </select>
                </div>
              </div>

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
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full h-12 pl-11 pr-4 rounded-2xl border-2 border-border bg-background/50 focus:border-primary/40 focus:ring-0 outline-none transition-all text-sm"
                  />
                </div>
              </div>

              <label className="flex items-start gap-2.5 text-xs text-muted-foreground leading-relaxed cursor-pointer">
                <input
                  type="checkbox"
                  required
                  checked={termsAccepted}
                  onChange={(e) => setTermsAccepted(e.target.checked)}
                  className="mt-0.5 h-4 w-4 shrink-0 rounded border-2 border-border accent-primary"
                />
                <span>
                  Dichiaro di aver letto e accettato i{" "}
                  <a href="/aziende/termini" target="_blank" rel="noopener noreferrer" className="text-primary font-semibold hover:underline">Termini di Servizio</a>
                  {" "}e la{" "}
                  <a href="/aziende/privacy-azienda" target="_blank" rel="noopener noreferrer" className="text-primary font-semibold hover:underline">Privacy Policy</a>
                </span>
              </label>

              <label className="flex items-start gap-2.5 text-xs text-muted-foreground leading-relaxed cursor-pointer">
                <input
                  type="checkbox"
                  checked={marketingConsent}
                  onChange={(e) => setMarketingConsent(e.target.checked)}
                  className="mt-0.5 h-4 w-4 shrink-0 rounded border-2 border-border accent-primary"
                />
                <span>Desidero ricevere comunicazioni commerciali e novità su Aletheia4Job (facoltativo)</span>
              </label>

              <button
                type="submit"
                disabled={loading}
                className="w-full h-12 bg-gradient-to-br from-primary to-primary/90 text-primary-foreground font-bold text-base rounded-2xl hover:opacity-90 transition-all shadow-xl shadow-primary/30 flex items-center justify-center gap-2 group disabled:opacity-50 active:scale-[0.98]"
              >
                {loading ? "Registrazione in corso..." : "Registra azienda"}
                {!loading && <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />}
              </button>
            </form>

            <p className="mt-6 text-center text-xs text-muted-foreground leading-relaxed">
              Gratuito per i primi 12 mesi. Successivamente valuteremo insieme un piano in base all&apos;utilizzo.
            </p>

            <p className="mt-4 text-center text-sm text-muted-foreground">
              Hai già un account?{' '}
              <a href="/login" className="text-primary font-bold hover:underline">Accedi</a>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
