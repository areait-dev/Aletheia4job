import { dbUnscoped } from "./db";
import { logger } from "./logger";
import {
  DEFAULT_TEACHER_PAGE_CONTENT,
  TEACHER_PAGE_KEY,
  teacherPageContentSchema,
  type TeacherPageContent,
} from "./teacherPageContent";

// Lettura dei testi della pagina /diventa-docente. Modulo server-side "normale"
// (non "use server"), da importare solo da Server Component e Server Action.
//
// Legge via dbUnscoped con organizationId esplicito perché la pagina pubblica non
// ha una sessione da cui derivare il tenant (stesso pattern di funnelEvents.ts).
// Non fallisce mai: se la tabella non esiste ancora (migrazione non applicata), il
// database non risponde o il contenuto è invalido, restituisce i testi di default.

/** Organizzazione a cui appartengono i contenuti pubblici della Long List. */
export function getPublicTeacherOrgId() {
  return process.env.TEACHER_LONGLIST_ORG_ID || process.env.PUBLIC_SPONTANEOUS_ORG_ID || null;
}

export async function readTeacherPageContent(organizationId: string | null): Promise<{
  content: TeacherPageContent;
  isCustom: boolean;
}> {
  const fallback = { content: DEFAULT_TEACHER_PAGE_CONTENT, isCustom: false };
  if (!organizationId) return fallback;

  try {
    const row = await dbUnscoped.pageContent.findUnique({
      where: { organizationId_key: { organizationId, key: TEACHER_PAGE_KEY } },
    });
    if (!row) return fallback;

    const parsed = teacherPageContentSchema.safeParse(row.content);
    if (!parsed.success) {
      logger.warn("Contenuto pagina Long List non valido: uso i testi di default.");
      return fallback;
    }
    return { content: parsed.data, isCustom: true };
  } catch (error) {
    logger.warn("Lettura contenuti pagina Long List fallita: uso i testi di default.", {
      error: error instanceof Error ? error.message : String(error),
    });
    return fallback;
  }
}
