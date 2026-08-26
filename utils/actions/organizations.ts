"use server";

import prisma, { dbUnscoped } from "@/utils/db";
import { MembershipRole, Prisma } from "@prisma/client";
import { createClient } from "@/utils/supabase/server";
import { authenticateAndRedirect } from "./shared";
import { isCompanySignUpEnabled } from "@/utils/featureFlags";

const FREE_YEAR_1_MS = 1000 * 60 * 60 * 24 * 365;
const VAT_NUMBER_REGEX = /^\d{11}$/;

export async function signUpOrganizationAction(params: {
  companyName: string;
  email: string;
  password: string;
  vatNumber: string;
  phone: string;
  sector?: string;
  termsAccepted: boolean;
  marketingConsent?: boolean;
}) {
  // Il flusso resta spento finché Termini di Servizio e Privacy Policy per le aziende
  // non sono pronti (vedi utils/featureFlags.ts). Controllo lato server perché la pagina
  // pubblica non è l'unico modo in cui questa action potrebbe essere invocata.
  if (!isCompanySignUpEnabled()) {
    return { ok: false, error: "La registrazione aziendale non è ancora disponibile. Riprova più tardi." };
  }

  const companyName = params.companyName.trim();
  const email = params.email.trim().toLowerCase();
  const vatNumber = params.vatNumber.trim();
  const phone = params.phone.trim();
  const sector = params.sector?.trim() || null;

  if (!companyName) return { ok: false, error: "Il nome dell'azienda è obbligatorio" };
  if (!email || !params.password) return { ok: false, error: "Email e password sono obbligatorie" };
  if (!VAT_NUMBER_REGEX.test(vatNumber)) return { ok: false, error: "La Partita IVA deve essere composta da 11 cifre numeriche" };
  if (!phone) return { ok: false, error: "Il telefono di contatto è obbligatorio" };
  if (params.termsAccepted !== true) return { ok: false, error: "Devi accettare i Termini di Servizio e la Privacy Policy" };

  const supabase = createClient();
  const { data, error } = await supabase.auth.signUp({ email, password: params.password });
  if (error || !data.user) {
    return { ok: false, error: error?.message ?? "Registrazione non riuscita" };
  }

  // Supabase non restituisce un errore per un'email già registrata e confermata (per evitare
  // enumeration attack): risponde con uno pseudo-successo con identities:[] . È l'unico modo
  // per il chiamante di distinguere "nuovo utente" da "email già esistente".
  // Vedi https://github.com/orgs/supabase/discussions/29327
  if (data.user.identities?.length === 0) {
    return { ok: false, error: "Esiste già un account con questa email. Prova ad accedere." };
  }

  const userId = data.user.id;
  const now = new Date();

  // Provisioning esplicito dell'organizzazione al momento del signup: usa dbUnscoped
  // perché il tenant context non esiste ancora (stesso motivo di getAuthContext in utils/authz.ts).
  // Advisory lock + controllo membership esistente: protegge dal doppio submit (o dal retry prima
  // della conferma email) che altrimenti creerebbe due Organization per lo stesso userId.
  try {
    await dbUnscoped.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${userId}))`;

      const existingMembership = await tx.membership.findFirst({ where: { userId } });
      if (existingMembership) return;

      const organization = await tx.organization.create({
        data: {
          name: companyName,
          planTier: "free_year_1",
          planExpiresAt: new Date(now.getTime() + FREE_YEAR_1_MS),
          vatNumber,
          phone,
          sector,
          termsAcceptedAt: now,
          marketingConsent: params.marketingConsent === true,
        },
      });

      await tx.membership.create({
        data: {
          userId,
          organizationId: organization.id,
          role: MembershipRole.OWNER,
        },
      });
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return { ok: false, error: "Esiste già un'azienda registrata con questa Partita IVA" };
    }
    throw error;
  }

  return { ok: true, requiresEmailConfirmation: !data.session };
}

export async function getOrganizationUsageStatsAction() {
  const { organizationId } = await authenticateAndRedirect();

  const [totalJobsPublished, totalApplicationsReceived] = await Promise.all([
    prisma.job.count({ where: { organizationId } }),
    prisma.application.count({ where: { organizationId } }),
  ]);

  return { totalJobsPublished, totalApplicationsReceived };
}
