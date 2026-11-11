import { NuovaPasswordForm } from "@/components/ReimpostaPasswordForm";

export const dynamic = "force-dynamic";

// Raggiungibile solo con la sessione di recupero creata da /auth/callback:
// senza sessione il middleware rimanda al login.
export default function NuovaPasswordPage() {
  return <NuovaPasswordForm />;
}
