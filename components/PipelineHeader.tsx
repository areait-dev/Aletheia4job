'use client';

import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { getAllCandidatesAction } from "@/utils/actions";
import { useToast } from "@/components/ui/use-toast";
import * as XLSX from "xlsx";
import { CandidateStatus, CandidateType } from "@/utils/types";

export default function PipelineHeader() {
  const { toast } = useToast();

  const handleExportLavorati = async () => {
    try {
      toast({ description: "Preparazione esportazione..." });
      
      const { candidates } = await getAllCandidatesAction({ limit: 5000 });
      
      // Gli stati lavorati sono quelli diversi da "In cerca"
      const lavorati = candidates.filter((c: CandidateType) => 
        c.status !== CandidateStatus.InCerca
      );

      if (lavorati.length === 0) {
        toast({ description: "Nessun candidato lavorato da esportare.", variant: "destructive" });
        return;
      }

      const excelData = lavorati.map(c => ({
        "Data Inserimento": new Date(c.createdAt).toLocaleDateString('it-IT'),
        "Nome": c.firstName,
        "Cognome": c.lastName,
        "Email": c.email,
        "Telefono": c.phone || '',
        "Città": c.city,
        "Provincia": c.province || '',
        "Ruolo": c.role,
        "Settore": c.sector,
        "Seniority": c.seniority,
        "Stato": c.status,
        "Note": c.notes || ''
      }));

      const worksheet = XLSX.utils.json_to_sheet(excelData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Lavorati");

      const date = new Date().toISOString().split('T')[0];
      XLSX.writeFile(workbook, `Pipeline_Lavorati_${date}.xlsx`);
      
      toast({ description: "Esportazione completata con successo!" });
    } catch (error) {
      console.error("Export error:", error);
      toast({ description: "Errore durante l'esportazione.", variant: "destructive" });
    }
  };

  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-5 gap-3">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-primary mb-1.5 tracking-tight">Pipeline Screening</h1>
        <p className="text-muted-foreground text-sm">Monitora e gestisci l&apos;avanzamento dei candidati nelle fasi di selezione.</p>
      </div>
      
      <Button 
        onClick={handleExportLavorati}
        className="rounded-xl shadow-lg shadow-primary/20 flex items-center gap-2 font-bold px-5 py-4"
      >
        <Download className="w-5 h-5" />
        Esporta Lavorati
      </Button>
    </div>
  );
}
