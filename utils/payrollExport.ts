import prisma from "@/utils/db";
import Papa from "papaparse";

type Provider = "zucchetti" | "teamsystem";

function toYmd(date: Date) {
  return date.toISOString().slice(0, 10);
}

function minutesToHours(minutes: number) {
  return Math.round((minutes / 60) * 100) / 100;
}

export async function generatePayrollCsv(params: {
  organizationId: string;
  provider: Provider;
  from: Date;
  to: Date;
}) {
  const [attendance, absences] = await Promise.all([
    prisma.attendanceEntry.findMany({
      where: {
        organizationId: params.organizationId,
        date: { gte: params.from, lte: params.to },
      },
      include: { employee: true },
      orderBy: { date: "asc" },
    }),
    prisma.absence.findMany({
      where: {
        organizationId: params.organizationId,
        startDate: { lte: params.to },
        endDate: { gte: params.from },
      },
      include: { employee: true },
      orderBy: { startDate: "asc" },
    }),
  ]);

  if (params.provider === "zucchetti") {
    const rows: Array<Record<string, any>> = [];

    for (const a of attendance) {
      rows.push({
        CODICE: a.employee.email,
        DATA: toYmd(a.date),
        TIPO: "PRESENZA",
        ORE: minutesToHours(a.minutesWorked),
        STRAORD: a.overtimeMinutes ? minutesToHours(a.overtimeMinutes) : "",
        CAUSALE: "",
      });
    }

    for (const abs of absences) {
      rows.push({
        CODICE: abs.employee.email,
        DATA_DA: toYmd(abs.startDate),
        DATA_A: toYmd(abs.endDate),
        TIPO: "ASSENZA",
        ORE: "",
        STRAORD: "",
        CAUSALE: abs.type,
      });
    }

    const csv = Papa.unparse(rows, { delimiter: ";", quotes: false });
    return { csv, filename: `export_zucchetti_${toYmd(params.from)}_${toYmd(params.to)}.csv` };
  }

  const rows: Array<Record<string, any>> = [];

  for (const a of attendance) {
    rows.push({
      Matricola: a.employee.email,
      Giorno: toYmd(a.date),
      Tipo: "PRES",
      Quantita: minutesToHours(a.minutesWorked),
      Codice: "",
      Straordinario: a.overtimeMinutes ? minutesToHours(a.overtimeMinutes) : "",
    });
  }

  for (const abs of absences) {
    rows.push({
      Matricola: abs.employee.email,
      Giorno_Da: toYmd(abs.startDate),
      Giorno_A: toYmd(abs.endDate),
      Tipo: "ASS",
      Quantita: "",
      Codice: abs.type,
      Straordinario: "",
    });
  }

  const csv = Papa.unparse(rows, { delimiter: ";", quotes: false });
  return { csv, filename: `export_teamsystem_${toYmd(params.from)}_${toYmd(params.to)}.csv` };
}

