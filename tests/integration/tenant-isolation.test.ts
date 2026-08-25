import { afterAll, beforeAll, describe, expect, it } from "vitest";
import prisma, { dbUnscoped } from "@/utils/db";
import { setTenantContext, TenantContextMissingError } from "@/utils/tenant-context";
import { processIncomingApplication } from "@/utils/webhooks/processIncomingApplication";

/**
 * Scrive dati reali (con prefisso [test]) sul DB puntato da DATABASE_URL e li
 * ripulisce in afterAll. Va eseguito solo contro un DB di sviluppo/test, MAI
 * contro produzione: verificare DATABASE_URL prima di lanciare `npm test`.
 */
describe("tenant isolation (org seed reale)", () => {
  let orgA: { id: string };
  let orgB: { id: string };
  let jobA: { id: string };
  let jobB: { id: string };
  let candidateA: { id: string };
  let candidateB: { id: string };

  beforeAll(async () => {
    orgA = await dbUnscoped.organization.create({ data: { name: "[test] Org A" } });
    orgB = await dbUnscoped.organization.create({ data: { name: "[test] Org B" } });

    jobA = await dbUnscoped.job.create({
      data: {
        organizationId: orgA.id, userId: "test-user-a", title: "[test] Job A", company: "A",
        location: "Roma", description: "d", requirements: "r", sector: "IT", mode: "Full time",
      },
    });
    jobB = await dbUnscoped.job.create({
      data: {
        organizationId: orgB.id, userId: "test-user-b", title: "[test] Job B", company: "B",
        location: "Roma", description: "d", requirements: "r", sector: "IT", mode: "Full time",
      },
    });

    candidateA = await dbUnscoped.candidate.create({
      data: {
        organizationId: orgA.id, userId: "test-user-a", firstName: "A", lastName: "Test",
        email: "tenant-test-a@test.local", city: "Roma", role: "dev", seniority: "mid", sector: "IT", status: "Nuovo",
      },
    });
    candidateB = await dbUnscoped.candidate.create({
      data: {
        organizationId: orgB.id, userId: "test-user-b", firstName: "B", lastName: "Test",
        email: "tenant-test-b@test.local", city: "Roma", role: "dev", seniority: "mid", sector: "IT", status: "Nuovo",
      },
    });

    await dbUnscoped.application.create({
      data: { organizationId: orgA.id, candidateId: candidateA.id, jobId: jobA.id, status: "Nuovo" },
    });
    await dbUnscoped.application.create({
      data: { organizationId: orgB.id, candidateId: candidateB.id, jobId: jobB.id, status: "Nuovo" },
    });
  });

  afterAll(async () => {
    const orgIds = [orgA?.id, orgB?.id].filter(Boolean) as string[];
    if (orgIds.length === 0) return;
    await dbUnscoped.application.deleteMany({ where: { organizationId: { in: orgIds } } });
    await dbUnscoped.candidate.deleteMany({ where: { organizationId: { in: orgIds } } });
    await dbUnscoped.job.deleteMany({ where: { organizationId: { in: orgIds } } });
    await dbUnscoped.membership.deleteMany({ where: { organizationId: { in: orgIds } } });
    await dbUnscoped.organization.deleteMany({ where: { id: { in: orgIds } } });
  });

  it("fail-closed: query scoped senza tenant context attivo viene bloccata", async () => {
    await expect(prisma.job.findMany({})).rejects.toThrow(TenantContextMissingError);
  });

  it("OrgA non vede mai i Job di OrgB", async () => {
    setTenantContext({ organizationId: orgA.id, source: "system" });
    const ids = (await prisma.job.findMany({})).map((j) => j.id);
    expect(ids).toContain(jobA.id);
    expect(ids).not.toContain(jobB.id);
  });

  it("OrgB non vede mai i Candidate di OrgA", async () => {
    setTenantContext({ organizationId: orgB.id, source: "system" });
    const ids = (await prisma.candidate.findMany({})).map((c) => c.id);
    expect(ids).toContain(candidateB.id);
    expect(ids).not.toContain(candidateA.id);
  });

  it("blocca un create che specifica un organizationId diverso dal context attivo", async () => {
    setTenantContext({ organizationId: orgA.id, source: "system" });
    await expect(
      prisma.job.create({
        data: {
          organizationId: orgB.id, userId: "x", title: "x", company: "x",
          location: "x", description: "x", requirements: "x", sector: "IT", mode: "Full time",
        },
      })
    ).rejects.toThrow(/organizationId/);
  });

  it("webhook multiposting deriva l'org dal Job, non da un context di sessione", async () => {
    const result = await processIncomingApplication({
      jobId: jobA.id,
      candidateEmail: "tenant-test-webhook@test.local",
      candidateFirstName: "Webhook",
      candidateLastName: "Test",
      sourceProvider: "test-suite",
    });

    expect(result.candidateId).toBeTruthy();
    const created = await dbUnscoped.candidate.findUnique({ where: { id: result.candidateId } });
    expect(created?.organizationId).toBe(orgA.id);

    if (result.applicationId) {
      await dbUnscoped.application.delete({ where: { id: result.applicationId } });
    }
    await dbUnscoped.candidate.delete({ where: { id: result.candidateId } });
  });

  it("dbUnscoped (endpoint pubblici) vede job di entrambe le organizzazioni", async () => {
    const ids = (
      await dbUnscoped.job.findMany({ where: { id: { in: [jobA.id, jobB.id] } } })
    ).map((j) => j.id);
    expect(ids.sort()).toEqual([jobA.id, jobB.id].sort());
  });
});
