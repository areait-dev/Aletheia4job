import { CandidateType, CandidateStatus } from '@/utils/types';
import { MapPin, Briefcase, User, Mail, Phone, FileText, ChevronRight, GraduationCap, Download, Edit, Sparkles } from 'lucide-react';
import Link from 'next/link';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import JobInfo from './JobInfo';
import DeleteJobButton from './DeleteJobButton';
import { exportCandidateToPDF } from '@/utils/pdfExport';
import { useState } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { updateCandidateStatusAction } from '@/utils/actions';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from './ui/use-toast';
import { cn } from '@/lib/utils';

import { calculateMatchingScoreAction } from '@/utils/actions/ai';
import { useRouter } from 'next/navigation';
import AnalyzeAIButton from './AnalyzeAIButton';

function CandidateCard({ candidate }: { candidate: CandidateType }) {
  const [isExporting, setIsExporting] = useState(false);
  const queryClient = useQueryClient();
  const router = useRouter();

  const handleExport = async () => {
    setIsExporting(true);
    await exportCandidateToPDF(candidate);
    setIsExporting(false);
  };

  // Mutazione per aggiornare lo stato
  const updateStatusMutation = useMutation({
    mutationFn: ({ candidateId, status }: { candidateId: string; status: string }) =>
      updateCandidateStatusAction(candidateId, status),
    onSuccess: (updatedCandidate) => {
      if (updatedCandidate) {
        // Invalida le query per aggiornare la lista
        queryClient.invalidateQueries({ queryKey: ['candidates'] });
        queryClient.invalidateQueries({ queryKey: ['stats'] });
        toast({
          title: "Stato aggiornato",
          description: `Il candidato è ora "${updatedCandidate.status}"`,
        });
      }
    },
    onError: () => {
      toast({
        title: "Errore",
        description: "Impossibile aggiornare lo stato del candidato",
        variant: "destructive",
      });
    },
  });

  const handleStatusChange = (newStatus: string) => {
    updateStatusMutation.mutate({
      candidateId: candidate.id,
      status: newStatus,
    });
  };

  return (
    <Card className='glass shadow-lg border-white/20 hover:shadow-2xl transition-all duration-300 group overflow-hidden rounded-2xl'>
      <CardHeader className='pb-2 relative'>
        <div className='flex justify-between items-start'>
          <div className='space-y-1'>
            <CardTitle className='text-2xl font-bold flex items-center gap-2'>
              <div className='w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary'>
                <User className='w-4 h-4' />
              </div>
              {candidate.firstName} {candidate.lastName}
            </CardTitle>
            <div className='flex items-center gap-2'>
              <CardDescription className='text-primary font-semibold text-base py-1 px-3 bg-primary/5 rounded-lg inline-block'>
                {candidate.role}
              </CardDescription>
              {candidate.source && (
                <Badge variant='outline' className='text-[10px] uppercase tracking-wider font-bold border-primary/20 text-primary/70'>
                  {candidate.source}
                </Badge>
              )}
              {candidate.matchingScore !== null && candidate.matchingScore !== undefined && (
                <Badge 
                  className={cn(
                    "font-bold",
                    candidate.matchingScore >= 80 ? "bg-green-600 hover:bg-green-700" : 
                    candidate.matchingScore >= 50 ? "bg-yellow-500 text-yellow-950 hover:bg-yellow-600" : 
                    "bg-orange-600 hover:bg-orange-700"
                  )}
                >
                  {candidate.matchingScore}% Match
                </Badge>
              )}
            </div>
          </div>
          <div className='flex flex-col items-end gap-2'>
            {/* Dropdown sempre visibile per modificare lo stato */}
            <div className='flex items-center gap-2'>
              <Select
                value={candidate.status}
                onValueChange={handleStatusChange}
                disabled={updateStatusMutation.isPending}
              >
                <SelectTrigger className='h-8 w-32 text-xs'>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.values(CandidateStatus).map((status) => (
                    <SelectItem key={status} value={status} className='text-xs'>
                      {status}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Edit className='w-3 h-3 text-muted-foreground' />
            </div>
            <div className='flex items-center gap-2'>
              <AnalyzeAIButton 
                candidateId={candidate.id} 
                jobId={candidate.applications?.[0]?.jobId || ""} 
                hasCv={!!candidate.cvUrl}
              />
              <Button 
                variant='ghost' 
                size='icon' 
                className='h-8 w-8 text-muted-foreground hover:text-primary rounded-full hover:bg-primary/10'
                onClick={handleExport}
                disabled={isExporting}
                title='Scarica Scheda PDF'
              >
                <Download className='w-4 h-4' />
              </Button>
            </div>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className='mt-4 space-y-4'>
        <div className='grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3 p-4 bg-muted/50 rounded-xl'>
          <JobInfo icon={<Mail className='w-4 h-4 text-primary' />} text={candidate.email} />
          <JobInfo icon={<Phone className='w-4 h-4 text-primary' />} text={candidate.phone || 'N/D'} />
          <JobInfo icon={<MapPin className='w-4 h-4 text-primary' />} text={`${candidate.city}${candidate.province ? ` (${candidate.province.toUpperCase()})` : ''}`} />
          <JobInfo icon={<Briefcase className='w-4 h-4 text-primary' />} text={candidate.seniority} />
          {candidate.education && (
            <JobInfo icon={<GraduationCap className='w-4 h-4 text-primary' />} text={candidate.education} />
          )}
        </div>
        
        {candidate.matchedKeywords && candidate.matchedKeywords.length > 0 && (
          <div className='flex flex-wrap gap-2'>
            {candidate.matchedKeywords.slice(0, 5).map((skill, index) => (
              <Badge key={index} variant='secondary' className='text-[10px] bg-primary/5 text-primary border-primary/10'>
                {skill}
              </Badge>
            ))}
          </div>
        )}

        {candidate.cvUrl && (
          <Button asChild variant='link' className='p-0 h-auto text-primary hover:text-primary/80 font-medium group/cv'>
            <a href={candidate.cvUrl} target="_blank" rel="noopener noreferrer" className='flex items-center gap-2'>
              <FileText className="w-4 h-4" /> 
              Visualizza Curriculum PDF
              <ChevronRight className='w-4 h-4 group-hover/cv:translate-x-1 transition-transform' />
            </a>
          </Button>
        )}
      </CardContent>

      <CardFooter className='flex gap-3 bg-muted/30 p-4'>
        <Button asChild size='sm' className='flex-1 rounded-xl font-semibold'>
          <Link href={`/jobs/${candidate.id}`}>Modifica Profilo</Link>
        </Button>
        {/* TODO: Add proper delete candidate button */}
        {/* <DeleteJobButton id={candidate.id} /> */}
      </CardFooter>
      
      <div className='absolute bottom-0 left-0 w-full h-1 bg-primary scale-x-0 group-hover:scale-x-100 transition-transform duration-500' />
    </Card>
  );
}

export default CandidateCard;
