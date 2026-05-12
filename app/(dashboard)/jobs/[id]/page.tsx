import { getSingleCandidateAction } from '@/utils/actions';
import { notFound } from 'next/navigation';
import CandidateProfilePage from '@/components/CandidateProfilePage';

async function CandidateDetailPage({ params }: { params: { id: string } }) {
  const candidate = await getSingleCandidateAction(params.id);
  if (!candidate) notFound();

  return <CandidateProfilePage candidate={candidate} />;
}

export default CandidateDetailPage;
