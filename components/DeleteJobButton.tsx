'use client';

import { useState } from "react";
import { useRouter } from "next/navigation";
import { deleteJobAction } from "@/utils/actions";
import { useToast } from "@/components/ui/use-toast";
import { Trash2, Loader2 } from "lucide-react";
import { Button } from "./ui/button";

export default function DeleteJobButton({ jobId, jobTitle }: { jobId: string, jobTitle: string }) {
  const [isDeleting, setIsDeleting] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  const handleDelete = async () => {
    if (!window.confirm(`Sei sicuro di voler eliminare la posizione "${jobTitle}"? Questa azione è irreversibile e cancellerà anche tutte le candidature associate.`)) {
      return;
    }

    setIsDeleting(true);
    try {
      const success = await deleteJobAction(jobId);
      if (success) {
        toast({ description: "Posizione eliminata con successo." });
        router.push("/positions");
      } else {
        toast({ description: "Si è verificato un errore durante l'eliminazione.", variant: "destructive" });
      }
    } catch (error) {
      toast({ description: "Errore imprevisto.", variant: "destructive" });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Button
      variant="destructive"
      size="sm"
      className="rounded-xl flex items-center gap-2"
      onClick={handleDelete}
      disabled={isDeleting}
    >
      {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
      Elimina
    </Button>
  );
}
