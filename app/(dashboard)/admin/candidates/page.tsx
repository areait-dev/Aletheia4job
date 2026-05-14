export const dynamic = 'force-dynamic';

// app/admin/candidates/page.tsx
import { prisma } from '@/lib/prisma';
import CandidateCard from '@/components/admin/CandidateCard';
import Link from 'next/link'; // Importiamo Link per eventuali azioni future

// Definiamo un tipo per i dati dei candidati che stiamo recuperando.
// Questo garantisce la sicurezza dei tipi per il resto del componente.
type CandidateData = {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string;
  phone: string | null;
  matchingScore: number | null;
  matchedKeywords: any; // Usiamo 'any' per ora, poiché il tipo esatto dipende dallo schema di Prisma
};

export default async function AdminCandidatesPage() {
  try {
    // Recupera solo i campi necessari dal candidato.
    // Applichiamo esplicitamente il tipo al risultato di findMany per evitare che 'candidates' sia 'any[]'
    const candidates: CandidateData[] = await prisma.candidate.findMany({
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
        // Se vuoi il titolo dell'offerta, devi assicurarti che la relazione esista nello schema.
        // Per ora lo lasciamo fuori per garantire che la pagina si carichi.
      }
    });

    // Ora, 'c' e 'candidate' saranno correttamente inferiti come 'CandidateData'
    const totalCandidates = candidates.length;
    const topCandidates = candidates.filter(c => (c.matchingScore || 0) >= 80).length;

    return (
      <div className="p-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <h1 className="text-2xl font-bold">Gestione Candidati</h1>
          <div className="flex gap-3 text-sm">
            <div className="px-3 py-1.5 bg-white border rounded shadow-sm">
              Totali: <strong>{totalCandidates}</strong>
            </div>
            <div className="px-3 py-1.5 bg-green-50 border border-green-200 text-green-800 rounded shadow-sm">
              Top Score (&gt;80%): <strong>{topCandidates}</strong>
            </div>
          </div>
        </div>

        {/* Info Box */}
        <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
          <p className="text-sm text-blue-800">
            💡 I candidati sono ordinati automaticamente per compatibilità AI.
          </p>
        </div>

        {/* Griglia Candidati */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {candidates.map((candidate) => (
            <CandidateCard 
              key={candidate.id} 
              candidate={{
                ...candidate,
                job: null // Passiamo null esplicitamente poiché non abbiamo caricato la relazione
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
        Errore nel caricamento dei dati. Controlla la console e assicurati di aver eseguito <code>npx prisma generate</code>.
      </div>
    );
  }
}
