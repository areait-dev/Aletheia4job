"use server";

import prisma from "./db";
import { createClient } from "./supabase/server";
import { 
  CandidateType, 
  CreateAndEditCandidateType, 
  createAndEditCandidateSchema,
  GetAllCandidatesActionTypes
} from "./types";
import { redirect } from "next/navigation";
import { Prisma } from "@prisma/client";
import dayjs from "dayjs";
import 'dayjs/locale/it';
dayjs.locale('it');

async function authenticateAndRedirect(): Promise<string> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.id) {
    redirect("/login");
  }
  return user.id;
}

export async function createCandidateAction(
  values: CreateAndEditCandidateType
): Promise<CandidateType | null> {
  const userId = await authenticateAndRedirect();

  try {
    createAndEditCandidateSchema.parse(values);

    const candidate: CandidateType = await prisma.candidate.create({
      data: {
        ...values,
        userId: userId,
      },
    });
    return candidate;
  } catch (error) {
    console.error("Errore creazione candidato:", error);
    return null;
  }
}

export async function getAllCandidatesAction(params: GetAllCandidatesActionTypes): Promise<{
  candidates: CandidateType[];
  count: number;
  page: number;
  totalPages: number;
}> {
  const userId = await authenticateAndRedirect();
  const { search, candidateStatus, province, sector, page = 1, limit = 10 } = params;

  try {
    let whereClause: Prisma.CandidateWhereInput = {};

    if (search) {
      whereClause = {
        ...whereClause,
        OR: [
          { firstName: { contains: search, mode: "insensitive" } },
          { lastName: { contains: search, mode: "insensitive" } },
          { city: { contains: search, mode: "insensitive" } },
          { role: { contains: search, mode: "insensitive" } },
        ],
      };
    }

    if (candidateStatus && candidateStatus !== "tutti") {
      whereClause = {
        ...whereClause,
        status: candidateStatus,
      };
    }

    if (province && province !== "tutte") {
      whereClause = {
        ...whereClause,
        province: { contains: province, mode: "insensitive" },
      };
    }

    if (sector && sector !== "tutti") {
      whereClause = {
        ...whereClause,
        sector: { contains: sector, mode: "insensitive" },
      };
    }

    const skip = (page - 1) * limit;

    const candidates: CandidateType[] = await prisma.candidate.findMany({
      where: whereClause,
      skip,
      take: limit,
      orderBy: {
        createdAt: "desc",
      },
    });

    const count: number = await prisma.candidate.count({
      where: whereClause,
    });

    const totalPages = Math.ceil(count / limit);

    return { candidates, count, page, totalPages };
  } catch (error) {
    console.error("Errore recupero candidati:", error);
    return { candidates: [], count: 0, page: 1, totalPages: 0 };
  }
}

export async function deleteCandidateAction(id: string): Promise<CandidateType | null> {
  const userId = await authenticateAndRedirect();

  try {
    const candidate: CandidateType = await prisma.candidate.delete({
      where: {
        id,
      },
    });
    return candidate;
  } catch (error) {
    return null;
  }
}

export async function getSingleCandidateAction(id: string): Promise<CandidateType | null> {
  const userId = await authenticateAndRedirect();
  let candidate: CandidateType | null = null;

  try {
    candidate = await prisma.candidate.findUnique({
      where: {
        id,
      },
    });
  } catch (error) {
    candidate = null;
  }
  if (!candidate) {
    redirect("/jobs");
  }
  return candidate;
}

export async function updateCandidateAction(
  id: string,
  values: CreateAndEditCandidateType
): Promise<CandidateType | null> {
  const userId = await authenticateAndRedirect();

  try {
    console.log("Tentativo aggiornamento ID:", id);
    const validatedValues = createAndEditCandidateSchema.parse(values);
    
    const candidate: CandidateType = await prisma.candidate.update({
      where: {
        id,
      },
      data: {
        firstName: validatedValues.firstName,
        lastName: validatedValues.lastName,
        email: validatedValues.email,
        phone: validatedValues.phone || null,
        city: validatedValues.city,
        province: validatedValues.province || null,
        role: validatedValues.role,
        seniority: validatedValues.seniority,
        education: validatedValues.education || null,
        sector: validatedValues.sector,
        expectedSalary: validatedValues.expectedSalary !== undefined ? validatedValues.expectedSalary : null,
        skills: validatedValues.skills || null,
        status: validatedValues.status,
        cvUrl: validatedValues.cvUrl || null,
        notes: validatedValues.notes || null,
      },
    });
    return candidate;
  } catch (error) {
    console.error("ERRORE AGGIORNAMENTO DETTAGLIATO:", error);
    return null;
  }
}

export async function updateCandidateStatusAction(
  id: string,
  status: string
): Promise<CandidateType | null> {
  const userId = await authenticateAndRedirect();

  try {
    console.log(`Aggiornamento stato DB per ${id} -> ${status}`);
    const candidate: CandidateType = await prisma.candidate.update({
      where: {
        id,
      },
      data: {
        status,
      },
    });
    return candidate;
  } catch (error) {
    console.error("Errore aggiornamento stato:", error);
    return null;
  }
}

export async function getCandidateStatsAction(): Promise<{
  "In cerca": number;
  Colloquiato: number;
  Inserito: number;
  "Non idoneo": number;
}> {
  const userId = await authenticateAndRedirect();

  try {
    const stats = await prisma.candidate.groupBy({
      where: {},
      by: ["status"],
      _count: {
        status: true,
      },
    });

    const statsObject = stats.reduce((acc, curr) => {
      acc[curr.status] = curr._count.status;
      return acc;
    }, {} as any);

    return {
      "In cerca": statsObject["In cerca"] || 0,
      Colloquiato: statsObject.Colloquiato || 0,
      Inserito: statsObject.Inserito || 0,
      "Non idoneo": statsObject["Non idoneo"] || 0,
    };
  } catch (error) {
    return {
      "In cerca": 0,
      Colloquiato: 0,
      Inserito: 0,
      "Non idoneo": 0,
    };
  }
}

export async function getChartsDataAction(): Promise<
  Array<{ date: string; count: number }>
> {
  const userId = await authenticateAndRedirect();
  const sixMonthsAgo = dayjs().subtract(6, "month").toDate();

  try {
    const candidates = await prisma.candidate.findMany({
      where: {
        createdAt: {
          gte: sixMonthsAgo,
        },
      },
      orderBy: {
        createdAt: "asc",
      },
    });

    const applicationsPerMonth = candidates.reduce((acc, candidate) => {
      const date = dayjs(candidate.createdAt).format("MMM YY");
      const existingEntry = acc.find((entry: any) => entry.date === date);

      if (existingEntry) {
        existingEntry.count += 1;
      } else {
        acc.push({ date, count: 1 });
      }

      return acc;
    }, [] as Array<{ date: string; count: number }>);

    return applicationsPerMonth;
  } catch (error) {
    redirect("/jobs");
  }
}

export async function checkEmailExistsAction(email: string): Promise<boolean> {
  const userId = await authenticateAndRedirect(); // Even checking requires auth usually

  try {
    const candidate = await prisma.candidate.findUnique({
      where: {
        email,
      },
    });
    return !!candidate;
  } catch (error) {
    return false;
  }
}

export async function getSectorsAction(): Promise<Array<{ sector: string; count: number }>> {
  const userId = await authenticateAndRedirect();

  try {
    const sectors = await prisma.candidate.groupBy({
      where: {},
      by: ["sector"],
      _count: {
        sector: true,
      },
      orderBy: {
        sector: "asc",
      },
    });

    return sectors.map((s) => ({
      sector: s.sector,
      count: s._count.sector,
    }));
  } catch (error) {
    return [];
  }
}
