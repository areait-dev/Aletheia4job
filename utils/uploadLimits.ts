// Limite di dimensione dei file caricati dall'app (CV e loghi).
// Vercel accetta al massimo circa 4,5 MB di body per una funzione: un file più grande verrebbe
// respinto con un 413 prima di arrivare al nostro codice, senza un messaggio comprensibile.
// 4 MB lascia margine per l'involucro multipart. Usato sia dal browser (controllo prima dell'invio)
// sia dal server (/api/upload-cv).
export const MAX_UPLOAD_BYTES = 4 * 1024 * 1024;
export const MAX_UPLOAD_LABEL = "4 MB";

function formatMb(bytes: number) {
  return (bytes / (1024 * 1024)).toLocaleString("it-IT", { maximumFractionDigits: 1, minimumFractionDigits: 1 });
}

/** Messaggio per il candidato quando il file supera il limite. */
export function fileTooLargeMessage(sizeBytes?: number, what = "file") {
  const size = typeof sizeBytes === "number" ? ` (${formatMb(sizeBytes)} MB)` : "";
  return `Il ${what} è troppo grande${size}: il limite è ${MAX_UPLOAD_LABEL}. Riduci la dimensione (ad esempio salva il PDF con meno qualità immagini o rimuovi le foto) e riprova.`;
}

export function isFileTooLarge(sizeBytes: number) {
  return sizeBytes > MAX_UPLOAD_BYTES;
}
