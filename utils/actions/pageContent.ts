"use server";

import { AuditAction } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { dbUnscoped } from "../db";
import { canAccessAdmin, createAuditLogEntry, getAuthContext } from "../authz";
import { logger } from "../logger";
import {
  TEACHER_PAGE_KEY,
  teacherPageContentSchema,
  type TeacherPageContent,
} from "../teacherPageContent";

// Modifica dei testi della pagina pubblica /diventa-docente dal gestionale.
// Il controllo dei permessi è fatto qui, lato server: la UI nasconde la voce di
// menu ma non è un controllo di sicurezza. Scrive via dbUnscoped (PageContent non è
// tenant-scoped) con l'organizationId della sessione: un admin può modificare solo
// i contenuti della propria organizzazione.

type ActionResult = { ok: true } | { ok: false; error: string };

async function requireAdmin() {
  const auth = await getAuthContext();
  if (!auth) return { ok: false as const, error: "Sessione scaduta. Accedi di nuovo." };
  if (!canAccessAdmin(auth.role)) {
    return { ok: false as const, error: "Non hai i permessi per modificare i contenuti del sito." };
  }
  return { ok: true as const, auth };
}

export async function saveTeacherPageContentAction(input: TeacherPageContent): Promise<ActionResult> {
  const guard = await requireAdmin();
  if (!guard.ok) return guard;
  const { auth } = guard;

  const parsed = teacherPageContentSchema.safeParse(input);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    const where = issue?.path.join(" › ");
    return { ok: false, error: `${issue?.message ?? "Dati non validi"}${where ? ` (${where})` : ""}` };
  }

  try {
    await dbUnscoped.pageContent.upsert({
      where: { organizationId_key: { organizationId: auth.organizationId, key: TEACHER_PAGE_KEY } },
      create: {
        organizationId: auth.organizationId,
        key: TEACHER_PAGE_KEY,
        content: parsed.data,
        updatedBy: auth.userId,
      },
      update: { content: parsed.data, updatedBy: auth.userId },
    });
    await createAuditLogEntry({
      userId: auth.userId,
      organizationId: auth.organizationId,
      action: AuditAction.UPDATE,
      entity: "page_content",
      entityId: TEACHER_PAGE_KEY,
    });
  } catch (error) {
    logger.error("Errore salvataggio contenuti pagina Long List", error);
    return { ok: false, error: "Salvataggio non riuscito. Riprova tra poco." };
  }

  revalidatePath("/diventa-docente");
  revalidatePath("/contenuti");
  return { ok: true };
}

// Elimina la versione personalizzata: la pagina torna ai testi originali.
export async function resetTeacherPageContentAction(): Promise<ActionResult> {
  const guard = await requireAdmin();
  if (!guard.ok) return guard;
  const { auth } = guard;

  try {
    await dbUnscoped.pageContent.deleteMany({
      where: { organizationId: auth.organizationId, key: TEACHER_PAGE_KEY },
    });
    await createAuditLogEntry({
      userId: auth.userId,
      organizationId: auth.organizationId,
      action: AuditAction.DELETE,
      entity: "page_content",
      entityId: TEACHER_PAGE_KEY,
    });
  } catch (error) {
    logger.error("Errore ripristino contenuti pagina Long List", error);
    return { ok: false, error: "Ripristino non riuscito. Riprova tra poco." };
  }

  revalidatePath("/diventa-docente");
  revalidatePath("/contenuti");
  return { ok: true };
}
