import Link from "next/link";
import { redirect } from "next/navigation";
import { acceptMemberInviteAction } from "@/utils/actions";
import { createClient } from "@/utils/supabase/server";

async function InviteAcceptPage({
  params,
  searchParams,
}: {
  params: { token: string };
  searchParams?: { error?: string };
}) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const userId = user?.id;
  const email = user?.email ?? null;

  const loginHref = `/login?redirect_url=${encodeURIComponent(`/invite/${params.token}`)}`;

  async function acceptInvite() {
    "use server";
    const result = await acceptMemberInviteAction(params.token);
    if (result.ok) {
      redirect("/dashboard");
    }
    redirect(`/invite/${params.token}?error=${encodeURIComponent(result.error ?? "Errore sconosciuto")}`);
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-6">
      <section className="w-full max-w-xl rounded-xl border p-6 space-y-4 glass">
        <h1 className="text-2xl font-bold">Accetta invito organizzazione</h1>
        {searchParams?.error ? (
          <p className="text-sm rounded-md border border-destructive/30 bg-destructive/10 p-3">
            {searchParams.error}
          </p>
        ) : null}
        {!userId ? (
          <>
            <p className="text-sm text-muted-foreground">
              Devi effettuare il login con l&apos;email che ha ricevuto l&apos;invito.
            </p>
            <Link href={loginHref} className="inline-flex h-9 items-center rounded-md border px-3 text-sm font-medium">
              Vai al login
            </Link>
          </>
        ) : (
          <>
            <p className="text-sm text-muted-foreground">
              Sei autenticato come <span className="font-semibold">{email ?? "Account"}</span>. Conferma per entrare nel tenant.
            </p>
            <form action={acceptInvite}>
              <button type="submit" className="h-9 rounded-md border px-3 text-sm font-medium bg-primary text-primary-foreground">
                Accetta invito
              </button>
            </form>
          </>
        )}
      </section>
    </main>
  );
}

export default InviteAcceptPage;
