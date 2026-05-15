import { Suspense } from "react";
import { AuthForm } from "./auth-form";
import { Fish } from "lucide-react";

export default function AuthPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-background px-4 py-8">
      <div className="w-full max-w-sm space-y-8">
        <div className="flex flex-col items-center gap-2 text-center">
          <div className="text-4xl">🎣</div>
          <h1 className="text-2xl font-bold">Rybářský deník</h1>
          <p className="text-sm text-muted-foreground">Přihlaste se nebo si vytvořte účet</p>
        </div>
        <Suspense fallback={<div className="h-64 animate-pulse rounded-xl bg-muted" />}>
          <AuthForm />
        </Suspense>
        <p className="text-center text-xs text-muted-foreground">
          <Fish className="inline h-3 w-3 mr-1" />
          Mobilní aplikace pro rybářské závody
        </p>
      </div>
    </main>
  );
}
