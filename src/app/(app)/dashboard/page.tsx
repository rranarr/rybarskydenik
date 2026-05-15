import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, LogIn, Fish, Calendar, MapPin, Trophy } from "lucide-react";
import { format } from "date-fns";
import { cs } from "date-fns/locale";
import { JoinEventModal } from "./join-event-modal";
import { SignOutButton } from "@/components/sign-out-button";

function getEventStatus(startsAt: string, endsAt: string) {
  const now = new Date();
  const start = new Date(startsAt);
  const end = new Date(endsAt);
  if (now < start) return "pending";
  if (now > end) return "ended";
  return "active";
}

const statusLabels: Record<string, { label: string; className: string }> = {
  active: { label: "Probíhá", className: "bg-green-600 text-white" },
  pending: { label: "Čeká na start", className: "bg-yellow-600 text-white" },
  ended: { label: "Skončil", className: "bg-muted text-muted-foreground" },
};

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth");

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name")
    .eq("id", user.id)
    .single();

  const { data: participations } = await supabase
    .from("event_participants")
    .select("event_id, events(id, name, location, starts_at, ends_at, mode, master_user_id, invite_code)")
    .eq("user_id", user.id)
    .order("joined_at", { ascending: false });

  type EventRow = {
    id: string; name: string; location: string | null;
    starts_at: string; ends_at: string; mode: string;
    master_user_id: string; invite_code: string;
  };
  const events: EventRow[] = (participations
    ?.map((p) => p.events)
    .filter(Boolean) as unknown as EventRow[]) ?? [];

  const myEvents = events.filter((e) => e.master_user_id === user.id);
  const joinedEvents = events.filter((e) => e.master_user_id !== user.id);

  const eventIds = events.map((e) => e.id);
  const catchCounts: Record<string, number> = {};
  if (eventIds.length > 0) {
    const { data: counts } = await supabase
      .from("catches")
      .select("event_id")
      .in("event_id", eventIds);
    counts?.forEach((c) => {
      catchCounts[c.event_id] = (catchCounts[c.event_id] ?? 0) + 1;
    });
  }

  return (
    <main className="min-h-screen bg-background px-4 py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Ahoj, {profile?.display_name ?? "rybáři"}! 🎣</h1>
          <p className="text-sm text-muted-foreground">Tvé závody a úlovky</p>
        </div>
        <SignOutButton />
      </div>

      {/* Action buttons */}
      <div className="grid grid-cols-2 gap-3">
        <Button asChild size="lg" className="h-14 text-sm">
          <Link href="/events/new">
            <Plus className="h-5 w-5 mr-2" />
            Vytvořit závod
          </Link>
        </Button>
        <JoinEventModal>
          <Button variant="outline" size="lg" className="w-full h-14 text-sm">
            <LogIn className="h-5 w-5 mr-2" />
            Připojit se
          </Button>
        </JoinEventModal>
      </div>

      {/* My events */}
      {myEvents.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
            <Trophy className="h-4 w-4" /> Moje závody
          </h2>
          <div className="space-y-2">
            {myEvents.map((event) => {
              const status = getEventStatus(event.starts_at, event.ends_at);
              const s = statusLabels[status];
              return (
                <Link key={event.id} href={`/events/${event.id}`}>
                  <div className="rounded-xl border border-border bg-card px-4 py-3 space-y-2 active:opacity-80 transition-opacity">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold truncate">{event.name}</span>
                      <div className="flex items-center gap-2 shrink-0">
                        {catchCounts[event.id] > 0 && (
                          <Badge variant="secondary" className="text-xs">
                            <Fish className="h-3 w-3 mr-1" />{catchCounts[event.id]}
                          </Badge>
                        )}
                        <Badge className={`text-xs ${s.className}`}>{s.label}</Badge>
                      </div>
                    </div>
                    {event.location && (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <MapPin className="h-3 w-3" />{event.location}
                      </div>
                    )}
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Calendar className="h-3 w-3" />
                      {format(new Date(event.starts_at), "d. M.", { locale: cs })}
                      {" — "}
                      {format(new Date(event.ends_at), "d. M. yyyy", { locale: cs })}
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {/* Joined events */}
      {joinedEvents.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
            <Fish className="h-4 w-4" /> Aktivní závody
          </h2>
          <div className="space-y-2">
            {joinedEvents.map((event) => {
              const status = getEventStatus(event.starts_at, event.ends_at);
              const s = statusLabels[status];
              return (
                <Link key={event.id} href={`/events/${event.id}`}>
                  <div className="rounded-xl border border-border bg-card px-4 py-3 space-y-2 active:opacity-80 transition-opacity">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold truncate">{event.name}</span>
                      <div className="flex items-center gap-2 shrink-0">
                        {catchCounts[event.id] > 0 && (
                          <Badge variant="secondary" className="text-xs">
                            <Fish className="h-3 w-3 mr-1" />{catchCounts[event.id]}
                          </Badge>
                        )}
                        <Badge className={`text-xs ${s.className}`}>{s.label}</Badge>
                      </div>
                    </div>
                    {event.location && (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <MapPin className="h-3 w-3" />{event.location}
                      </div>
                    )}
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Calendar className="h-3 w-3" />
                      {format(new Date(event.starts_at), "d. M.", { locale: cs })}
                      {" — "}
                      {format(new Date(event.ends_at), "d. M. yyyy", { locale: cs })}
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {events.length === 0 && (
        <div className="flex flex-col items-center gap-4 py-16 text-center">
          <div className="text-6xl">🎣</div>
          <p className="text-muted-foreground">Zatím žádné závody.</p>
          <p className="text-sm text-muted-foreground">Vytvořte nový závod nebo se připojte pomocí kódu.</p>
        </div>
      )}
    </main>
  );
}
