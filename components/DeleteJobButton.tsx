'use client';

import { Button } from './ui/button';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { deleteCandidateAction } from '@/utils/actions';
import { useToast } from '@/components/ui/use-toast';

function DeleteCandidateBtn({ id }: { id: string }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const { mutate, isPending } = useMutation({
    mutationFn: (id: string) => deleteCandidateAction(id),
    onSuccess: (data) => {
      if (!data) {
        toast({
          description: 'Si è verificato un errore durante l\'eliminazione.',
        });
        return;
      }
      queryClient.invalidateQueries({ queryKey: ['candidates'] });
      queryClient.invalidateQueries({ queryKey: ['stats'] });

      toast({ description: 'Candidato eliminato.' });
    },
  });

  return (
    <Button
      size='sm'
      variant='destructive'
      disabled={isPending}
      onClick={() => {
        if (confirm('Sei sicuro di voler eliminare questo candidato?')) {
          mutate(id);
        }
      }}
    >
      {isPending ? 'Eliminazione...' : 'Elimina'}
    </Button>
  );
}

export default DeleteCandidateBtn;
