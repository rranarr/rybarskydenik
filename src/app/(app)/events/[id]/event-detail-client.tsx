"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { format } from "date-fns";
import { cs } from "date-fns/locale";
import {
  Fish, Plus, Copy, MapPin, Calendar, Trophy, BarChart3, Info,
  Pencil, Trash2, ArrowLeft
} from "lucide-react";
import { LeaderboardTab } from "./leaderboard-tab";
import { StatsTab } from "./stats-tab";
import { TeamManager } from "./team-manager";

interface Profile { display_name: string; avatar_url: string | null; }
interface Team { id: string; name: string; created_at: string; }

interface Catch {
  id: string; event_id: string; user_id: string;
  species: string; weight_kg: number; length_cm: number | null;
  photo_url: string | null; note: string | null; caught_at: string;
  profile?: Profile;
}

interface Participant {
  id: string; user_id: string; team_id: string | null;
  profile?: Profile; team?: Team;
}

interface Event {
  id: string; name: string; description: string | null; location: string | null;
  starts_at: string; ends_at: string; mode: string;
  invite_code: string; master_user_id: string;
}

interface Props {
  event: Event;
  userId: string;
  isParticipant: boolean;
  catches: Catch[];
  participants: Participant[];
  teams: Team[];
}

function getEventStatus(startsAt: string, endsAt: string) {
  const now = new Date();
  if (now < new Date(startsAt)) return "pending";
  if (now > new Date(endsAt)) return "ended";
  return "active";
}

const statusConfig = {
  active: { label: "Probíhá", className: "bg-green-600 text-white" },
  pending: { label: "Čeká na start", className: "bg-yellow-600 text-white" },
  ended: { label: "Skončil", className: "bg-muted text-muted-foreground" },
};

export function EventDetailClient({ event, userId, isParticipant, catches: initialCatches, participants, teams }: Props) {
  const router = useRouter();
  const [catches, setCatches] = useState<Catch[]>(initialCatches);
  const status = getEventStatus(event.starts_at, event.ends_at);
  const isMaster = event.master_user_id === userId;
  const isActive = status === "active";

  const refetchCatches = useCallback(async () => {
    const supabase = createClient();
    const { data } = await supabase
      .from("catches")
      .select("*, profile:profiles(display_name, avatar_url)")
      .eq("event_id", event.id)
      .order("caught_at", { ascending: false });
    if (data) setCatches(data as Catch[]);
  }, [event.id]);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`event-catches-${event.id}`)
      .on("postgres_changes", {
        event: "*",
        schema: "public",
        table: "catches",
        filter: `event_id=eq.${event.id}`,
      }, (payload) => {
        refetchCatches();
        if (payload.eventType === "INSERT" && (payload.new as Catch).user_id !== userId) {
          toast("🎣 Nový úlovek!", { description: "Někdo právě zapsal úlovek" });
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [event.id, userId, refetchCatches]);

  async function deleteCatch(catchId: string) {
    const supabase = createClient();
    const { error } = await supabase.from("catches").delete().eq("id", catchId);
    if (error) { toast.error("Chyba při mazání"); return; }
    toast.success("Úlovek smazán");
    refetchCatches();
  }

  function copyInviteCode() {
    navigator.clipboard.writeText(event.invite_code);
    toast.success("Kód zkopírován!");
  }

  const sc = statusConfig[status as keyof typeof statusConfig];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-10 border-b border-border bg-background/95 backdrop-blur px-4 py-3">
        <div className="flex items-center gap-3 max-w-2xl mx-auto">
          <Button variant="ghost" size="icon" onClick={() => router.push("/dashboard")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1 min-w-0">
            <h1 className="font-bold text-lg truncate">{event.name}</h1>
            <div className="flex items-center gap-2">
              <Badge className={`text-xs ${sc.className}`}>{sc.label}</Badge>
              {event.mode === "teams" && <Badge variant="secondary" className="text-xs">Týmy</Badge>}
            </div>
          </div>
          {isParticipant && isActive && (
            <Button asChild size="sm" className="shrink-0">
              <Link href={`/events/${event.id}/catch/new`}>
                <Plus className="h-4 w-4 mr-1" /> Úlovek
              </Link>
            </Button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="max-w-2xl mx-auto">
        <Tabs defaultValue="leaderboard" className="w-full">
          <TabsList className="w-full rounded-none border-b border-border bg-background h-12 p-0">
            <TabsTrigger value="leaderboard" className="flex-1 h-full rounded-none data-[state=active]:border-b-2 data-[state=active]:border-primary">
              <Trophy className="h-4 w-4 mr-1" /> Žebříček
            </TabsTrigger>
            <TabsTrigger value="catches" className="flex-1 h-full rounded-none data-[state=active]:border-b-2 data-[state=active]:border-primary">
              <Fish className="h-4 w-4 mr-1" /> Úlovky
            </TabsTrigger>
            <TabsTrigger value="stats" className="flex-1 h-full rounded-none data-[state=active]:border-b-2 data-[state=active]:border-primary">
              <BarChart3 className="h-4 w-4 mr-1" /> Statistiky
            </TabsTrigger>
            <TabsTrigger value="info" className="flex-1 h-full rounded-none data-[state=active]:border-b-2 data-[state=active]:border-primary">
              <Info className="h-4 w-4 mr-1" /> Info
            </TabsTrigger>
          </TabsList>

          {/* Leaderboard */}
          <TabsContent value="leaderboard" className="mt-0 p-4">
            <LeaderboardTab catches={catches} participants={participants} teams={teams} mode={event.mode} />
          </TabsContent>

          {/* Catch feed */}
          <TabsContent value="catches" className="mt-0 p-4 space-y-3">
            {catches.length === 0 ? (
              <div className="flex flex-col items-center gap-3 py-16 text-center">
                <div className="text-5xl">🎣</div>
                <p className="text-muted-foreground">Zatím žádné úlovky</p>
                {isParticipant && isActive && (
                  <Button asChild>
                    <Link href={`/events/${event.id}/catch/new`}>Zapsat první úlovek</Link>
                  </Button>
                )}
              </div>
            ) : (
              catches.map((c) => {
                const canEdit = (c.user_id === userId && isActive) || isMaster;
                return (
                  <div key={c.id} className="rounded-xl border border-border bg-card p-4 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={c.profile?.avatar_url ?? undefined} />
                          <AvatarFallback className="text-xs">
                            {c.profile?.display_name?.slice(0, 2).toUpperCase() ?? "??"}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="text-sm font-medium">{c.profile?.display_name ?? "Neznámý"}</p>
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(c.caught_at), "d. M. HH:mm", { locale: cs })}
                          </p>
                        </div>
                      </div>
                      {canEdit && (
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                            <Link href={`/events/${event.id}/catch/${c.id}/edit`}>
                              <Pencil className="h-3.5 w-3.5" />
                            </Link>
                          </Button>
                          {isMaster && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive"
                              onClick={() => deleteCatch(c.id)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-2xl font-bold">{c.weight_kg} kg</span>
                      <div>
                        <Badge variant="secondary" className="text-xs">{c.species}</Badge>
                        {c.length_cm && (
                          <span className="text-xs text-muted-foreground ml-2">{c.length_cm} cm</span>
                        )}
                      </div>
                    </div>
                    {c.note && <p className="text-sm text-muted-foreground">{c.note}</p>}
                  </div>
                );
              })
            )}
          </TabsContent>

          {/* Stats */}
          <TabsContent value="stats" className="mt-0 p-4">
            <StatsTab catches={catches} teams={teams} participants={participants} mode={event.mode} />
          </TabsContent>

          {/* Info */}
          <TabsContent value="info" className="mt-0 p-4 space-y-5">
            {/* Event details */}
            <div className="space-y-2">
              {event.description && <p className="text-sm text-muted-foreground">{event.description}</p>}
              {event.location && (
                <div className="flex items-center gap-2 text-sm">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  {event.location}
                </div>
              )}
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                {format(new Date(event.starts_at), "d. M. yyyy HH:mm", { locale: cs })}
                {" — "}
                {format(new Date(event.ends_at), "d. M. yyyy HH:mm", { locale: cs })}
              </div>
            </div>

            <Separator />

            {/* Invite code */}
            {isParticipant && (
              <div className="space-y-2">
                <p className="text-sm font-semibold text-muted-foreground uppercase tracking-widest">Kód závodu</p>
                <div className="flex items-center gap-3">
                  <span className="text-3xl font-mono font-bold tracking-widest">{event.invite_code}</span>
                  <Button variant="ghost" size="icon" onClick={copyInviteCode}>
                    <Copy className="h-4 w-4" />
                  </Button>
                  {"share" in navigator && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => navigator.share({
                        title: `Připoj se k závodu ${event.name}`,
                        text: `Kód: ${event.invite_code}`,
                        url: window.location.href,
                      })}
                    >
                      Sdílet
                    </Button>
                  )}
                </div>
              </div>
            )}

            <Separator />

            {/* Participants */}
            <div className="space-y-2">
              <p className="text-sm font-semibold text-muted-foreground uppercase tracking-widest">
                Účastníci ({participants.length})
              </p>
              <div className="space-y-2">
                {participants.map((p) => (
                  <div key={p.id} className="flex items-center gap-2">
                    <Avatar className="h-7 w-7">
                      <AvatarImage src={p.profile?.avatar_url ?? undefined} />
                      <AvatarFallback className="text-xs">
                        {p.profile?.display_name?.slice(0, 2).toUpperCase() ?? "??"}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm">{p.profile?.display_name ?? "Neznámý"}</span>
                    {p.user_id === event.master_user_id && (
                      <Badge variant="secondary" className="text-xs">Správce</Badge>
                    )}
                    {p.team && (
                      <Badge variant="outline" className="text-xs ml-auto">{p.team.name}</Badge>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Team management — master only, teams mode */}
            {isMaster && event.mode === "teams" && (
              <>
                <Separator />
                <div className="space-y-2">
                  <p className="text-sm font-semibold text-muted-foreground uppercase tracking-widest">Správa týmů</p>
                  <TeamManager
                    eventId={event.id}
                    teams={teams}
                    participants={participants}
                    masterUserId={event.master_user_id}
                  />
                </div>
              </>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
