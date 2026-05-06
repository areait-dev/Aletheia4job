"use client";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Download, FileText, Table } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { CandidateType } from "@/utils/types";
import * as XLSX from "xlsx";
import Papa from "papaparse";

function DownloadDropdown() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const getCandidatesData = () => {
    const cachedData = queryClient.getQueryCache().findAll({ queryKey: ["candidates"] });
    // Aggreghiamo tutti i candidati dalle query pescate finora o solo dall'ultima
    // Per semplicità prendiamo l'ultima query dei candidati
    const lastQuery = cachedData[cachedData.length - 1];
    const data = (lastQuery?.state?.data as any)?.candidates as CandidateType[];
    
    if (!data || data.length === 0) {
      toast({ description: "Nessun dato da esportare." });
      return null;
    }

    return data.map(c => ({
      Nome: c.firstName,
      Cognome: c.lastName,
      Email: c.email,
      Telefono: c.phone || '',
      Città: c.city,
      Provincia: c.province || '',
      Ruolo: c.role,
      Seniority: c.seniority,
      Scolarità: c.education || '',
      Settore: c.sector,
      RAL: c.expectedSalary || 0,
      Stato: c.status,
      Note: c.notes || '',
      Data_Inserimento: new Date(c.createdAt).toLocaleDateString('it-IT')
    }));
  };

  const handleDownloadCSV = () => {
    const data = getCandidatesData();
    if (!data) return;

    const csv = Papa.unparse(data);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `candidati_job_aletheia_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast({ description: "CSV scaricato con successo." });
  };

  const handleDownloadExcel = () => {
    const data = getCandidatesData();
    if (!data) return;

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Candidati");
    
    XLSX.writeFile(workbook, `candidati_job_aletheia_${new Date().toISOString().split('T')[0]}.xlsx`);
    
    toast({ description: "Excel scaricato con successo." });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="flex items-center gap-2 rounded-xl border-primary/20 hover:border-primary/50 transition-all">
          <Download className="h-4 w-4 text-primary" />
          Esporta Lista
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="rounded-xl p-2">
        <DropdownMenuItem
          onClick={handleDownloadCSV}
          className="flex items-center gap-2 cursor-pointer rounded-lg focus:bg-primary/10"
        >
          <FileText className="h-4 w-4 text-muted-foreground" />
          Esporta in CSV
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={handleDownloadExcel}
          className="flex items-center gap-2 cursor-pointer rounded-lg focus:bg-primary/10"
        >
          <Table className="h-4 w-4 text-muted-foreground" />
          Esporta in Excel
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default DownloadDropdown;
