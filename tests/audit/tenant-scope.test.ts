import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(__dirname, "..", "..");

// Solo il codice applicativo servito a runtime (app/, utils/, inngest/) è
// coperto da questo audit. Gli script batch one-off in scripts/ e
// prisma/seed.ts sono un gap noto e documentato, non questo test: vedi
// utils/db.ts (commento su dbUnscoped) e la spiegazione nel PR/commit.
const SCAN_ROOTS = ["app", "utils", "inngest"];
const SCAN_EXTENSIONS = new Set([".ts", ".tsx"]);

// File in cui l'uso di `new PrismaClient()` è l'implementazione stessa del
// client (base + esteso) e quindi legittimo.
const NEW_PRISMA_CLIENT_ALLOWLIST = new Set([path.join("utils", "db.ts")]);

// File in cui l'import esplicito del client non scoped (`dbUnscoped`) è
// legittimo, con la motivazione di ciascuno.
const DB_UNSCOPED_ALLOWLIST = new Set([
  // Bootstrap del tenant context stesso: getAuthContext deve poter risolvere/
  // creare la Membership prima che un context esista.
  path.join("utils", "authz.ts"),
  // Career page pubblica e candidatura via job (org derivata dal Job target),
  // nessuna sessione utente disponibile.
  path.join("utils", "actions", "jobs.ts"),
  // Candidatura spontanea pubblica: org fissata via env, nessuna sessione.
  path.join("utils", "actions", "candidates.ts"),
  // Webhook multiposting: org derivata dal Job target.
  path.join("utils", "webhooks", "processIncomingApplication.ts"),
  // Endpoint pubblici cross-org intenzionali (career page / feed job board).
  path.join("app", "api", "public", "jobs", "route.ts"),
  path.join("app", "api", "jobs", "feed", "route.ts"),
  path.join("app", "api", "feeds", "route.ts"),
  // Webhook esterni: org risolta da un identificatore esterno prima di poter
  // scopare la query successiva.
  path.join("app", "api", "webhooks", "cronofy", "route.ts"),
  path.join("app", "api", "webhooks", "dropbox-sign", "route.ts"),
  // Il modulo che definisce ed esporta dbUnscoped stesso.
  path.join("utils", "db.ts"),
  // Signup aziendale: crea l'Organization e la prima Membership OWNER prima
  // che un tenant context possa esistere (stesso motivo di utils/authz.ts).
  path.join("utils", "actions", "organizations.ts"),
]);

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === "node_modules" || entry.name.startsWith(".")) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(full, out);
    } else if (SCAN_EXTENSIONS.has(path.extname(entry.name))) {
      out.push(full);
    }
  }
  return out;
}

function scanFiles(): string[] {
  const files: string[] = [];
  for (const root of SCAN_ROOTS) {
    const dir = path.join(ROOT, root);
    if (fs.existsSync(dir)) walk(dir, files);
  }
  return files;
}

describe("tenant-scope audit", () => {
  const files = scanFiles();
  expect(files.length).toBeGreaterThan(0);

  it("nessun file (oltre utils/db.ts) istanzia new PrismaClient() direttamente", () => {
    const offenders: string[] = [];
    for (const file of files) {
      const rel = path.relative(ROOT, file);
      if (NEW_PRISMA_CLIENT_ALLOWLIST.has(rel)) continue;
      const content = fs.readFileSync(file, "utf8");
      if (/new\s+PrismaClient\s*\(/.test(content)) {
        offenders.push(rel);
      }
    }
    expect(
      offenders,
      `Trovate istanze dirette di PrismaClient fuori da utils/db.ts (bypassano l'estensione tenant-scope): ${offenders.join(", ")}`
    ).toEqual([]);
  });

  it("l'import di dbUnscoped è limitato ai file allowlisted", () => {
    const offenders: string[] = [];
    for (const file of files) {
      const rel = path.relative(ROOT, file);
      if (DB_UNSCOPED_ALLOWLIST.has(rel)) continue;
      const content = fs.readFileSync(file, "utf8");
      if (/\bdbUnscoped\b/.test(content)) {
        offenders.push(rel);
      }
    }
    expect(
      offenders,
      `Trovato uso di dbUnscoped fuori dall'allowlist (bypassa il filtro automatico organizationId): ${offenders.join(
        ", "
      )}. Se l'uso è intenzionale, aggiungi il file a DB_UNSCOPED_ALLOWLIST in questo test con una motivazione.`
    ).toEqual([]);
  });
});
