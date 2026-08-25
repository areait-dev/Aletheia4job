import { PrismaClient } from '@prisma/client';
import { requireTenantContext } from './tenant-context';

/**
 * Model Prisma con campo organizationId (vedi prisma/schema.prisma).
 * Esclusi: Organization (root tenant), Task/Tour/Token (dati globali, non multi-tenant).
 */
const TENANT_SCOPED_MODELS = new Set([
  'Membership',
  'AuditLog',
  'MembershipInvite',
  'Candidate',
  'Application',
  'CandidateNote',
  'Interview',
  'Job',
  'Employee',
  'OnboardingTask',
  'ReviewCycle',
  'Review',
  'OrganizationDomain',
  'CronofyAccount',
  'Absence',
  'AttendanceEntry',
  'Document',
  'CalendarEvent',
]);

function assertNoConflict(existingOrgId: unknown, organizationId: string, model: string, operation: string) {
  if (typeof existingOrgId === 'string' && existingOrgId !== organizationId) {
    throw new Error(
      `[tenant-scope] Operazione "${operation}" su "${model}" specifica organizationId="${existingOrgId}", ` +
        `diverso dal tenant context attivo ("${organizationId}"). Bloccata per evitare accesso cross-tenant.`
    );
  }
}

function scopeWhere(where: any, organizationId: string, model: string, operation: string) {
  const w = where ?? {};
  assertNoConflict(w.organizationId, organizationId, model, operation);
  return { ...w, organizationId };
}

function scopeCreateData(data: any, organizationId: string, model: string) {
  if (data == null) return data;
  assertNoConflict(data.organizationId, organizationId, model, 'create');
  return { ...data, organizationId };
}

function scopeCreateManyData(data: any, organizationId: string, model: string) {
  if (Array.isArray(data)) {
    return data.map((d: any) => scopeCreateData(d, organizationId, model));
  }
  return scopeCreateData(data, organizationId, model);
}

/**
 * Nota: l'estensione intercetta solo l'operazione top-level di ogni query.
 * Le nested write Prisma (es. job.create({ data: { applications: { create: [...] } } }))
 * NON vengono scopate automaticamente sul model annidato: oggi non ce ne sono nel codice
 * (verificato), ma se in futuro se ne introducono va passato organizationId esplicitamente
 * nei dati annidati.
 */
function withTenantScope(client: PrismaClient) {
  return client.$extends({
    name: 'tenant-scope',
    query: {
      $allModels: {
        async $allOperations({ model, operation, args, query }) {
          if (!TENANT_SCOPED_MODELS.has(model)) {
            return query(args);
          }

          const { organizationId } = requireTenantContext(model, operation);
          const a: any = args ?? {};

          switch (operation) {
            case 'findUnique':
            case 'findUniqueOrThrow':
            case 'findFirst':
            case 'findFirstOrThrow':
            case 'findMany':
            case 'delete':
            case 'deleteMany':
            case 'count':
            case 'aggregate':
            case 'groupBy':
              return query({ ...a, where: scopeWhere(a.where, organizationId, model, operation) });

            case 'update':
            case 'updateMany':
              assertNoConflict(a.data?.organizationId, organizationId, model, operation);
              return query({ ...a, where: scopeWhere(a.where, organizationId, model, operation) });

            case 'upsert':
              return query({
                ...a,
                where: scopeWhere(a.where, organizationId, model, operation),
                create: scopeCreateData(a.create, organizationId, model),
              });

            case 'create':
              return query({ ...a, data: scopeCreateData(a.data, organizationId, model) });

            case 'createMany':
            case 'createManyAndReturn':
              return query({ ...a, data: scopeCreateManyData(a.data, organizationId, model) });

            default:
              // Operazione non gestita esplicitamente su model multi-tenant: fail-closed
              // invece di lasciarla passare senza scoping.
              throw new Error(
                `[tenant-scope] Operazione "${operation}" su "${model}" non gestita dall'estensione tenant-scope.`
              );
          }
        },
      },
    },
  });
}

const globalForPrisma = globalThis as unknown as {
  prismaBase: PrismaClient | undefined;
  prismaScoped: ReturnType<typeof withTenantScope> | undefined;
};

const base = globalForPrisma.prismaBase ?? new PrismaClient();
const scoped = globalForPrisma.prismaScoped ?? withTenantScope(base);

/** Client scoped al tenant corrente: richiede un tenant context attivo per i model multi-tenant. */
export default scoped;

/**
 * Client SENZA scoping automatico. Uso consentito solo:
 * - bootstrap del tenant context stesso (utils/authz.ts: getAuthContext risolve la Membership
 *   prima ancora che un context esista);
 * - endpoint pubblici cross-org intenzionali (career page/feed job board);
 * - webhook che devono risolvere l'org da un identificatore esterno prima di poter scopare;
 * - script/seed one-off.
 * Ogni nuovo uso va aggiunto all'allowlist in tests/audit/tenant-scope.test.ts.
 */
export const dbUnscoped = base;

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prismaBase = base;
  globalForPrisma.prismaScoped = scoped;
}
