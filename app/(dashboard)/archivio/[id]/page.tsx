import { getSingleCandidateAction } from '@/utils/actions';
import { authenticateAndRedirect } from '@/utils/actions/shared';
import { canDeleteCandidate } from '@/utils/authz';
import { notFound } from 'next/navigation';
import CandidateProfilePage from '@/components/CandidateProfilePage';

async function CandidateDetailPage({ params }: { params: { id: string } }) {
  // In parallelo: il ruolo serve solo a mostrare il pulsante "Elimina" a OWNER e ADMIN (i permessi sono comunque controllati dall'azione sul server).
  const [candidate, auth] = await Promise.all([getSingleCandidateAction(params.id), authenticateAndRedirect()]);
  if (!candidate) notFound();

  return <CandidateProfilePage candidate={candidate} canDelete={canDeleteCandidate(auth.role)} />;
}

export default CandidateDetailPage;
