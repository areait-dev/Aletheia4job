// components/admin/CandidateCard.tsx
'use client'; // Necessario se usiamo interattività futura, ma qui è statico. Meglio lasciarlo server component se possibile, ma per sicurezza UI:

import Link from 'next/link';
import { FileText, Phone, MapPin } from 'lucide-react';

// Definiamo un tipo semplice per evitare conflitti con Prisma Client types
interface CandidateData {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string | null;
  matchingScore?: number | null;
  matchedKeywords?: string[] | null;
  job?: {
    title: string;
  } | null;
}

interface CandidateCardProps {
  candidate: CandidateData;
}

export default function CandidateCard({ candidate }: CandidateCardProps) {
  // Determina il colore in base allo score
  const getScoreColor = (score: number | null | undefined) => {
    if (score === null || score === undefined) return 'bg-gray-100 text-gray-500 border-gray-200';
    if (score >= 80) return 'bg-green-100 text-green-700 border-green-200';
    if (score >= 60) return 'bg-blue-100 text-blue-700 border-blue-200';
    if (score >= 40) return 'bg-yellow-100 text-yellow-700 border-yellow-200';
    return 'bg-red-100 text-red-700 border-red-200';
  };

  return (
    <div className="flex flex-col justify-between p-4 bg-white border rounded-lg shadow-sm hover:shadow-md transition-shadow h-full">
      <div>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-lg font-semibold truncate pr-2">
            {candidate.firstName} {candidate.lastName}
          </h3>
          {/* Badge Score */}
          <span className={`px-2 py-1 text-xs font-bold rounded-full border ${getScoreColor(candidate.matchingScore)}`}>
            {candidate.matchingScore ?? '-'}%
          </span>
        </div>
        
        <p className="text-sm text-gray-500 truncate mb-3">{candidate.email}</p>
        
        <div className="space-y-1 mb-3">
          {candidate.phone && (
            <div className="flex items-center gap-2 text-xs text-gray-600">
              <Phone className="w-3 h-3" />
              <span>{candidate.phone}</span>
            </div>
          )}
          {candidate.job && (
            <div className="flex items-center gap-2 text-xs text-gray-600">
              <MapPin className="w-3 h-3" />
              <span className="truncate">{candidate.job.title}</span>
            </div>
          )}
        </div>

        {/* Preview Keywords Matchate */}
        {candidate.matchedKeywords && candidate.matchedKeywords.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {candidate.matchedKeywords.slice(0, 3).map((kw, idx) => (
              <span key={idx} className="px-1.5 py-0.5 bg-primary/10 text-primary text-[10px] rounded border border-primary/20">
                {kw}
              </span>
            ))}
            {candidate.matchedKeywords.length > 3 && (
              <span className="text-[10px] text-gray-400 self-center">+{candidate.matchedKeywords.length - 3}</span>
            )}
          </div>
        )}
      </div>

      <div className="mt-4 pt-4 border-t flex gap-2">
        <Link 
          href={`/admin/candidates/${candidate.id}`}
          className="flex-1 px-3 py-1.5 text-xs font-medium text-center text-white bg-primary rounded hover:bg-primary/90 transition-colors"
        >
          Vedi Dettaglio
        </Link>
        <button className="px-3 py-1.5 text-xs font-medium text-gray-700 bg-gray-100 rounded hover:bg-gray-200 transition-colors flex items-center justify-center gap-1 cursor-not-allowed opacity-50" title="Funzione CV in arrivo">
             <FileText className="w-3 h-3" />
             CV
        </button>
      </div>
    </div>
  );
}