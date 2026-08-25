import { AsyncLocalStorage } from "node:async_hooks";
import type { MembershipRole } from "@prisma/client";

export type TenantContext = {
  organizationId: string;
  userId?: string;
  role?: MembershipRole;
  source: "session" | "webhook" | "system";
};

const storage = new AsyncLocalStorage<TenantContext>();

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
}

export function getTenantContext(): TenantContext | undefined {
  return storage.getStore();
}

export function requireTenantContext(model: string, operation: string): TenantContext {
  const ctx = storage.getStore();
  if (!ctx) throw new TenantContextMissingError(model, operation);
  return ctx;
}
