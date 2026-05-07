"use server";

import prisma from "./db";
import { createClient } from "./supabase/server";
import { 
  CandidateType, 
  CreateAndEditCandidateType, 
  createAndEditCandidateSchema,
  GetAllCandidatesActionTypes,
  JobType,
  CreateAndEditJobType,
  createAndEditJobSchema,
} from "./types";
import { redirect } from "next/navigation";
import { Prisma } from "@prisma/client";

// Funzione di utilità per proteggere le rotte
async function authenticateAndRedirect(): Promise<string> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.id) redirect("/login");
  return user.id;
}

/**
 * Recupera i candidati filtrati e gestisce il conteggio totale
 * Questo risolve la discrepanza tra il numero visibile e i risultati reali.
 */
export async function getAllCandidatesAction(params: GetAllCandidatesActionTypes) {
  const userId = await authenticateAndRedirect();
  const { search, candidateStatus, province, sector, page = 1, limit = 10 } = params;

  try {
    let whereClause: Prisma.CandidateWhereInput = {
      userId: userId // Filtra sempre per l'utente loggato
    };

    if (search) {
      whereClause.OR = [
        { firstName: { contains: search, mode: "insensitive" } },
        { lastName: { contains: search, mode: "insensitive" } },
        { city: { contains: search, mode: "insensitive" } },
        { role: { contains: search, mode: "insensitive" } },
      ];
    }

    if (candidateStatus && candidateStatus !== "tutti") {
      whereClause.status = candidateStatus;
    }

    if (province && province !== "tutte") {
      whereClause.province = { contains: province, mode: "insensitive" };
    }

    // Usa un confronto case-insensitive per evitare mismatch tra valori settore
    if (sector && sector !== "tutti") {
      whereClause.sector = { equals: sector, mode: "insensitive" };
    }

    const skip = (Number(page) - 1) * limit;

    // Eseguiamo conteggio e ricerca in parallelo per massime prestazioni
    const [candidates, count] = await Promise.all([
      prisma.candidate.findMany({
        where: whereClause,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
      }),
      prisma.candidate.count({ where: whereClause }),
    ]);

    return { 
      candidates, 
      count, 
      page: Number(page), 
      totalPages: Math.ceil(count / limit) 
    };
  } catch (error) {
    console.error("Errore Database:", error);
    return { candidates: [], count: 0, page: 1, totalPages: 0 };
  }
}

/**
 * Recupera i settori e il numero di candidati per ciascuno (Sidebar/Cards)
 */
export async function getSectorsAction() {
  const userId = await authenticateAndRedirect();
  try {
    const sectors = await prisma.candidate.groupBy({
      where: { userId },
      by: ["sector"],
      _count: { sector: true },
      orderBy: { sector: "asc" },
    });
    return sectors.map((s) => ({ sector: s.sector, count: s._count.sector }));
  } catch (error) { 
    return []; 
  }
}

/**
 * Recupera un singolo candidato per ID
 */
export async function getSingleCandidateAction(id: string): Promise<CandidateType | null> {
  const userId = await authenticateAndRedirect();
  try {
    const candidate = await prisma.candidate.findFirst({
      where: {
        id,
        userId,
      },
    });
    return candidate;
  } catch (error) {
    console.error("Errore nel recupero del candidato:", error);
    return null;
  }
}

/**
 * Crea un nuovo candidato
 */
export async function createCandidateAction(values: CreateAndEditCandidateType): Promise<CandidateType | null> {
  const userId = await authenticateAndRedirect();
  try {
    const candidate = await prisma.candidate.create({
      data: {
        ...values,
        userId,
      },
    });
    return candidate;
  } catch (error) {
    console.error("Errore nella creazione del candidato:", error);
    return null;
  }
}

/**
 * Verifica se un'email esiste già
 */
export async function checkEmailExistsAction(email: string): Promise<boolean> {
  const userId = await authenticateAndRedirect();
  try {
    const existingCandidate = await prisma.candidate.findFirst({
      where: {
        email,
        userId,
      },
    });
    return !!existingCandidate;
  } catch (error) {
    console.error("Errore nella verifica dell'email:", error);
    return false;
  }
}

/**
 * Recupera statistiche dei candidati
 */
export async function getCandidateStatsAction() {
  const userId = await authenticateAndRedirect();
  try {
    const totalCandidates = await prisma.candidate.count({
      where: { userId },
    });

    const statusStats = await prisma.candidate.groupBy({
      where: { userId },
      by: ["status"],
      _count: { status: true },
    });

    const sectorStats = await prisma.candidate.groupBy({
      where: { userId },
      by: ["sector"],
      _count: { sector: true },
      orderBy: { _count: { sector: "desc" } },
      take: 5,
    });

    return {
      totalCandidates,
      statusStats: statusStats.map(s => ({ status: s.status, count: s._count.status })),
      sectorStats: sectorStats.map(s => ({ sector: s.sector, count: s._count.sector })),
    };
  } catch (error) {
    console.error("Errore nel recupero delle statistiche:", error);
    return {
      totalCandidates: 0,
      statusStats: [],
      sectorStats: [],
    };
  }
}

/**
 * Recupera dati per i grafici
 */
export async function getChartsDataAction() {
  const userId = await authenticateAndRedirect();
  try {
    const monthlyData = await prisma.candidate.groupBy({
      where: { userId },
      by: ["createdAt"],
      _count: { id: true },
      orderBy: { createdAt: "asc" },
    });

    const statusData = await prisma.candidate.groupBy({
      where: { userId },
      by: ["status"],
      _count: { status: true },
    });

    return {
      monthlyData: monthlyData.map(d => ({
        date: d.createdAt.toISOString().split('T')[0],
        count: d._count.id,
      })),
      statusData: statusData.map(s => ({
        status: s.status,
        count: s._count.status,
      })),
    };
  } catch (error) {
    console.error("Errore nel recupero dei dati per i grafici:", error);
    return {
      monthlyData: [],
      statusData: [],
    };
  }
}

/**
 * Aggiorna lo stato di un candidato
 */
export async function updateCandidateStatusAction(candidateId: string, newStatus: string): Promise<boolean> {
  const userId = await authenticateAndRedirect();
  try {
    await prisma.candidate.updateMany({
      where: {
        id: candidateId,
        userId,
      },
      data: {
        status: newStatus,
      },
    });
    return true;
  } catch (error) {
    console.error("Errore nell'aggiornamento dello stato del candidato:", error);
    return false;
  }
}

/**
 * Elimina un candidato
 */
export async function deleteCandidateAction(candidateId: string): Promise<boolean> {
  const userId = await authenticateAndRedirect();
  try {
    await prisma.candidate.deleteMany({
      where: {
        id: candidateId,
        userId,
      },
    });
    return true;
  } catch (error) {
    console.error("Errore nell'eliminazione del candidato:", error);
    return false;
  }
}

/**
 * Crea un nuovo job
 */
export async function createJobAction(values: CreateAndEditJobType): Promise<JobType | null> {
  const userId = await authenticateAndRedirect();
  try {
    const job = await prisma.job.create({
      data: {
        ...values,
        userId,
      },
    });
    return job;
  } catch (error) {
    console.error("Errore nella creazione del job:", error);
    return null;
  }
}

/**
 * Aggiorna un candidato esistente
 */
export async function updateCandidateAction(candidateId: string, values: Partial<CreateAndEditCandidateType>): Promise<CandidateType | null> {
  const userId = await authenticateAndRedirect();
  try {
    const candidate = await prisma.candidate.update({
      where: {
        id: candidateId,
        userId,
      },
      data: values,
    });
    return candidate;
  } catch (error) {
    console.error("Errore nell'aggiornamento del candidato:", error);
    return null;
  }
}
