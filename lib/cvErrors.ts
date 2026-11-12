/**
 * Il contenuto del CV non si può leggere (file vuoto, danneggiato, formato non supportato).
 * È un errore DEFINITIVO: riprovare con lo stesso file darebbe lo stesso risultato.
 * Gli errori temporanei (download dallo Storage, rete) sono invece errori normali e restano ritentabili.
 */
export class CvUnreadableError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message);
    this.name = "CvUnreadableError";
    (this as { cause?: unknown }).cause = options?.cause;
  }
}
