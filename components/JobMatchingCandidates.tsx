'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Sparkles, Loader2, Plus } from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from './ui/button';
import { useToast } from './ui/use-toast';
import { cn, getScoreColor } from '@/lib/utils';
import {
  getMatchingCandidatesForJobAction,
  assignCandidateToJobAction,
} from '@/utils/actions';

/** Candidati dell'archivio piu adatti a un'offerta, con associazione in un click. */
export default function JobMatchingCandidates({ jobId }: { jobId: string }) {
  const { toast } = useToast();
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data: matches = [], isLoading } = useQuery({
    queryKey: ['job-candidate-matches', jobId],
    queryFn: () => getMatchingCandidatesForJobAction(jobId),
  });

  const assign = useMutation({
    mutationFn: (candidateId: string) => assignCandidateToJobAction(candidateId, jobId),
    onSuccess: (res) => {
      if (res.ok) {
        toast({ description: 'Candidato associato all’offerta.' });
        queryClient.invalidateQueries({ queryKey: ['job-candidate-matches', jobId] });
        router.refresh();
      } else {
        toast({ variant: 'destructive', description: res.error ?? 'Errore.' });
      }
    },
  });

  return (
    <div className="glass rounded-2xl sm:rounded-3xl p-4 sm:p-6 space-y-4">
      <h2 className="font-semibold text-primary flex items-center gap-2">
        <Sparkles className="w-4 h-4" /> Candidati compatibili dall’archivio
      </h2>
      <p className="text-xs text-muted-foreground">
        Punteggio su CV, competenze, settore, località e ruolo. Sono esclusi i già associati e i “Non idoneo”.
      </p>

      {isLoading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground py-6">
          <Loader2 className="w-4 h-4 animate-spin" /> Calcolo in corso…
        </div>
      ) : matches.length === 0 ? (
        <div className="text-center py-8 text-sm text-muted-foreground">
          Nessun candidato compatibile nell’archivio.
        </div>
      ) : (
        <div className="grid gap-3">
          {matches.map((m) => (
            <div key={m.candidateId} className="p-4 rounded-2xl border border-border/50 bg-background/30 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <Link href={`/jobs/${m.candidateId}`} className="font-bold hover:text-primary">
                    {m.name}
                  </Link>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {m.role} • {m.city}
                  </div>
                </div>
                <span className={cn('text-sm font-black px-2.5 py-1 rounded-lg border shrink-0', getScoreColor(m.score))}>
                  {m.score}%
                </span>
              </div>
              {m.matchedKeywords.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {m.matchedKeywords.slice(0, 8).map((k) => (
                    <span key={k} className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 font-semibold">
                      {k}
                    </span>
                  ))}
                  {m.missingKeywords.slice(0, 4).map((k) => (
                    <span key={k} className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground line-through">
                      {k}
                    </span>
                  ))}
                </div>
              )}
              <Button
                size="sm"
                className="rounded-xl gap-2"
                disabled={assign.isPending}
                onClick={() => assign.mutate(m.candidateId)}
              >
                <Plus className="w-4 h-4" /> Associa a questa offerta
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
