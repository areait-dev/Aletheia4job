import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

// `vi.hoisted` perché i factory di `vi.mock` sotto vengono issati in cima al
// file: un `const` normale qui sarebbe ancora in temporal dead zone.
const prismaMock = vi.hoisted(() => ({
  candidate: {
    findFirst: vi.fn(),
    update: vi.fn(),
    create: vi.fn(),
  },
  publicFunnelEvent: {
    create: vi.fn(),
  },
}));

vi.mock("@/utils/db", () => ({
  default: prismaMock,
  dbUnscoped: prismaMock,
}));

// applySpontaneousApplicationAction chiama getClientIp() -> next/headers,
// che fuori da un vero request context di Next.js lancia. Fissiamo un IP
// finto e deterministico così il rate limiter (lasciato reale, non mockato)
// può essere esercitato senza dover simulare l'intero runtime Next.
vi.mock("@/utils/rate-limiter", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/utils/rate-limiter")>();
  return {
    ...actual,
    getClientIp: vi.fn(),
  };
});

import { applySpontaneousApplicationAction } from "@/utils/actions/candidates";
import { getClientIp } from "@/utils/rate-limiter";

const mockGetClientIp = vi.mocked(getClientIp);

// Il rate limiter tiene uno stato in-memory per IP a livello di modulo: ogni
// test usa un IP finto diverso per non "ereditare" richieste consumate da un
// test precedente nello stesso file.
let ipCounter = 0;

const ORG_ID = "org-spontaneous";
const USER_ID = "user-spontaneous";

const validPayload = {
  firstName: "Mario",
  lastName: "Rossi",
  email: "mario.rossi@example.com",
  phone: "+39 333 1234567",
  city: "Milano",
  sector: "IT",
};

describe("applySpontaneousApplicationAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    ipCounter += 1;
    mockGetClientIp.mockReturnValue(`203.0.113.${ipCounter}`);
    process.env.PUBLIC_SPONTANEOUS_ORG_ID = ORG_ID;
    process.env.PUBLIC_SPONTANEOUS_USER_ID = USER_ID;
  });

  afterEach(() => {
    delete process.env.PUBLIC_SPONTANEOUS_ORG_ID;
    delete process.env.PUBLIC_SPONTANEOUS_USER_ID;
  });

  it("happy path: candidato nuovo, crea il record e ritorna ok:true", async () => {
    prismaMock.candidate.findFirst.mockResolvedValue(null);
    prismaMock.candidate.create.mockResolvedValue({ id: "candidate-1" });

    const result = await applySpontaneousApplicationAction(validPayload);

    expect(result).toEqual({ ok: true });
    expect(prismaMock.candidate.create).toHaveBeenCalledTimes(1);
    expect(prismaMock.publicFunnelEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ organizationId: ORG_ID, eventType: "spontaneous_submitted" }) })
    );
    expect(prismaMock.candidate.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          email: "mario.rossi@example.com",
          organizationId: ORG_ID,
          userId: USER_ID,
        }),
      })
    );
  });

  it("happy path: candidato già esistente (stessa email), aggiorna invece di duplicare", async () => {
    prismaMock.candidate.findFirst.mockResolvedValue({ id: "candidate-existing", phone: "old" });
    prismaMock.candidate.update.mockResolvedValue({ id: "candidate-existing" });

    const result = await applySpontaneousApplicationAction(validPayload);

    expect(result).toEqual({ ok: true });
    expect(prismaMock.candidate.update).toHaveBeenCalledTimes(1);
    expect(prismaMock.candidate.create).not.toHaveBeenCalled();
  });

  it("validazione fallita: variabili d'ambiente org/user mancanti blocca l'azione senza toccare il DB", async () => {
    delete process.env.PUBLIC_SPONTANEOUS_ORG_ID;
    delete process.env.PUBLIC_SPONTANEOUS_USER_ID;

    const result = await applySpontaneousApplicationAction(validPayload);

    expect(result.ok).toBe(false);
    expect(prismaMock.candidate.findFirst).not.toHaveBeenCalled();
    expect(prismaMock.candidate.create).not.toHaveBeenCalled();
  });

  it("rate limit: oltre 10 richieste in 10 minuti dallo stesso IP vengono bloccate", async () => {
    prismaMock.candidate.findFirst.mockResolvedValue(null);
    prismaMock.candidate.create.mockResolvedValue({ id: "candidate-x" });

    const results = [];
    for (let i = 0; i < 12; i++) {
      results.push(await applySpontaneousApplicationAction({
        ...validPayload,
        email: `candidato-${i}@example.com`,
      }));
    }

    const allowed = results.filter((r) => r.ok);
    const blocked = results.filter((r) => !r.ok);

    expect(allowed).toHaveLength(10);
    expect(blocked).toHaveLength(2);
    expect(blocked[0].error).toMatch(/troppe richieste/i);
    // Il DB non deve essere toccato per le richieste bloccate.
    expect(prismaMock.candidate.create).toHaveBeenCalledTimes(10);
  });
});
