export const dynamic = 'force-dynamic';

import { getDocumentsAction, getEmployeesAction } from "@/utils/actions";
import DocumentsClient from "@/components/DocumentsClient";
import { Files, ShieldCheck, FileText, Download } from "lucide-react";
import { canAccessDocuments, protectPageByRole } from "@/utils/authz";

export default async function DocumentsPage() {
  await protectPageByRole(canAccessDocuments);
  
  const [documents, employees] = await Promise.all([
    getDocumentsAction(),
    getEmployeesAction()
  ]);

  const signedDocs = documents.filter(d => d.signatureStatus === "SIGNED").length;
  const pendingDocs = documents.filter(d => d.signatureStatus === "SENT").length;

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Gestione Documentale</h1>
          <p className="text-muted-foreground mt-1">Archivia, gestisci e monitora la firma dei documenti aziendali</p>
        </div>
        <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center">
          <ShieldCheck className="w-5 h-5 text-primary" />
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="glass rounded-2xl p-4 flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
            <Files className="w-5 h-5" />
          </div>
          <div>
            <div className="text-2xl font-bold">{documents.length}</div>
            <div className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Totale Documenti</div>
          </div>
        </div>
        <div className="glass rounded-2xl p-4 flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center text-green-600">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="text-2xl font-bold">{signedDocs}</div>
            <div className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Firmati</div>
          </div>
        </div>
        <div className="glass rounded-2xl p-4 flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-600">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <div className="text-2xl font-bold">{pendingDocs}</div>
            <div className="text-xs text-muted-foreground font-medium uppercase tracking-wider">In attesa firma</div>
          </div>
        </div>
      </div>

      <DocumentsClient documents={documents} employees={employees} />
    </div>
  );
}
