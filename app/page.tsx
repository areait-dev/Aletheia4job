import Image from "next/image";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Briefcase, CheckCircle, Users, BarChart3, ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { getAuthContext } from "@/utils/authz";

export default async function Home() {
  const auth = await getAuthContext();
  const userId = auth?.userId;

  return (
    <main className="min-h-screen overflow-hidden">
      {/* Background Decor */}
      <div className="absolute top-0 left-0 w-full h-full -z-10 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary/10 via-background to-background" />
      
      <header className="max-w-7xl mx-auto px-6 sm:px-12 py-8 flex justify-between items-center animate-in fade-in slide-in-from-top-4 duration-700">
        <div className="flex items-center gap-2">
          <div className="bg-primary p-2 rounded-xl">
             <Briefcase className="text-white w-6 h-6" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Job <span className="text-primary">Aletheia</span></h1>
        </div>
        
        <div className="flex gap-4">
          {!userId ? (
            <>
              <Button asChild variant="ghost" className="font-semibold">
                <Link href="/login">Accedi</Link>
              </Button>
              <Button asChild className="rounded-xl px-6 shadow-lg shadow-primary/20">
                <Link href="/login">Registrati</Link>
              </Button>
            </>
          ) : (
            <Button asChild className="rounded-xl px-6 shadow-lg shadow-primary/20">
              <Link href="/add-job">Dashboard</Link>
            </Button>
          )}
        </div>
      </header>

      <section className="max-w-7xl mx-auto px-6 sm:px-12 pt-20 pb-32 grid lg:grid-cols-2 gap-16 items-center">
        <div className="animate-in fade-in slide-in-from-left-8 duration-1000">
          <Badge className="bg-primary/10 text-primary hover:bg-primary/20 transition-colors px-4 py-1 mb-6 rounded-full border-none">
            Nuova Versione 1.2.0
          </Badge>
          <h1 className="text-5xl md:text-7xl font-black tracking-tight leading-[1.1]">
            Gestisci i tuoi <br />
            <span className="text-primary italic">Candidati</span> con <br />
            precisione.
          </h1>
          <p className="text-lg text-muted-foreground mt-8 max-w-xl leading-relaxed">
            <strong>Job Aletheia</strong> è la piattaforma moderna progettata per le agenzie per il lavoro. 
            Organizza i profili, traccia gli stati dei colloqui e gestisci i curriculum in modo sicuro e professionale, tutto in un unico posto.
          </p>
          
          <div className="flex flex-wrap gap-4 mt-12">
            {userId ? (
              <Button asChild size="lg" className="rounded-2xl px-8 h-14 text-lg shadow-xl shadow-primary/30 group">
                <Link href="/add-job" className="flex items-center gap-2">
                  Vai alla Dashboard <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </Link>
              </Button>
            ) : (
              <Button asChild size="lg" className="rounded-2xl px-8 h-14 text-lg shadow-xl shadow-primary/30 group">
                <Link href="/sign-up" className="flex items-center gap-2">
                  Inizia Subito <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </Link>
              </Button>
            )}
          </div>

          <div className="grid grid-cols-3 gap-8 mt-16 pt-12 border-t">
            <div className="space-y-1">
              <div className="text-2xl font-bold">100%</div>
              <div className="text-xs text-muted-foreground uppercase font-bold tracking-widest">Sicurezza</div>
            </div>
            <div className="space-y-1">
              <div className="text-2xl font-bold">PDF</div>
              <div className="text-xs text-muted-foreground uppercase font-bold tracking-widest">Integrazione</div>
            </div>
            <div className="space-y-1">
              <div className="text-2xl font-bold">LIVE</div>
              <div className="text-xs text-muted-foreground uppercase font-bold tracking-widest">Tracking</div>
            </div>
          </div>
        </div>

        <div className="relative animate-in fade-in slide-in-from-right-8 duration-1000 hidden lg:block">
           <div className="absolute -inset-4 bg-primary/20 rounded-[3rem] blur-3xl -z-10 animate-pulse" />
           <div className="glass p-12 rounded-[3.5rem] border-white/20 shadow-2xl space-y-12 relative overflow-hidden">
              <div className="flex items-center gap-4 bg-white/50 p-6 rounded-3xl">
                <div className="bg-primary w-12 h-12 rounded-2xl flex items-center justify-center text-white">
                  <CheckCircle className="w-6 h-6" />
                </div>
                <div>
                  <div className="font-bold">Candidato Sincronizzato</div>
                  <div className="text-xs text-muted-foreground">Appena inserito nel database</div>
                </div>
              </div>

              <div className="flex items-center gap-4 bg-white/50 p-6 rounded-3xl translate-x-8">
                <div className="bg-accent w-12 h-12 rounded-2xl flex items-center justify-center text-white">
                  <Users className="w-6 h-6" />
                </div>
                <div>
                  <div className="font-bold">Database Centralizzato</div>
                  <div className="text-xs text-muted-foreground">Accesso rapido ai curriculum</div>
                </div>
              </div>

              <div className="flex items-center gap-4 bg-white/50 p-6 rounded-3xl">
                <div className="bg-primary w-12 h-12 rounded-2xl flex items-center justify-center text-white">
                  <BarChart3 className="w-6 h-6" />
                </div>
                <div>
                  <div className="font-bold">Statistiche Avanzate</div>
                  <div className="text-xs text-muted-foreground">Monitora il successo dei piazzamenti</div>
                </div>
              </div>
           </div>
        </div>
      </section>
    </main>
  );
}
