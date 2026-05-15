import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Fish, MapPin, Calendar } from "lucide-react";
import { format } from "date-fns";
import { cs } from "date-fns/locale";

export default async function HomePage() {
  const supabase = await createClient();

  const now = new Date().toISOString();
  const { data: activeEvents } = await supabase
    .from("events")
    .select("id, name, location, starts_at, ends_at, mode")
    .lte("starts_at", now)
    .gte("ends_at", now)
    .order("starts_at", { ascending: false })
    .limit(10);

  return (
    <main className="flex min-h-screen flex-col items-center justify-start bg-background px-4 py-12">
      <div className="w-full max-w-md space-y-10">
        {/* Hero */}
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary/10 text-5xl">
            🎣
          </div>
          <h1 className="text-4xl font-bold tracking-tight">Rybářský deník</h1>
          <p className="text-muted-foreground text-lg">
            Organizuj závody, zapisuj úlovky, sleduj žebříček — v reálném čase.
          </p>
        </div>

        {/* Auth buttons */}
        <div className="flex flex-col gap-3">
          <Button asChild size="lg" className="w-full text-base h-14">
            <Link href="/auth?tab=register">Registrovat se</Link>
          </Button>
          <Button asChild variant="outline" size="lg" className="w-full text-base h-14">
            <Link href="/auth?tab=login">Přihlásit se</Link>
          </Button>
        </div>

        {/* Active events */}
        {activeEvents && activeEvents.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
              Probíhající závody
            </h2>
            <div className="space-y-2">
              {activeEvents.map((event) => (
                <div
                  key={event.id}
                  className="rounded-lg border border-border bg-card px-4 py-3 space-y-1"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold truncate">{event.name}</span>
                    <Badge variant="default" className="shrink-0 bg-green-600 text-white">
                      Probíhá
                    </Badge>
                  </div>
                  {event.location && (
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <MapPin className="h-3 w-3" />
                      {event.location}
                    </div>
                  )}
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Calendar className="h-3 w-3" />
                    {format(new Date(event.ends_at), "d. M. yyyy HH:mm", { locale: cs })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <p className="text-center text-xs text-muted-foreground pb-4">
          <Fish className="inline h-3 w-3 mr-1" />
          Rybářský deník — mobilní aplikace pro rybářské závody
        </p>
      </div>
    </main>
  );
}
