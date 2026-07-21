import { getSingleJobAction } from "@/utils/actions";
import { notFound } from "next/navigation";
import Link from "next/link";
import { 
  ArrowLeft, 
  Briefcase, 
  MapPin, 
  Calendar, 
  FileText, 
  ExternalLink,
  Clock,
} from "lucide-react";
import { cn } from "@/lib/utils";
import DeleteJobButton from "@/components/DeleteJobButton";
import PositionApplicationsList from "@/components/PositionApplicationsList";

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
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">{job.title}</h1>
          <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5"><Briefcase className="w-4 h-4" />{job.company}</span>
            <span className="flex items-center gap-1.5"><MapPin className="w-4 h-4" />{job.location}</span>
            <span className="flex items-center gap-1.5"><Clock className="w-4 h-4" />{job.mode}</span>
          </div>
        </div>
                    <div className="flex items-center gap-3 flex-wrap">
          <Link
            href={`/offerte-di-lavoro/${job.id}`}
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
          <PositionApplicationsList
            jobId={job.id}
            initialApplications={applications}
          />
        </div>

        {/* Right Column: Job Info & Stats */}
        <div className="space-y-6">
          <div className="glass rounded-2xl sm:rounded-3xl p-4 sm:p-6 space-y-6">
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

          <div className="glass rounded-2xl sm:rounded-3xl p-4 sm:p-6 space-y-4 bg-primary/5 border-primary/10">
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
