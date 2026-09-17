import Link from "next/link";
import { redirect } from "next/navigation";
import { Fish, MapPin, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";

export default async function SelectCatchEventPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth");

  const { data: participations, error: participationError } = await supabase
    .from("event_participants")
    .select("event_id")
    .eq("user_id", user.id);

  if (participationError) throw new Error("Nepodařilo se načíst účast v závodech.");

  const eventIds = (participations ?? []).map((p) => p.event_id);
  const now = new Date().toISOString();
  const { data: events, error: eventsError } = eventIds.length > 0
    ? await supabase
        .from("events")
        .select("id, name, location")
        .in("id", eventIds)
        .lte("starts_at", now)
        .gte("ends_at", now)
        .order("starts_at", { ascending: false })
    : { data: [], error: null };

  if (eventsError) throw new Error("Nepodařilo se načíst probíhající závody.");

  if (events?.length === 1) redirect(`/events/${events[0].id}/catch/new`);

  return (
    <main className="min-h-screen bg-background px-4 py-6">
      <div className="max-w-md mx-auto space-y-5">
        <div className="space-y-2">
          <h1 className="text-2xl font-bold">Nový úlovek</h1>
          <p className="text-sm text-muted-foreground">
            Vyber závod, do kterého chceš zapsat úlovek.
          </p>
        </div>

        {events && events.length > 0 ? (
          <div className="space-y-3">
            {events.map((event) => (
              <Link
                key={event.id}
                href={`/events/${event.id}/catch/new`}
                className="flex items-center gap-3 rounded-xl border border-border bg-card p-4 transition-colors hover:bg-muted/50"
              >
                <Fish className="h-5 w-5 shrink-0 text-primary" />
                <div className="flex-1 min-w-0 space-y-1">
                  <p className="font-semibold break-words">{event.name}</p>
                  {event.location && (
                    <p className="flex items-center gap-1 text-xs text-muted-foreground">
                      <MapPin className="h-3 w-3 shrink-0" />{event.location}
                    </p>
                  )}
                </div>
                <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground" />
              </Link>
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-border bg-card p-6 text-center space-y-4">
            <Fish className="h-10 w-10 mx-auto text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              Úlovek lze zapsat pouze do probíhajícího závodu, kterého se účastníš.
              Momentálně žádný takový závod nemáš.
            </p>
            <Button asChild>
              <Link href="/dashboard">Přejít na závody</Link>
            </Button>
          </div>
        )}
      </div>
    </main>
  );
}