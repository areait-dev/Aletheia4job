export const dynamic = 'force-dynamic';

import { canAccessAdmin, protectPageByRole } from '@/utils/authz';
import { getPublicTeacherOrgId, readTeacherPageContent } from '@/utils/pageContentReader';
import TeacherPageEditor from '@/components/admin/TeacherPageEditor';

export default async function ContenutiPage() {
  const auth = await protectPageByRole(canAccessAdmin);
  const { content, isCustom } = await readTeacherPageContent(auth.organizationId);
  const publicOrgId = getPublicTeacherOrgId();
  const readsOtherOrg = publicOrgId !== auth.organizationId;

  return (
    <section className="space-y-6 max-w-4xl">
      <header>
        <h1 className="text-2xl font-bold">Contenuti del sito</h1>
        <p className="text-sm text-muted-foreground mt-2">
          Modifica i testi della pagina pubblica <span className="font-semibold">Diventa docente</span> (Long List).
          Le modifiche sono online subito dopo il salvataggio.
        </p>
      </header>

      {readsOtherOrg && (
        <div className="rounded-xl border border-amber-500/40 bg-amber-500/5 p-4 text-sm">
          <p className="font-semibold">Attenzione: la pagina pubblica non legge i testi di questa organizzazione.</p>
          <p className="text-muted-foreground mt-1">
            {publicOrgId
              ? "La pagina pubblica è collegata a un'altra organizzazione (TEACHER_LONGLIST_ORG_ID o PUBLIC_SPONTANEOUS_ORG_ID), quindi le modifiche fatte qui non compariranno online."
              : "Manca la variabile TEACHER_LONGLIST_ORG_ID (o PUBLIC_SPONTANEOUS_ORG_ID): finché non è impostata la pagina pubblica mostra sempre i testi originali."}
          </p>
        </div>
      )}

      <TeacherPageEditor initial={content} isCustom={isCustom} />
    </section>
  );
}
