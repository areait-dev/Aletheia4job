import { Suspense } from "react";
import { LoginForm } from "@/components/LoginForm";

export const dynamic = 'force-dynamic';

export default function LoginPage() {
  return (
    // Suspense è necessario perché LoginForm usa useSearchParams()
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse flex flex-col items-center gap-4">
          <div className="w-12 h-12 bg-primary/20 rounded-2xl" />
          <div className="h-4 w-24 bg-muted rounded" />
        </div>
      </div>
    }>
      <LoginForm />
    </Suspense>
  );
}
