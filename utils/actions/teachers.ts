"use server";

import prisma from "@/utils/db";
import { setTenantContext } from "../tenant-context";
import { logger } from "../logger";
import { checkRateLimit, getClientIp } from "../rate-limiter";
import {
  TEACHER_SOURCE,
  teacherLongListSchema,
  type TeacherLongListInput,
  type TeacherLongListValues,
} from "../teacherLongList";

// Candidatura alla Long List Docenti (/diventa-docente).
// Come la candidatura spontanea, non c'è un annuncio da cui derivare
// l'organizzazione: si usano le env dedicate, con fallback su quelle della
// candidatura spontanea. Il profilo viene salvato come Candidate (source
// "Long List Docenti") e notificato via email all'indirizzo interno.
export async function applyTeacherLongListAction(input: TeacherLongListInput) {
  const clientIp = getClientIp();
  const rateLimit = checkRateLimit(`teacher-longlist:${clientIp}`, 5, 10 * 60 * 1000);
  if (!rateLimit.allowed) {
    logger.warn("Rate limit superato su applyTeacherLongListAction", { clientIp });
    return { ok: false as const, error: "Troppe richieste. Riprova tra qualche minuto." };
  }

  const parsed = teacherLongListSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false as const,
      error: parsed.error.issues[0]?.message ?? "Dati non validi. Controlla il form.",
    };
  }
  const values = parsed.data;

  const organizationId =
    process.env.TEACHER_LONGLIST_ORG_ID || process.env.PUBLIC_SPONTANEOUS_ORG_ID;
  const userId = process.env.TEACHER_LONGLIST_USER_ID || process.env.PUBLIC_SPONTANEOUS_USER_ID;

  if (!organizationId || !userId) {
    logger.error("TEACHER_LONGLIST_ORG_ID / PUBLIC_SPONTANEOUS_ORG_ID non configurate.");
    return { ok: false as const, error: "Servizio momentaneamente non disponibile. Riprova più tardi." };
  }

  setTenantContext({ organizationId, userId, source: "system" });

  const [firstName, ...rest] = values.fullName.split(/\s+/);
  const lastName = rest.join(" ");
  const emailLower = values.email.toLowerCase();
  const submittedAt = new Date();
  const notesBlock = buildNotesBlock(values, submittedAt);
  const areasLabel = formatAreas(values);
  let alreadyInDatabase = false;

  try {
    const existing = await prisma.candidate.findFirst({
      where: { email: { equals: emailLower, mode: "insensitive" }, organizationId },
    });

    if (existing) {
      alreadyInDatabase = true;
      // Candidato già presente (es. si era candidato a un annuncio): non
      // sovrascriviamo ruolo/settore/fonte, aggiungiamo il blocco Long List
      // alle note e aggiorniamo contatti e CV.
      await prisma.candidate.update({
        where: { id: existing.id },
        data: {
          firstName,
          lastName: lastName || existing.lastName,
          phone: values.phone,
          city: values.city,
          cvUrl: values.cvUrl,
          notes: existing.notes ? `${existing.notes}\n\n${notesBlock}` : notesBlock,
        },
      });
    } else {
      await prisma.candidate.create({
        data: {
          firstName,
          lastName,
          email: emailLower,
          phone: values.phone,
          city: values.city,
          role: values.profile,
          seniority: "N/D",
          sector: "Formazione",
          skills: areasLabel,
          status: "Nuovo",
          source: TEACHER_SOURCE,
          notes: notesBlock,
          organizationId,
          userId,
          cvUrl: values.cvUrl,
        },
      });
    }
  } catch (error) {
    logger.error("Errore salvataggio Long List Docenti", error);
    return { ok: false as const, error: "Si è verificato un errore durante l'invio. Riprova." };
  }

  // La notifica email non deve mai far fallire la candidatura: il profilo è
  // già salvato nel database.
  await sendNotificationEmail(values, submittedAt, alreadyInDatabase);

  return { ok: true as const };
}

function formatAreas(values: TeacherLongListValues) {
  return values.areas
    .map((a) => (a === "Altro" && values.areasOther ? `Altro: ${values.areasOther}` : a))
    .join(", ");
}

function formatDeliveryModes(values: TeacherLongListValues) {
  return values.deliveryModes
    .map((m) =>
      m === "In presenza — altra sede" && values.deliveryOtherLocation
        ? `In presenza — ${values.deliveryOtherLocation}`
        : m,
    )
    .join(", ");
}

function formatDate(date: Date) {
  return date.toLocaleString("it-IT", { timeZone: "Europe/Rome" });
}

function buildNotesBlock(values: TeacherLongListValues, submittedAt: Date) {
  return [
    `[${TEACHER_SOURCE} — ${formatDate(submittedAt)}]`,
    `Profilo: ${values.profile}`,
    `Aree di competenza: ${formatAreas(values)}`,
    `Modalità di erogazione: ${formatDeliveryModes(values)}`,
    `Esperienza e qualifiche: ${values.experience}`,
    `Consenso privacy: sì (${formatDate(submittedAt)})`,
    `Consenso comunicazioni opportunità formative: ${values.marketingAccepted ? "sì" : "no"}`,
  ].join("\n");
}

function escapeHtml(text: string) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// Invio via API REST di Resend (nessuna dipendenza aggiuntiva). Se le env non
// sono configurate la notifica viene saltata con un warning nei log.
async function sendNotificationEmail(
  values: TeacherLongListValues,
  submittedAt: Date,
  alreadyInDatabase: boolean,
) {
  const apiKey = process.env.RESEND_API_KEY;
  const to = process.env.TEACHER_LONGLIST_NOTIFY_EMAIL;
  const from = process.env.RESEND_FROM_EMAIL;

  if (!apiKey || !to || !from) {
    logger.warn("Notifica Long List Docenti non inviata: RESEND_API_KEY / TEACHER_LONGLIST_NOTIFY_EMAIL / RESEND_FROM_EMAIL mancanti.");
    return;
  }

  const rows: [string, string][] = [
    ["Nome e cognome", values.fullName],
    ["Email", values.email],
    ["Telefono", values.phone],
    ["Città", values.city],
    ["Profilo", values.profile],
    ["Aree di competenza", formatAreas(values)],
    ["Modalità di erogazione", formatDeliveryModes(values)],
    ["Esperienza e qualifiche", values.experience],
    ["Consenso comunicazioni", values.marketingAccepted ? "Sì" : "No"],
    ["Data invio", formatDate(submittedAt)],
  ];

  const html = `
    <div style="font-family:Arial,sans-serif;font-size:14px;color:#1f2937">
      <h2 style="margin:0 0 12px">Nuova candidatura Long List Docenti</h2>
      ${alreadyInDatabase ? '<p style="color:#b45309">Il candidato era già presente nel database: il profilo è stato aggiornato.</p>' : ""}
      <table cellpadding="6" style="border-collapse:collapse">
        ${rows
          .map(
            ([label, value]) =>
              `<tr><td style="font-weight:bold;vertical-align:top;border-bottom:1px solid #e5e7eb">${escapeHtml(label)}</td><td style="border-bottom:1px solid #e5e7eb;white-space:pre-wrap">${escapeHtml(value)}</td></tr>`,
          )
          .join("")}
      </table>
      <p style="margin-top:16px"><a href="${escapeHtml(values.cvUrl)}">Scarica il curriculum</a></p>
    </div>`;

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from,
        to: to.split(",").map((s) => s.trim()).filter(Boolean),
        reply_to: values.email,
        subject: `Long List Docenti — ${values.fullName} (${values.areas.slice(0, 2).join(", ")})`,
        html,
      }),
    });
    if (!res.ok) {
      logger.error("Invio notifica Long List Docenti fallito", { status: res.status, body: await res.text() });
    }
  } catch (error) {
    logger.error("Invio notifica Long List Docenti fallito", error);
  }
}
