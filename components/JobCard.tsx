import { CandidateType, CandidateStatus } from '@/utils/types';
import { MapPin, Mail, Phone, Download, Trash2, Loader2, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { exportCandidateToPDF } from '@/utils/pdfExport';
import { useState, useCallback } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { updateCandidateStatusAction, deleteCandidateAction } from '@/utils/actions';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from './ui/use-toast';
import { cn, getScoreColor } from '@/lib/utils';

import AnalyzeAIButton from './AnalyzeAIButton';

// Email fittizia generata dagli script di import quando non è stato possibile
// estrarre un indirizzo reale dal CV (vedi scripts/import-cv-archive.ts e
// scripts/storage-recover-orphans.ts, dominio "@non-estratto.local").
const PLACEHOLDER_EMAIL_DOMAIN = '@non-estratto.local';

// Formattazione SOLO per la visualizzazione (non modifica il dato a DB):
// normalizza un numero italiano in "+39 XXX XXX XXXX". Se il formato non è
// riconoscibile come numero italiano standard, mostra il valore originale
// così com'è salvato, senza inventare o troncare cifre.
function formatPhoneDisplay(raw: string | null): string {
  if (!raw || !raw.trim()) return '—';
  let digits = raw.replace(/\D/g, '');
  if (digits.startsWith('0039')) digits = digits.slice(4);
  else if (digits.startsWith('39') && digits.length > 10) digits = digits.slice(2);

  if (digits.length === 10) {
    return `+39 ${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6)}`;
  }
  if (digits.length === 9) {
    return `+39 ${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6)}`;
  }
  return raw;
}

function CandidateCard({ candidate }: { candidate: CandidateType }) {
  const [isExporting, setIsExporting] = useState(false);
  const queryClient = useQueryClient();

  const initials = `${candidate.firstName?.[0] ?? ''}${candidate.lastName?.[0] ?? ''}`.toUpperCase();

  const handleExport = useCallback(async () => {
    setIsExporting(true);
    await exportCandidateToPDF(candidate);
    setIsExporting(false);
  }, [candidate]);

  const updateStatusMutation = useMutation({
    mutationFn: ({ candidateId, status }: { candidateId: string; status: string }) =>
      updateCandidateStatusAction(candidateId, status),
    onSuccess: (updatedCandidate) => {
      if (updatedCandidate) {
        queryClient.invalidateQueries({ queryKey: ['candidates-grouped'] });
        queryClient.invalidateQueries({ queryKey: ['candidates'] });
        queryClient.invalidateQueries({ queryKey: ['stats'] });
        toast({ title: "Stato aggiornato", description: `Il candidato è ora "${updatedCandidate.status}"` });
      }
    },
    onError: () => {
      toast({ title: "Errore", description: "Impossibile aggiornare lo stato del candidato", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteCandidateAction(candidate.id),
    onSuccess: (success) => {
      if (success) {
        queryClient.invalidateQueries({ queryKey: ['candidates-grouped'] });
        queryClient.invalidateQueries({ queryKey: ['stats'] });
        toast({ title: "Candidato eliminato", description: "Il candidato è stato rimosso dall'archivio." });
      } else {
        toast({ title: "Errore", description: "Impossibile eliminare il candidato.", variant: "destructive" });
      }
    },
    onError: () => {
      toast({ title: "Errore", description: "Impossibile eliminare il candidato.", variant: "destructive" });
    },
  });

  const handleDelete = () => {
    if (window.confirm(`Eliminare ${candidate.firstName} ${candidate.lastName}? Operazione irreversibile.`)) {
      deleteMutation.mutate();
    }
  };

  const parsingStatus = candidate.applications?.[0]?.parsingStatus;
  const showScore = candidate.matchingScore !== null && candidate.matchingScore !== undefined;
  const bgColors = ['bg-blue-50 text-blue-600', 'bg-emerald-50 text-emerald-600', 'bg-violet-50 text-violet-600', 'bg-amber-50 text-amber-600', 'bg-rose-50 text-rose-600'];
  const avatarColor = bgColors[candidate.firstName?.charCodeAt(0) ?? 0 % bgColors.length];

  const isPlaceholderEmail = candidate.email?.toLowerCase().endsWith(PLACEHOLDER_EMAIL_DOMAIN);
  const phoneDisplay = formatPhoneDisplay(candidate.phone);
  const cityDisplay = !candidate.city || candidate.city === 'N/D'
    ? 'Sede non specificata'
    : `${candidate.city}${candidate.province ? ` (${candidate.province.toUpperCase()})` : ''}`;
  // Il DB salva "Nuovo" come default per i candidati d'archivio, valore non
  // presente nell'enum CandidateStatus: senza un item corrispondente il
  // Select di Radix risulta vuoto invece di mostrare lo stato reale.
  const hasKnownStatus = (Object.values(CandidateStatus) as string[]).includes(candidate.status) || candidate.status === 'Nuovo';

  return (
    <Link
      href={`/jobs/${candidate.id}`}
      className="h-full flex flex-col bg-white rounded-xl shadow-sm border border-slate-100 hover:border-primary/30 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 group"
    >
      {/* Header: avatar + name/role (left), badges (right) */}
      <div className="flex flex-col gap-2 px-5 pt-5 pb-3 md:flex-row md:items-start md:justify-between md:gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className={cn("w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shrink-0", avatarColor)}>
            {initials || <Mail className="w-4 h-4" />}
          </div>
          <div className="min-w-0">
            <h3 className="text-[15px] font-bold text-slate-900 break-words md:truncate">
              {candidate.firstName} {candidate.lastName}
            </h3>
            <p className="text-[13px] text-slate-500 truncate mt-0.5">{candidate.role}</p>
          </div>
        </div>

        {/* Right column: compact status + actions */}
        <div className="flex items-center gap-1.5 flex-wrap shrink-0">
          {candidate.source && candidate.source !== 'Import manuale archivio' && candidate.source !== 'Recupero Storage' && (
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider px-2 py-0.5 bg-slate-50 rounded-md border border-slate-100">
              {candidate.source}
            </span>
          )}
          {showScore && (
            <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-md border", getScoreColor(candidate.matchingScore))}>
              {candidate.matchingScore}%
            </span>
          )}
          {parsingStatus === "PENDING" || parsingStatus === "PROCESSING" ? (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md border border-amber-200 text-amber-600 bg-amber-50 flex items-center gap-1">
              <Loader2 className="w-2.5 h-2.5 animate-spin" /> AI
            </span>
          ) : parsingStatus === "FAILED" ? (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md border border-red-200 text-red-600 bg-red-50">
              Errore
            </span>
          ) : null}
        </div>
      </div>

      {/* Contact row */}
      <div className="flex flex-col gap-1.5 px-5 pb-3 text-xs text-slate-400 md:grid md:grid-cols-3 md:gap-2">
        <span className="flex items-center gap-1.5 min-w-0">
          <Mail className="w-3.5 h-3.5 shrink-0" />
          {isPlaceholderEmail ? (
            <span className="truncate italic text-slate-300">Email non disponibile</span>
          ) : (
            <span className="truncate">{candidate.email}</span>
          )}
        </span>
        <span className="flex items-center gap-1.5">
          <Phone className="w-3.5 h-3.5 shrink-0" />
          <span>{phoneDisplay}</span>
        </span>
        <span className="flex items-center gap-1.5">
          <MapPin className="w-3.5 h-3.5 shrink-0" />
          <span className="truncate">{cityDisplay}</span>
        </span>
      </div>

      {/* Tags */}
      {candidate.matchedKeywords && candidate.matchedKeywords.length > 0 && (
        <div className="flex flex-wrap gap-1 px-5 pb-3 md:gap-1.5">
          {candidate.matchedKeywords.slice(0, 5).map((skill, i) => (
            <span key={i} className="text-[11px] font-medium text-slate-600 bg-slate-50 px-2.5 py-0.5 rounded-md border border-slate-100">
              {skill}
            </span>
          ))}
        </div>
      )}

      {/* Bottom bar: status select + actions */}
      <div className="mt-auto pt-4 flex items-center justify-between gap-2 px-5 pb-2.5 border-t border-slate-100 bg-slate-50/50 rounded-b-xl">
        <div className="flex items-center gap-1" onClick={(e) => e.preventDefault()}>
          <Select
            value={candidate.status}
            onValueChange={(v) => updateStatusMutation.mutate({ candidateId: candidate.id, status: v })}
            disabled={updateStatusMutation.isPending}
          >
            <SelectTrigger className="h-7 text-[11px] w-[110px] border-slate-200 bg-white shadow-none px-2 rounded-lg max-sm:h-9">
              <SelectValue placeholder="Seleziona stato" />
            </SelectTrigger>
            <SelectContent>
              {!hasKnownStatus && (
                <SelectItem value={candidate.status} className="text-[11px]">{candidate.status}</SelectItem>
              )}
              {candidate.status === 'Nuovo' && (
                <SelectItem value="Nuovo" className="text-[11px]">Nuovo</SelectItem>
              )}
              {Object.values(CandidateStatus).map((s) => (
                <SelectItem key={s} value={s} className="text-[11px]">{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-1" onClick={(e) => e.preventDefault()}>
          {candidate.applications?.[0]?.jobId && (
            <AnalyzeAIButton candidateId={candidate.id} jobId={candidate.applications[0].jobId} />
          )}
          <button
            onClick={(e) => { e.preventDefault(); handleExport(); }}
            disabled={isExporting}
            className="h-7 w-7 max-sm:h-9 max-sm:w-9 flex items-center justify-center rounded-lg text-slate-400 hover:text-primary hover:bg-primary/5 transition-colors"
            title="Scarica PDF"
          >
            <Download className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={(e) => { e.preventDefault(); handleDelete(); }}
            disabled={deleteMutation.isPending}
            className="h-7 w-7 max-sm:h-9 max-sm:w-9 flex items-center justify-center rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors"
            title="Elimina"
          >
            {deleteMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
          </button>
          <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-primary transition-colors ml-1" />
        </div>
      </div>
    </Link>
  );
}

export default CandidateCard;
