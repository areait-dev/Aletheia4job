import { z } from "zod";

// Testi modificabili della pagina pubblica /diventa-docente.
// Modulo "normale" (non "use server"): condiviso tra pagina pubblica, editor
// del gestionale e Server Action. I valori di DEFAULT sono i testi ufficiali:
// se nel database non c'è nulla (o è invalido) la pagina usa questi.

export const TEACHER_PAGE_KEY = "diventa-docente";

const text = (max: number) =>
  z.string().trim().min(1, "Campo obbligatorio").max(max, `Massimo ${max} caratteri`);

export const teacherPageContentSchema = z.object({
  hero: z.object({
    title: text(160),
    text: text(600),
    cta: text(60),
  }),
  intro: z.object({
    title: text(160),
    paragraphs: z.array(text(1200)).min(1, "Almeno un paragrafo").max(4),
  }),
  audience: z.object({
    title: text(120),
    intro: text(400),
    items: z
      .array(z.object({ role: text(80), text: text(300) }))
      .min(1, "Almeno una voce")
      .max(8),
  }),
  steps: z.object({
    title: text(120),
    items: z
      .array(z.object({ title: text(80), text: text(400) }))
      .min(1, "Almeno uno step")
      .max(6),
  }),
  form: z.object({
    title: text(120),
    text: text(600),
  }),
});

export type TeacherPageContent = z.infer<typeof teacherPageContentSchema>;

export const DEFAULT_TEACHER_PAGE_CONTENT: TeacherPageContent = {
  hero: {
    title: "Hai competenze da condividere? Entra nella rete dei docenti Alètheia.",
    text: "Cerchiamo docenti, formatori e professionisti da coinvolgere nei nostri progetti di formazione. Inserisci il tuo profilo: ti contatteremo quando si apre un’opportunità in linea con la tua area di competenza.",
    cta: "Invia la tua candidatura",
  },
  intro: {
    title: "Le opportunità giuste iniziano dalle competenze",
    paragraphs: [
      "**Alètheia**, parte della rete di imprese **Promotergroup S.p.A.**, progetta e realizza percorsi formativi per persone, imprese e territori. Per farlo, ci affidiamo a una rete di professionisti con competenze, esperienze e specializzazioni diverse.",
      "La Long List Alètheia non è un bando con scadenza, è un registro permanente di professionisti qualificati a cui attingiamo ogni volta che si apre un percorso formativo, un avviso pubblico regionale o una nuova attività didattica.",
    ],
  },
  audience: {
    title: "A chi ci rivolgiamo",
    intro: "Cerchiamo professionisti con esperienza e competenze da mettere a disposizione della formazione:",
    items: [
      { role: "Docenti e formatori", text: "con esperienza nella didattica e nella formazione professionale" },
      { role: "Professionisti di settore", text: "con competenze tecniche e specialistiche maturate sul campo" },
      { role: "Esperti tematici", text: "con conoscenze aggiornate e capacità di trasferirle in aula" },
      { role: "Specialisti", text: "con competenze verticali utili a progetti e percorsi formativi specifici" },
    ],
  },
  steps: {
    title: "Come funziona",
    items: [
      {
        title: "Invia il tuo profilo",
        text: "Compila il form con i tuoi dati, le esperienze professionali e gli ambiti in cui puoi svolgere attività di docenza.",
      },
      {
        title: "Entra nel database",
        text: "Il tuo profilo potrà essere consultato internamente per individuare competenze coerenti con i progetti e le esigenze formative.",
      },
      {
        title: "Valuta le opportunità",
        text: "Quando individueremo un progetto compatibile con il tuo profilo, ti contatteremo per verificare interesse, disponibilità e requisiti richiesti.",
      },
      {
        title: "Collabori con noi",
        text: "Definisci insieme al team le modalità, i contenuti e le date. Ogni collaborazione è regolata da un incarico formale e trasparente.",
      },
    ],
  },
  form: {
    title: "Entra nella nostra long list",
    text: "Condividi il tuo percorso professionale e aiutaci a conoscerti. I dati che inserisci ci permettono di valutare le tue competenze in modo preciso e di contattarti per le opportunità più adatte a te.",
  },
};
