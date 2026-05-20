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

  return (
    <Link
      href={`/jobs/${candidate.id}`}
      className="h-full flex flex-col bg-white rounded-xl shadow-sm border border-slate-100 hover:border-primary/30 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 group"
    >
      {/* Header: avatar + name/role (left), badges (right) */}
      <div className="flex items-start justify-between gap-3 px-5 pt-5 pb-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className={cn("w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shrink-0", avatarColor)}>
            {initials || <Mail className="w-4 h-4" />}
          </div>
          <div className="min-w-0">
            <h3 className="text-[15px] font-bold text-slate-900 truncate">
              {candidate.firstName} {candidate.lastName}
            </h3>
            <p className="text-[13px] text-slate-500 truncate mt-0.5">{candidate.role}</p>
          </div>
        </div>

        {/* Right column: compact status + actions */}
        <div className="flex items-center gap-1.5 shrink-0">
          {candidate.source && (
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
      <div className="grid grid-cols-3 gap-2 px-5 pb-3 text-xs text-slate-400">
        <span className="flex items-center gap-1.5 min-w-0">
          <Mail className="w-3.5 h-3.5 shrink-0" />
          <span className="truncate">{candidate.email}</span>
        </span>
        <span className="flex items-center gap-1.5">
          <Phone className="w-3.5 h-3.5 shrink-0" />
          <span>{candidate.phone || '—'}</span>
        </span>
        <span className="flex items-center gap-1.5">
          <MapPin className="w-3.5 h-3.5 shrink-0" />
          <span className="truncate">{candidate.city}{candidate.province ? ` (${candidate.province.toUpperCase()})` : ''}</span>
        </span>
      </div>

      {/* Tags */}
      {candidate.matchedKeywords && candidate.matchedKeywords.length > 0 && (
        <div className="flex flex-wrap gap-1.5 px-5 pb-3">
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
            <SelectTrigger className="h-7 text-[11px] w-[110px] border-slate-200 bg-white shadow-none px-2 rounded-lg">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
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
            className="h-7 w-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-primary hover:bg-primary/5 transition-colors"
            title="Scarica PDF"
          >
            <Download className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={(e) => { e.preventDefault(); handleDelete(); }}
            disabled={deleteMutation.isPending}
            className="h-7 w-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors"
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
