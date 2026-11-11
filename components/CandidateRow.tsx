import Link from "next/link";
import { MapPin, ChevronRight } from "lucide-react";
import { cn, getScoreColor } from "@/lib/utils";
import { CandidateType } from "@/utils/types";

// Riga compatta per le liste d'archivio: il dettaglio completo (contatti,
// cambio stato, PDF, eliminazione) è nella pagina del candidato.
export default function CandidateRow({ candidate }: { candidate: CandidateType }) {
  const initials = `${candidate.firstName?.[0] ?? ""}${candidate.lastName?.[0] ?? ""}`.toUpperCase();
  const city = !candidate.city || candidate.city === "N/D" ? null : candidate.city;
  const showScore = candidate.matchingScore !== null && candidate.matchingScore !== undefined;
  const date = candidate.createdAt
    ? new Date(candidate.createdAt).toLocaleDateString("it-IT", { day: "2-digit", month: "short", year: "2-digit" })
    : "";

  return (
    <Link
      href={`/archivio/${candidate.id}`}
      className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-white border border-slate-100 hover:border-primary/30 hover:shadow-sm transition-all group"
    >
      <div className="w-8 h-8 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center shrink-0">
        {initials || "?"}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-bold text-slate-900 truncate">
          {candidate.firstName} {candidate.lastName}
        </p>
        <p className="text-xs text-slate-500 truncate">{candidate.role || "—"}</p>
      </div>
      {city && (
        <span className="hidden md:flex items-center gap-1 text-xs text-slate-400 shrink-0">
          <MapPin className="w-3 h-3" />
          {city}
        </span>
      )}
      {date && <span className="hidden sm:block text-xs text-slate-400 shrink-0">{date}</span>}
      {showScore && (
        <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-md border shrink-0", getScoreColor(candidate.matchingScore))}>
          {candidate.matchingScore}%
        </span>
      )}
      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-slate-50 border border-slate-100 text-slate-600 shrink-0 max-w-[90px] truncate">
        {candidate.status}
      </span>
      <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-primary shrink-0" />
    </Link>
  );
}
