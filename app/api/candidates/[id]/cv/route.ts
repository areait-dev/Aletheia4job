import { NextResponse } from 'next/server';
import prisma from '@/utils/db';
import { getAuthContext } from '@/utils/authz';
import { createCvSignedUrl } from '@/utils/cvStorage';

export const dynamic = 'force-dynamic';

/**
 * "Apri CV": genera al momento del clic un link firmato (5 minuti) e reindirizza.
 * Il link non viene mai salvato nel database.
 * Solo utenti loggati dell'organizzazione del candidato; in ogni altro caso 403
 * (anche se il candidato non esiste, per non rivelare quali ID sono validi).
 */
export async function GET(_request: Request, { params }: { params: { id: string } }) {
  const auth = await getAuthContext().catch(() => null);
  if (!auth) {
    return NextResponse.json({ error: 'Non autorizzato' }, { status: 403 });
  }

  const candidate = await prisma.candidate.findFirst({
    where: { id: params.id, organizationId: auth.organizationId },
    select: { cvUrl: true },
  });
  if (!candidate) {
    return NextResponse.json({ error: 'Non autorizzato' }, { status: 403 });
  }
  if (!candidate.cvUrl) {
    return NextResponse.json({ error: 'Nessun CV caricato' }, { status: 404 });
  }

  const signedUrl = await createCvSignedUrl(candidate.cvUrl);
  if (!signedUrl) {
    return NextResponse.json({ error: 'CV non disponibile' }, { status: 404 });
  }

  const response = NextResponse.redirect(signedUrl, 302);
  response.headers.set('Cache-Control', 'no-store');
  return response;
}
