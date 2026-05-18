export const dynamic = 'force-dynamic';

import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Briefcase, CheckCircle, Users, BarChart3, ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { getAuthContext } from "@/utils/authz";

async function resolveAuthOptional(): Promise<string | null> {
  try {
    const auth = await getAuthContext();
    return auth?.userId ?? null;
  } catch (error) {
    console.error("[home] getAuthContext failed:", error);
    return null;
  }
}

export default async function Home() {
  const userId = await resolveAuthOptional();

  return (
    <main className="min-h-screen overflow-hidden">
      <div className="fixed top-0 left-0 w-full h-full -z-10 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary/10 via-background to-background" />
      <div className="fixed top-1/2 left-1/3 w-[600px] h-[600px] bg-primary/3 rounded-full blur-[120px] -z-10" />

      <header className="max-w-7xl mx-auto px-6 sm:px-12 py-6 flex justify-between items-center animate-in fade-in slide-in-from-top-4 duration-700">
        <div className="flex items-center gap-3">
          <div className="bg-primary p-2 rounded-2xl shadow-lg shadow-primary/20">
             <Briefcase className="text-white w-5 h-5" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Job <span className="text-primary">Aletheia</span></h1>
        </div>
        
        <div className="flex items-center gap-3">
          {!userId ? (
            <>
              <Button asChild variant="ghost" className="font-semibold rounded-2xl px-5">
                <Link href="/login">Accedi</Link>
              </Button>
              <Button asChild className="rounded-2xl px-6 shadow-lg shadow-primary/20">
                <Link href="/login">Registrati</Link>
              </Button>
            </>
          ) : (
            <Button asChild className="rounded-2xl px-6 shadow-lg shadow-primary/20">
              <Link href="/add-job">Dashboard</Link>
            </Button>
          )}
        </div>
      </header>

      <section className="max-w-7xl mx-auto px-6 sm:px-12 pt-24 pb-32 grid lg:grid-cols-2 gap-16 items-center">
        <div className="space-y-8">
          <Badge variant="default" className="mb-2">
            <span className="w-1.5 h-1.5 bg-primary rounded-full mr-2 animate-pulse" />
            Nuova Versione 1.2.0
          </Badge>
          <h1 className="text-5xl md:text-7xl font-black tracking-tight leading-[1.05] text-balance">
            Gestisci i tuoi <br />
            <span className="text-primary italic">Candidati</span> con <br />
            precisione.
          </h1>
          <p className="text-lg text-muted-foreground max-w-xl leading-relaxed">
            <strong>Job Aletheia</strong> è la piattaforma moderna progettata per le agenzie per il lavoro. 
            Organizza i profili, traccia gli stati dei colloqui e gestisci i curriculum in modo sicuro e professionale, tutto in un unico posto.
          </p>
          
          <div className="flex flex-wrap gap-4 pt-2">
            {userId ? (
              <Button asChild size="lg" className="group">
                <Link href="/add-job" className="flex items-center gap-2">
                  Vai alla Dashboard <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </Link>
              </Button>
            ) : (
              <Button asChild size="lg" className="group">
                <Link href="/sign-up" className="flex items-center gap-2">
                  Inizia Subito <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </Link>
              </Button>
            )}
          </div>

          <div className="flex gap-10 pt-8 border-t border-border/50">
            <div className="space-y-1">
              <div className="text-3xl font-black text-primary">100%</div>
              <div className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">Sicurezza</div>
            </div>
            <div className="space-y-1">
              <div className="text-3xl font-black text-primary">PDF</div>
              <div className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">Integrazione</div>
            </div>
            <div className="space-y-1">
              <div className="text-3xl font-black text-primary">LIVE</div>
              <div className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">Tracking</div>
            </div>
          </div>
        </div>

        <div className="relative hidden lg:block">
           <div className="absolute -inset-6 bg-primary/15 rounded-[4rem] blur-[80px] -z-10" />
           <div className="glass p-10 rounded-[3rem] shadow-2xl space-y-8 relative overflow-hidden border-white/30 dark:border-white/5">
              <div className="flex items-center gap-5 bg-white/60 dark:bg-white/5 p-6 rounded-2xl backdrop-blur-sm hover:bg-white/80 dark:hover:bg-white/10 transition-colors">
                <div className="bg-primary w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-primary/30">
                  <CheckCircle className="w-6 h-6" />
                </div>
                <div>
                  <div className="font-bold text-sm">Candidato Sincronizzato</div>
                  <div className="text-xs text-muted-foreground/70">Appena inserito nel database</div>
                </div>
              </div>

              <div className="flex items-center gap-5 bg-white/60 dark:bg-white/5 p-6 rounded-2xl backdrop-blur-sm ml-8 hover:bg-white/80 dark:hover:bg-white/10 transition-colors">
                <div className="bg-accent w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-accent/30">
                  <Users className="w-6 h-6" />
                </div>
                <div>
                  <div className="font-bold text-sm">Database Centralizzato</div>
                  <div className="text-xs text-muted-foreground/70">Accesso rapido ai curriculum</div>
                </div>
              </div>

              <div className="flex items-center gap-5 bg-white/60 dark:bg-white/5 p-6 rounded-2xl backdrop-blur-sm hover:bg-white/80 dark:hover:bg-white/10 transition-colors">
                <div className="bg-primary w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-primary/30">
                  <BarChart3 className="w-6 h-6" />
                </div>
                <div>
                  <div className="font-bold text-sm">Statistiche Avanzate</div>
                  <div className="text-xs text-muted-foreground/70">Monitora il successo dei piazzamenti</div>
                </div>
              </div>
           </div>
        </div>
      </section>
    </main>
  );
}
