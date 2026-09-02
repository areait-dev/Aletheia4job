'use client';

import { logApplyClickAction } from '@/utils/actions/funnelTracking';

// Stesso link "#apply" di prima (scroll locale all'ancora del form, nessuna
// navigazione), con in più il tracking del click. Il tracking è
// fire-and-forget: non blocca né può far fallire lo scroll/apertura del
// form, coerente con logFunnelEvent che inghiottisce già i propri errori.
export default function ApplyClickCta({
  organizationId,
  jobId,
  className,
  children,
}: {
  organizationId: string;
  jobId: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <a
      href="#apply"
      className={className}
      onClick={() => {
        logApplyClickAction({ organizationId, jobId }).catch(() => {
          // logFunnelEvent non propaga mai errori: questo catch è solo una
          // rete di sicurezza extra per non generare un unhandled rejection
          // lato client se la Server Action stessa non fosse raggiungibile.
        });
      }}
    >
      {children}
    </a>
  );
}
