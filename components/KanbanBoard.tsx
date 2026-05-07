'use client';

import { CandidateType, CandidateStatus } from '@/utils/types';
import { User, MapPin, Briefcase, GripVertical, Phone, Mail } from 'lucide-react';
import Link from 'next/link';
import { Badge } from './ui/badge';
import { cn } from '@/lib/utils';
import {
  DndContext,
  DragEndEvent,
  DragOverEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  pointerWithin,
  rectIntersection,
  useDroppable,
} from '@dnd-kit/core';
import {
  SortableContext,
  horizontalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useState, useEffect, useMemo } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { updateCandidateStatusAction } from '@/utils/actions';
import { useToast } from './ui/use-toast';

function KanbanBoard({ candidates: initialCandidates }: { candidates: CandidateType[] }) {
  const [candidates, setCandidates] = useState(initialCandidates);
  const [activeId, setActiveId] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const columns = Object.values(CandidateStatus);

  useEffect(() => {
    setCandidates(initialCandidates);
  }, [initialCandidates]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const activeCandidate = useMemo(
    () => candidates.find((c) => c.id === activeId),
    [activeId, candidates]
  );

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over) return;

    const activeId = active.id;
    const overId = over.id;

    if (activeId === overId) return;

    const activeCand = candidates.find((c) => c.id === activeId);
    if (!activeCand) return;

    // Caso 1: Trascinamento sopra una colonna (vuota o meno)
    const isOverAColumn = columns.includes(overId as any);
    if (isOverAColumn) {
      if (activeCand.status !== overId) {
        setCandidates((prev) => 
          prev.map((c) => (c.id === activeId ? { ...c, status: overId as string } : c))
        );
      }
      return;
    }

    // Caso 2: Trascinamento sopra un altro candidato
    const overCand = candidates.find((c) => c.id === overId);
    if (overCand && activeCand.status !== overCand.status) {
      setCandidates((prev) => 
        prev.map((c) => (c.id === activeId ? { ...c, status: overCand.status } : c))
      );
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);
    console.log('DragEnd:', { active: active.id, over: over?.id });

    if (!over) {
      setCandidates(initialCandidates);
      return;
    }

    const candidateId = active.id as string;
    const currentCandidate = candidates.find((c) => c.id === candidateId);
    const originalCandidate = initialCandidates.find((c) => c.id === candidateId);

    if (currentCandidate && originalCandidate && currentCandidate.status !== originalCandidate.status) {
      try {
        const result = await updateCandidateStatusAction(candidateId, currentCandidate.status);
        if (result) {
          queryClient.invalidateQueries({ queryKey: ['candidates'] });
          toast({ description: `Candidato spostato in ${currentCandidate.status}` });
        } else {
          setCandidates(initialCandidates);
          toast({ variant: 'destructive', description: 'Errore nel salvataggio.' });
        }
      } catch (error) {
        setCandidates(initialCandidates);
        toast({ variant: 'destructive', description: "Errore durante l'operazione." });
      }
    }
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={rectIntersection}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className='flex flex-col gap-4 pb-6'>
        {columns.map((status) => (
          <KanbanColumn 
            key={status} 
            status={status} 
            candidates={candidates.filter((c) => c.status === status)} 
          />
        ))}
      </div>

      <DragOverlay>
        {activeCandidate ? (
          <div className='glass p-3 rounded-xl border-primary/50 shadow-2xl w-[260px] opacity-90 cursor-grabbing rotate-3 scale-105'>
            <div className='font-bold text-sm mb-1'>{activeCandidate.firstName} {activeCandidate.lastName}</div>
            <div className='text-[10px] text-muted-foreground'>{activeCandidate.role}</div>
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}

function KanbanColumn({ status, candidates }: { status: string, candidates: CandidateType[] }) {
  const { setNodeRef, isOver } = useDroppable({
    id: status,
  });

  return (
    <div 
      ref={setNodeRef}
      className={cn(
        'w-full flex flex-col gap-3 rounded-3xl transition-all duration-300 border-2 border-transparent p-3',
        isOver && 'bg-primary/[0.04] border-primary/20 shadow-inner'
      )}
    >
      <div className={cn(
        'flex items-center justify-between p-2 backdrop-blur-md rounded-2xl border transition-all duration-300 shadow-sm',
        isOver ? 'bg-primary/20 border-primary shadow-lg' : 'bg-background/40 border-primary/10'
      )}>
        <div className='flex items-center gap-3'>
          <div className='w-2 h-2 rounded-full bg-primary' />
          <h3 className='font-bold text-sm uppercase tracking-wider'>{status}</h3>
        </div>
        <Badge variant='secondary' className='rounded-lg px-2 py-0.5 bg-primary/5 text-primary border-none font-bold'>
          {candidates.length}
        </Badge>
      </div>

      <SortableContext 
        id={status}
        items={candidates.map(c => c.id)} 
        strategy={horizontalListSortingStrategy}
      >
        <div 
          className={cn(
            'flex gap-3 overflow-x-auto max-h-[240px] p-2 rounded-2xl border border-dashed transition-all duration-300 overflow-y-hidden',
            isOver ? 'bg-primary/[0.08] border-primary/40' : 'bg-primary/[0.02] border-primary/5'
          )}
        >
          {candidates.map((candidate) => (
            <SortableCandidateCard key={candidate.id} candidate={candidate} />
          ))}
          {candidates.length === 0 && (
            <div className='flex-1 flex items-center justify-center text-muted-foreground/30 text-[10px] uppercase font-bold tracking-tighter'>
              Trascina qui
            </div>
          )}
          {/* Aggiunto un area vuota espandibile per facilitare il drop a fine lista */}
          <div className="flex-1 min-h-[50px]" />
        </div>
      </SortableContext>
    </div>
  );
}

function SortableCandidateCard({ candidate }: { candidate: CandidateType }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: candidate.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.3 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className='relative group outline-none'
    >
      <div className='glass p-2 rounded-xl border-white/10 hover:border-primary/30 hover:shadow-md transition-all duration-300 w-[220px] shrink-0'>
        <div className='flex justify-between items-start mb-2'>
          <Link 
            href={`/jobs/${candidate.id}`}
            className='font-bold text-[12px] hover:text-primary transition-colors line-clamp-1 flex-1 pr-2'
          >
            {candidate.firstName} {candidate.lastName}
          </Link>
          <div 
            {...attributes} 
            {...listeners}
            className='cursor-grab active:cursor-grabbing p-1 text-muted-foreground/40 hover:text-primary'
          >
            <GripVertical className='w-4 h-4' />
          </div>
        </div>
        
        <div className='text-[10px] text-muted-foreground space-y-1'>
          <div className='flex flex-wrap items-center gap-2 font-semibold text-primary/70'>
            <Briefcase className='w-3 h-3' />
            <span className='truncate'>{candidate.role}</span>
          </div>
          <div className='flex items-center gap-1'>
            <MapPin className='w-3 h-3' />
            <span className='truncate'>{candidate.city} {candidate.province ? `(${candidate.province.toUpperCase()})` : ''}</span>
          </div>
        </div>

        <div className='mt-2 pt-2 border-t border-white/5 flex justify-between items-center'>
          <div className='flex gap-2 relative z-10'>
            {candidate.phone && (
              <a 
                href={`tel:${candidate.phone}`} 
                className='w-6 h-6 rounded-lg bg-primary/10 flex items-center justify-center text-primary hover:bg-primary hover:text-white transition-all pointer-events-auto'
                title='Chiama Candidato'
                onClick={(e) => e.stopPropagation()}
              >
                <Phone className='w-3 h-3' />
              </a>
            )}
            <a 
              href={`mailto:${candidate.email}`} 
              className='w-6 h-6 rounded-lg bg-primary/10 flex items-center justify-center text-primary hover:bg-primary hover:text-white transition-all pointer-events-auto'
              title='Invia Email'
              onClick={(e) => e.stopPropagation()}
            >
              <Mail className='w-3 h-3' />
            </a>
          </div>
          <span className='text-[8px] uppercase font-bold text-muted-foreground/40'>
            {new Date(candidate.createdAt).toLocaleDateString('it-IT')}
          </span>
        </div>
      </div>
    </div>
  );
}

export default KanbanBoard;
