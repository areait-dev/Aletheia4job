'use client';

import { useState } from "react";
import { 
  createDocumentAction, 
  deleteDocumentAction, 
  updateDocumentSignatureStatusAction 
} from "@/utils/actions";
import { useRouter } from "next/navigation";
import { 
  Plus, 
  FileText, 
  Download, 
  Trash2, 
  User, 
  ExternalLink,
  CheckCircle2,
  Clock,
  AlertCircle
} from "lucide-react";
import { cn } from "@/lib/utils";

type DocumentsClientProps = {
  documents: any[];
  employees: any[];
};

export default function DocumentsClient({ documents, employees }: DocumentsClientProps) {
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  async function handleCreateDocument(formData: FormData) {
    setIsLoading(true);
    const result = await createDocumentAction({
      title: String(formData.get("title")),
      fileUrl: String(formData.get("fileUrl")),
      employeeId: formData.get("employeeId") ? String(formData.get("employeeId")) : undefined,
    });
    setIsLoading(false);
    if (result.ok) router.refresh();
  }

  async function handleDelete(id: string) {
    if (confirm("Sei sicuro di voler eliminare questo documento?")) {
      await deleteDocumentAction(id);
      router.refresh();
    }
  }

  async function handleUpdateStatus(id: string, status: string) {
    await updateDocumentSignatureStatusAction(id, status);
    router.refresh();
  }

  const statusIcons: Record<string, any> = {
    DRAFT: <AlertCircle className="w-4 h-4 text-gray-400" />,
    SENT: <Clock className="w-4 h-4 text-amber-500" />,
    SIGNED: <CheckCircle2 className="w-4 h-4 text-green-500" />,
  };

  const statusLabels: Record<string, string> = {
    DRAFT: "Bozza",
    SENT: "Inviato",
    SIGNED: "Firmato",
    DECLINED: "Rifiutato",
  };

  return (
    <div className="grid lg:grid-cols-3 gap-6">
      {/* Upload Form */}
      <div className="lg:col-span-1 glass rounded-3xl p-6 h-fit sticky top-6">
        <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
          <Plus className="w-5 h-5 text-primary" /> Carica Documento
        </h3>
        <form action={handleCreateDocument} className="space-y-4">
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase text-muted-foreground ml-1">Titolo Documento</label>
            <input name="title" required placeholder="Contratto di assunzione..." className="w-full h-11 rounded-xl border bg-background/50 px-3 text-sm focus:ring-2 focus:ring-primary/20 outline-none" />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase text-muted-foreground ml-1">URL File</label>
            <input name="fileUrl" required placeholder="https://cloud.storage.com/file.pdf" className="w-full h-11 rounded-xl border bg-background/50 px-3 text-sm focus:ring-2 focus:ring-primary/20 outline-none" />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase text-muted-foreground ml-1">Associa a Dipendente (Opzionale)</label>
            <select name="employeeId" className="w-full h-11 rounded-xl border bg-background/50 px-3 text-sm focus:ring-2 focus:ring-primary/20 outline-none">
              <option value="">Nessun dipendente</option>
              {employees.map(e => (
                <option key={e.id} value={e.id}>{e.firstName} {e.lastName}</option>
              ))}
            </select>
          </div>
          <button
            type="submit"
            disabled={isLoading}
            className="w-full h-12 bg-primary text-primary-foreground font-bold rounded-xl hover:bg-primary/90 transition-colors shadow-lg shadow-primary/20 disabled:opacity-50"
          >
            {isLoading ? "Caricamento..." : "Aggiungi Documento"}
          </button>
        </form>
      </div>

      {/* List */}
      <div className="lg:col-span-2 space-y-4">
        {documents.length === 0 ? (
          <div className="glass rounded-3xl p-12 text-center text-muted-foreground italic">Nessun documento presente nell'archivio.</div>
        ) : (
          documents.map((doc) => (
            <div key={doc.id} className="glass rounded-2xl p-5 hover:border-primary/20 transition-all duration-200 group">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-4 flex-1">
                  <div className="w-12 h-12 rounded-2xl bg-primary/5 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                    <FileText className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="font-bold text-base">{doc.title}</h4>
                    <div className="flex items-center gap-3 mt-1">
                      {doc.employee && (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <User className="w-3 h-3" />
                          {doc.employee.firstName} {doc.employee.lastName}
                        </div>
                      )}
                      <div className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-primary/70">
                        {statusIcons[doc.signatureStatus]}
                        {statusLabels[doc.signatureStatus]}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <a 
                    href={doc.fileUrl} 
                    target="_blank" 
                    rel="noreferrer"
                    className="p-2 rounded-xl bg-background border hover:bg-primary/5 transition-colors"
                    title="Visualizza"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>
                  
                  {doc.signatureStatus !== "SIGNED" && (
                    <button 
                      onClick={() => handleUpdateStatus(doc.id, "SIGNED")}
                      className="p-2 rounded-xl bg-green-500/10 text-green-600 hover:bg-green-500/20 transition-colors"
                      title="Segna come Firmato"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                    </button>
                  )}

                  <button 
                    onClick={() => handleDelete(doc.id)}
                    className="p-2 rounded-xl text-muted-foreground hover:bg-red-500/10 hover:text-red-500 transition-colors"
                    title="Elimina"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
