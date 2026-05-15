// app/(dashboard)/admin/candidates/page.tsx
export const dynamic = 'force-dynamic'; 

import { prisma } from '@/lib/prisma';
import CandidateCard from '@/components/admin/CandidateCard';

export default async function AdminCandidatesPage() {
  try {
    // Recupera i candidati dal DB
    const candidates = await prisma.candidate.findMany({
      orderBy: {
        matchingScore: 'desc',
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        matchingScore: true,
        matchedKeywords: true,
      }
    });

    console.log("🔥 DEBUG: Candidati trovati:", candidates.length);

    return (
      <div className="p-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <h1 className="text-2xl font-bold">Gestione Candidati</h1>
          <div className="flex gap-3 text-sm">
            <div className="px-3 py-1.5 bg-white border rounded shadow-sm">
              Totali: <strong>{candidates.length}</strong>
            </div>
          </div>
        </div>

        {/* Griglia Candidati */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {candidates.map((c) => (
            <CandidateCard 
              key={c.id} 
              candidate={{
                id: c.id,
                firstName: c.firstName || '',
                lastName: c.lastName || '',
                email: c.email || '',
                phone: c.phone,
                matchingScore: c.matchingScore,
                matchedKeywords: c.matchedKeywords || [],
              }} 
            />
          ))}
          
          {candidates.length === 0 && (
            <div className="col-span-full text-center py-12 text-gray-500 bg-white rounded-lg border border-dashed">
              Nessun candidato trovato.
            </div>
          )}
        </div>
      </div>
    );
  } catch (error) {
    console.error("Errore nel caricamento dei candidati:", error);
    return (
      <div className="p-6 text-red-600">
        Errore nel caricamento dei dati. Controlla la console.
      </div>
    );
  }
}