'use client';

import { useState } from "react";
import { updateApplicationStatusAction } from "@/utils/actions";
import { useToast } from "@/components/ui/use-toast";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";

const statuses = ["Nuovo", "Screening", "Colloquio", "Proposta", "Assunto", "Respinto"];

export default function ApplicationStatusSelect({ 
  applicationId, 
  currentStatus 
}: { 
  applicationId: string;
  currentStatus: string;
}) {
  const [status, setStatus] = useState(currentStatus);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleStatusChange = async (newStatus: string) => {
    setIsLoading(true);
    try {
      const result = await updateApplicationStatusAction(applicationId, newStatus);
      if (result) {
        setStatus(newStatus);
        toast({ description: "Stato candidatura aggiornato." });
      } else {
        toast({ description: "Errore durante l'aggiornamento.", variant: "destructive" });
      }
    } catch (error) {
      toast({ description: "Errore imprevisto.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      {isLoading && <Loader2 className="w-3 h-3 animate-spin text-primary" />}
      <Select value={status} onValueChange={handleStatusChange} disabled={isLoading}>
        <SelectTrigger className="h-7 text-[10px] w-[110px] rounded-full border-primary/20 bg-primary/5 font-bold uppercase tracking-wider">
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="rounded-xl">
          {statuses.map((s) => (
            <SelectItem key={s} value={s} className="text-[10px] font-bold uppercase">
              {s}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
