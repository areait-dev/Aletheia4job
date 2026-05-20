export const dynamic = 'force-dynamic';

import { getAllJobsAction } from "@/utils/actions";
import Link from "next/link";
import { Plus, Briefcase, MapPin, Users, Calendar } from "lucide-react";
import { cn } from "@/lib/utils";

export default async function PositionsPage() {
  const jobs = await getAllJobsAction();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Posizioni Aperte</h1>
          <p className="text-muted-foreground text-sm">Gestisci i job pubblicati sulla tua career page.</p>
        </div>
        <Link 
          href="/positions/new" 
          className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-xl text-sm font-semibold hover:bg-primary/90 transition-all shadow-lg shadow-primary/20"
        >
          <Plus className="w-4 h-4" /> Nuova Posizione
        </Link>
      </div>

      {jobs.length === 0 ? (
        <div className="glass rounded-3xl p-12 text-center space-y-4">
          <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto text-muted-foreground/30">
            <Briefcase className="w-8 h-8" />
          </div>
          <div className="space-y-1">
            <h3 className="font-bold">Nessuna posizione trovata</h3>
            <p className="text-sm text-muted-foreground">Inizia creando la tua prima offerta di lavoro.</p>
          </div>
          <Link 
            href="/positions/new" 
            className="text-primary text-sm font-semibold hover:underline"
          >
            Crea ora →
          </Link>
        </div>
      ) : (
        <div className="grid gap-4">
          {jobs.map((job: any) => (
            <Link 
              key={job.id} 
              href={`/positions/${job.id}`}
              className="group glass rounded-2xl p-5 hover:border-primary/30 transition-all duration-300 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
            >
              <div className="flex items-center gap-4 flex-1 min-w-0">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0 group-hover:scale-110 transition-transform">
                  <Briefcase className="w-6 h-6" />
                </div>
                <div className="min-w-0 flex-1">
                  <h2 className="font-bold text-base sm:text-lg leading-tight truncate">{job.title}</h2>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground mt-1">
                    <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{job.location}</span>
                    <span className="flex items-center gap-1"><Users className="w-3 h-3" />{job._count.applications} candidature</span>
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" /> 
                      {job.postedAt ? new Date(job.postedAt).toLocaleDateString("it-IT") : 'Non pubblicato'}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-2 sm:gap-2 w-full sm:w-auto shrink-0">
                <div className="flex items-center gap-1.5">
                  {job.postToCareerPage && (
                    <div title="Pubblicato su Career Page" className="w-5 h-5 rounded-md bg-emerald-500/15 flex items-center justify-center text-emerald-500 border border-emerald-500/30">
                      <span className="text-[10px] font-bold">C</span>
                    </div>
                  )}
                  {job.postToLinkedIn && (
                    <div title="Postato su LinkedIn" className="w-5 h-5 rounded-md bg-blue-500/15 flex items-center justify-center text-blue-400 border border-blue-500/30">
                      <span className="text-[10px] font-bold">L</span>
                    </div>
                  )}
                  {job.postToIndeed && (
                    <div title="Postato su Indeed" className="w-5 h-5 rounded-md bg-blue-500/15 flex items-center justify-center text-blue-400 border border-blue-500/30">
                      <span className="text-[10px] font-bold">i</span>
                    </div>
                  )}
                  {job.postToJooble && (
                    <div title="Postato su Jooble" className="w-5 h-5 rounded-md bg-orange-500/15 flex items-center justify-center text-orange-400 border border-orange-500/30">
                      <span className="text-[10px] font-bold">J</span>
                    </div>
                  )}
                  {job.broadbeanStatus === "PUBLISHED" && (
                    <div title="Pubblicato su Broadbean" className="w-5 h-5 rounded-md bg-purple-500/15 flex items-center justify-center text-purple-400 border border-purple-500/30">
                      <span className="text-[10px] font-bold">B</span>
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <span className={cn(
                    "text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider",
                    job.isActive ? "bg-green-500/15 text-green-600" : "bg-red-500/15 text-red-600"
                  )}>
                    {job.isActive ? "Attivo" : "Disabilitato"}
                  </span>
                  <span className="text-xs px-2.5 py-1 rounded-lg bg-muted font-medium text-muted-foreground">
                    {job.mode}
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
