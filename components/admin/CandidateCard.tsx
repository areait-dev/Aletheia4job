// components/admin/CandidateCard.tsx
'use client';

import Link from 'next/link';
import { FileText, Phone, Sparkles, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { calculateMatchingScoreAction } from '@/utils/actions/ai';
import { useRouter } from 'next/navigation';
import { toast } from '@/components/ui/use-toast';

interface CandidateData {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string | null;
  cvUrl?: string | null;
  matchingScore?: number | null;
  matchedKeywords?: string[] | null;
  jobId?: string | null;
}

interface CandidateCardProps {
  candidate: CandidateData;
}

function getScoreColor(score: number): string {
  if (score >= 80) return 'bg-green-600 text-white';
  if (score >= 50) return 'bg-yellow-500 text-yellow-950';
  return 'bg-orange-600 text-white';
}

export default function CandidateCard({ candidate }: CandidateCardProps) {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const router = useRouter();

  const hasScore =
    candidate.matchingScore !== null && candidate.matchingScore !== undefined;

  const handleAnalyze = async () => {
    if (!candidate.jobId) {
      toast({
        title: "Errore",
        description: "Impossibile trovare una posizione associata a questo candidato.",
        variant: "destructive",
      });
      return;
    }

    setIsAnalyzing(true);
    try {
      const result = await calculateMatchingScoreAction(candidate.id, candidate.jobId);
      if (result.ok) {
        toast({
          title: "Analisi completata",
          description: `Score AI: ${result.data.matchingScore}%`,
        });
        router.refresh();
      } else {
        toast({
          title: "Errore",
          description: result.error || "Si è verificato un errore durante l'analisi.",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Errore",
        description: "Errore imprevisto durante l'analisi AI.",
        variant: "destructive",
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="flex flex-col justify-between p-4 bg-white border rounded-lg shadow-sm hover:shadow-md transition-shadow h-full">
      <div>
        <div className="flex justify-between items-start mb-1">
          <h3 className="text-lg font-semibold truncate flex-1">
            {candidate.firstName} {candidate.lastName}
          </h3>
          <button
            onClick={handleAnalyze}
            disabled={isAnalyzing || !candidate.cvUrl}
            className={`p-1.5 rounded-full transition-colors ${
              hasScore ? 'text-primary hover:bg-primary/10' : 'text-gray-400 hover:bg-gray-100'
            }`}
            title={hasScore ? "Rifai analisi AI" : "Avvia analisi AI"}
          >
            {isAnalyzing ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Sparkles size={16} />
            )}
          </button>
        </div>

        {(hasScore || candidate.cvUrl) && (
          <div className="flex flex-wrap items-center gap-3 mb-3">
            {hasScore && (
              <div className="flex flex-col gap-0.5" title="AI Match Score">
                <span
                  className={`inline-flex items-center px-2 py-1 text-xs font-bold rounded-full ${getScoreColor(candidate.matchingScore!)}`}
                >
                  {candidate.matchingScore}% Match
                </span>
                <span className="text-[10px] text-muted-foreground">AI Match Score</span>
              </div>
            )}

            {candidate.cvUrl ? (
              <a
                href={candidate.cvUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-sm text-primary hover:underline font-medium"
              >
                <FileText size={14} />
                Scarica CV
              </a>
            ) : null}
          </div>
        )}

        <p className="text-sm text-gray-500 truncate mb-3">{candidate.email}</p>

        <div className="space-y-1 mb-3">
          {candidate.phone && (
            <div className="flex items-center gap-2 text-xs text-gray-600">
              <Phone className="w-3 h-3" />
              <span>{candidate.phone}</span>
            </div>
          )}
        </div>

        {candidate.matchedKeywords && candidate.matchedKeywords.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {candidate.matchedKeywords.slice(0, 3).map((kw, idx) => (
              <span
                key={idx}
                className="px-1.5 py-0.5 bg-primary/10 text-primary text-[10px] rounded border border-primary/20"
              >
                {kw}
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="mt-4 pt-4 border-t flex gap-2">
        <Link
          href={`/jobs/${candidate.id}`}
          className="flex-1 px-3 py-1.5 text-xs font-medium text-center text-white bg-primary rounded hover:bg-primary/90 transition-colors"
        >
          Vedi Dettaglio
        </Link>
      </div>
    </div>
  );
}
