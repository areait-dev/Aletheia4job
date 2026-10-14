import { z } from "zod";

// Long List Docenti Alètheia (/diventa-docente).
// Costanti e schema condivisi tra il form client e la Server Action:
// modulo "normale" (non "use server") perché esporta costanti e tipi.

export const TEACHER_PROFILES = [
  "Docente / Formatore",
  "Professionista / Esperto di settore",
] as const;

export const TEACHER_AREAS = [
  "Sicurezza sul lavoro",
  "Agricoltura e agroalimentare",
  "Competenze digitali e informatica",
  "Sanità e welfare",
  "Pubblica Amministrazione e diritto",
  "Management e sviluppo aziendale",
  "Sicurezza alimentare e HACCP",
  "Settori tecnici e specialistici",
  "Altro",
] as const;

export const TEACHER_DELIVERY_MODES = [
  "In presenza — Vittoria (RG) e provincia",
  "In presenza — altra sede",
  "Online / videoconferenza",
  "FAD asincrona",
] as const;

export const TEACHER_SOURCE = "Long List Docenti";

export const teacherLongListSchema = z
  .object({
    fullName: z
      .string()
      .trim()
      .min(3, "Inserisci nome e cognome")
      .max(120)
      .refine((v) => v.split(/\s+/).length >= 2, "Inserisci sia il nome che il cognome"),
    email: z.string().trim().email("Inserisci un indirizzo email valido").max(160),
    phone: z
      .string()
      .trim()
      .min(6, "Inserisci un numero di telefono valido")
      .max(30)
      .regex(/^[+0-9\s().-]+$/, "Inserisci un numero di telefono valido"),
    city: z.string().trim().min(2, "Inserisci la città").max(80),
    profile: z.enum(TEACHER_PROFILES, {
      errorMap: () => ({ message: "Seleziona il tuo profilo professionale" }),
    }),
    areas: z.array(z.enum(TEACHER_AREAS)).min(1, "Seleziona almeno un'area di competenza"),
    areasOther: z.string().trim().max(200).optional().default(""),
    deliveryModes: z
      .array(z.enum(TEACHER_DELIVERY_MODES))
      .min(1, "Seleziona almeno una modalità di erogazione"),
    deliveryOtherLocation: z.string().trim().max(200).optional().default(""),
    experience: z
      .string()
      .trim()
      .min(30, "Descrivi brevemente il tuo percorso (almeno 30 caratteri)")
      .max(3000, "Massimo 3000 caratteri"),
    cvUrl: z.string().url("Carica il tuo curriculum vitae"),
    privacyAccepted: z.literal(true, {
      errorMap: () => ({ message: "Il consenso al trattamento dei dati è obbligatorio" }),
    }),
    marketingAccepted: z.boolean().default(false),
  })
  .superRefine((v, ctx) => {
    if (v.areas.includes("Altro") && !v.areasOther) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["areasOther"],
        message: "Specifica l'altra area di competenza",
      });
    }
    if (v.deliveryModes.includes("In presenza — altra sede") && !v.deliveryOtherLocation) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["deliveryOtherLocation"],
        message: "Specifica la sede in cui sei disponibile",
      });
    }
  });

export type TeacherLongListInput = z.input<typeof teacherLongListSchema>;
export type TeacherLongListValues = z.output<typeof teacherLongListSchema>;

// Eventi window per tenere sincronizzati l'indice delle aree nell'hero
// (TeacherAreaIndex) e il campo "Aree di competenza" del form.
export const AREAS_SET_EVENT = "teacher-areas:set";
export const AREAS_CHANGED_EVENT = "teacher-areas:changed";
