"use client";

import { useState } from 'react';
import { Sparkles, Loader2 } from 'lucide-react';
import { Button } from './ui/button';
import { calculateMatchingScoreAction } from '@/utils/actions/ai';
import { useRouter } from 'next/navigation';
import { toast } from './ui/use-toast';
import { cn } from '@/lib/utils';

interface AnalyzeAIButtonProps {
  candidateId: string;
  jobId: string;
  className?: string;
  variant?: "ghost" | "outline" | "default";
  size?: "sm" | "icon" | "default";
}

export default function AnalyzeAIButton({ 
  candidateId, 
  jobId, 
  className,
  variant = "ghost",
  size = "icon"
}: AnalyzeAIButtonProps) {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const router = useRouter();

  const handleAnalyze = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!jobId) {
      toast({
        title: "Errore",
        description: "Nessuna posizione associata a questo candidato.",
        variant: "destructive",
      });
      return;
    }

    setIsAnalyzing(true);
    try {
      const result = await calculateMatchingScoreAction(candidateId, jobId);
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
    <Button
      variant={variant}
      size={size}
      className={cn("rounded-full", className)}
      onClick={handleAnalyze}
      disabled={isAnalyzing}
      title="Analisi AI Match"
    >
      {isAnalyzing ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : (
        <Sparkles className="w-4 h-4" />
      )}
    </Button>
  );
}
