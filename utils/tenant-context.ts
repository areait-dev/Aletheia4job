import { AsyncLocalStorage } from "node:async_hooks";
import * as React from "react";
import type { MembershipRole } from "@prisma/client";

export type TenantContext = {
  organizationId: string;
  userId?: string;
  role?: MembershipRole;
  source: "session" | "webhook" | "system";
};

const storage = new AsyncLocalStorage<TenantContext>();

/**
 * Fallback per-request. AsyncLocalStorage.enterWith() chiamato DOPO un await dentro una
 * funzione async (come getAuthContext) NON si propaga al chiamante: al ritorno, il codice
 * del chiamante vede store undefined. In produzione questo faceva fallire ogni query
 * scoped con TenantContextMissingError. React.cache() e' scoped alla richiesta RSC/server
 * action e sopravvive agli await, quindi lo usiamo come secondo canale. Fuori da un render
 * React (test, webhook) cache non esiste/non memoizza: il fallback resta vuoto e si
 * resta fail-closed.
 */
const reactCache: <T extends () => unknown>(fn: T) => T =
  (React as unknown as { cache?: <T extends () => unknown>(fn: T) => T }).cache ?? ((fn) => fn);
const requestHolder = reactCache(() => ({ ctx: undefined as TenantContext | undefined }));

export class TenantContextMissingError extends Error {
  constructor(model: string, operation: string) {
    super(
      `Tenant context mancante: operazione "${operation}" su model "${model}" richiede un organizationId attivo. ` +
        `Il call site deve essere raggiunto da un entry point che popola il tenant context ` +
        `(authenticateAndRedirect, resolveAuth di una route admin, o setTenantContext esplicito in un webhook/job).`
    );
    this.name = "TenantContextMissingError";
  }
}

/**
 * Imposta il tenant context per il resto della catena async corrente
 * (stesso pattern enterWith usato internamente da Next.js per il request context).
 */
export function setTenantContext(ctx: TenantContext) {
  storage.enterWith(ctx);
  try {
    requestHolder().ctx = ctx;
  } catch {
    // fuori da un contesto di richiesta React: resta solo il canale AsyncLocalStorage
  }
}

export function getTenantContext(): TenantContext | undefined {
  const fromStorage = storage.getStore();
  if (fromStorage) return fromStorage;
  try {
    return requestHolder().ctx;
  } catch {
    return undefined;
  }
}

export function requireTenantContext(model: string, operation: string): TenantContext {
  const ctx = getTenantContext();
  if (!ctx) throw new TenantContextMissingError(model, operation);
  return ctx;
}
