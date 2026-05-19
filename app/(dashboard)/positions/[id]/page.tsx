import { getSingleJobAction } from "@/utils/actions";
import { notFound } from "next/navigation";
import Link from "next/link";
import { 
  ArrowLeft, 
  Briefcase, 
  MapPin, 
  Users, 
  Calendar, 
  FileText, 
  ExternalLink,
  ChevronRight,
  Clock,
  Loader2
} from "lucide-react";
import { cn, getScoreColor } from "@/lib/utils";
import DeleteJobButton from "@/components/DeleteJobButton";
import ApplicationStatusSelect from "@/components/ApplicationStatusSelect";
import AnalyzeAIButton from "@/components/AnalyzeAIButton";
import BroadbeanSection from "@/components/BroadbeanSection";

export default async function JobDetailPage({ params }: { params: { id: string } }) {
  const job = await getSingleJobAction(params.id);
  if (!job) notFound();

  const applications = job.applications || [];

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <Link 
            href="/positions" 
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors mb-2"
          >
            <ArrowLeft className="w-4 h-4" /> Torna alle posizioni
          </Link>
          <h1 className="text-3xl font-bold tracking-tight">{job.title}</h1>
          <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5"><Briefcase className="w-4 h-4" />{job.company}</span>
            <span className="flex items-center gap-1.5"><MapPin className="w-4 h-4" />{job.location}</span>
            <span className="flex items-center gap-1.5"><Clock className="w-4 h-4" />{job.mode}</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href={`/careers/${job.id}`}
            target="_blank"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-border text-sm font-semibold hover:bg-muted transition-all"
          >
            <ExternalLink className="w-4 h-4" /> Vedi Career Page
          </Link>
          <Link
            href={`/positions/${job.id}/edit`}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-all shadow-lg shadow-primary/20"
          >
            Modifica
          </Link>
          <DeleteJobButton jobId={job.id} jobTitle={job.title} />
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Left Column: Applications */}
        <div className="lg:col-span-2 space-y-6">
          <div className="glass rounded-3xl p-6 space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <Users className="w-5 h-5 text-primary" />
                Candidature Ricevute ({applications.length})
              </h2>
            </div>

            {applications.length === 0 ? (
              <div className="text-center py-12 space-y-3">
                <Users className="w-12 h-12 text-muted-foreground/20 mx-auto" />
                <p className="text-muted-foreground">Nessuna candidatura ricevuta per questa posizione.</p>
              </div>
            ) : (
              <div className="divide-y divide-border/50">
                {applications.map((app: any) => (
                  <div key={app.id} className="py-4 first:pt-0 last:pb-0 flex items-center justify-between group">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">
                        {app.candidate.firstName[0]}{app.candidate.lastName[0]}
                      </div>
                      <div>
                        <Link 
                          href={`/jobs/${app.candidateId}`} 
                          className="font-bold hover:text-primary transition-colors block"
                        >
                          {app.candidate.firstName} {app.candidate.lastName}
                        </Link>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                          <span>{app.candidate.email}</span>
                          <span>•</span>
                          <span>{new Date(app.createdAt).toLocaleDateString("it-IT")}</span>
                          {(() => {
                            const ps = app.parsingStatus;
                            if (ps === "PENDING" || ps === "PROCESSING") {
                              return (
                                <>
                                  <span>•</span>
                                  <span className="inline-flex items-center gap-1 font-bold px-1.5 py-0.5 rounded-lg text-[10px] bg-amber-50 dark:bg-amber-950/20 text-amber-600 border border-amber-400">
                                    <Loader2 className="w-2.5 h-2.5 animate-spin" />
                                    Analisi in corso...
                                  </span>
                                </>
                              );
                            }
                            if (ps === "FAILED") {
                              return (
                                <>
                                  <span>•</span>
                                  <span className="font-bold px-1.5 py-0.5 rounded-lg text-[10px] bg-red-100 dark:bg-red-950/30 text-red-600 border border-red-300">
                                    Parsing Fallito
                                  </span>
                                </>
                              );
                            }
                            const score = app.matchingScore ?? app.candidate.matchingScore;
                            if (score !== null && score !== undefined) {
                              return (
                                <>
                                  <span>•</span>
                                  <span className={cn("font-bold px-1.5 py-0.5 rounded-lg text-[10px]", getScoreColor(score))}>
                                    {score}% Match
                                  </span>
                                </>
                              );
                            }
                            return null;
                          })()}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {app.jobId && (
                        <AnalyzeAIButton 
                          candidateId={app.candidateId} 
                          jobId={app.jobId}
                        />
                      )}
                      <ApplicationStatusSelect 
                        applicationId={app.id} 
                        currentStatus={app.status} 
                      />
                      <Link 
                        href={`/jobs/${app.candidateId}`}
                        className="p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-primary transition-all"
                      >
                        <ChevronRight className="w-5 h-5" />
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Job Info & Stats */}
        <div className="space-y-6">
          <div className="glass rounded-3xl p-6 space-y-6">
            <h3 className="font-bold text-lg">Dettagli Job</h3>
            <div className="space-y-4">
              <InfoItem icon={<Calendar className="w-4 h-4" />} label="Data Pubblicazione" value={job.postedAt ? new Date(job.postedAt).toLocaleDateString("it-IT") : 'N/D'} />
              <InfoItem icon={<Briefcase className="w-4 h-4" />} label="Settore" value={job.sector} />
              <InfoItem icon={<Clock className="w-4 h-4" />} label="Modalità" value={job.mode} />
              <div className="pt-4 border-t border-border/50">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Visibilità</p>
                <div className="flex items-center gap-2">
                  <div className={cn("w-2 h-2 rounded-full", job.isActive ? "bg-green-500" : "bg-red-500")} />
                  <span className="text-sm font-medium">{job.isActive ? "Pubblicato su Career Page" : "Privato / Chiuso"}</span>
                </div>
              </div>
            </div>
          </div>

          <BroadbeanSection
            jobId={job.id}
            broadbeanStatus={job.broadbeanStatus}
            broadbeanError={job.broadbeanError}
          />

          <div className="glass rounded-3xl p-6 space-y-4 bg-primary/5 border-primary/10">
            <h3 className="font-bold flex items-center gap-2 italic">
              <FileText className="w-4 h-4" /> Anteprima Requisiti
            </h3>
            <div className="text-xs text-muted-foreground line-clamp-6 leading-relaxed">
              {job.requirements}
            </div>
            <Link href={`/positions/${job.id}/edit`} className="text-xs font-bold text-primary hover:underline block">
              Modifica requisiti →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

function InfoItem({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3">
      <div className="mt-0.5 text-primary">{icon}</div>
      <div>
        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider leading-none mb-1">{label}</p>
        <p className="text-sm font-medium">{value}</p>
      </div>
    </div>
  );
}
