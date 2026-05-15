"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";
import { assignParticipantTeam, createTeam } from "@/lib/actions/events";
import { Plus, X } from "lucide-react";

interface Profile { display_name: string; avatar_url: string | null; }
interface Team { id: string; name: string; }
interface Participant { id: string; user_id: string; team_id: string | null; profile?: Profile; }

interface Props {
  eventId: string;
  teams: Team[];
  participants: Participant[];
  masterUserId: string;
}

export function TeamManager({ eventId, teams: initialTeams, participants, masterUserId }: Props) {
  const router = useRouter();
  const [teams] = useState<Team[]>(initialTeams);
  const [newTeamName, setNewTeamName] = useState("");
  const [addingTeam, setAddingTeam] = useState(false);
  const [loading, setLoading] = useState<string | null>(null);

  async function handleCreateTeam() {
    if (!newTeamName.trim()) return;
    setAddingTeam(true);
    const result = await createTeam(eventId, newTeamName.trim());
    setAddingTeam(false);
    if (result?.error) { toast.error(result.error); return; }
    toast.success(`Tým "${newTeamName}" vytvořen`);
    setNewTeamName("");
    router.refresh();
  }

  async function handleAssign(participantUserId: string, teamId: string | null) {
    setLoading(participantUserId);
    const result = await assignParticipantTeam(eventId, participantUserId, teamId);
    setLoading(null);
    if (result?.error) { toast.error(result.error); return; }
    router.refresh();
  }

  const unassigned = participants.filter((p) => p.user_id !== masterUserId && !p.team_id);
  const assigned = participants.filter((p) => p.user_id !== masterUserId && p.team_id);

  return (
    <div className="space-y-5">
      {/* Create team */}
      <div className="space-y-2">
        <p className="text-sm font-semibold text-muted-foreground uppercase tracking-widest">Týmy</p>
        <div className="flex gap-2">
          <Input
            value={newTeamName}
            onChange={(e) => setNewTeamName(e.target.value)}
            placeholder="Název nového týmu"
            className="h-10"
            onKeyDown={(e) => { if (e.key === "Enter") handleCreateTeam(); }}
          />
          <Button
            onClick={handleCreateTeam}
            disabled={!newTeamName.trim() || addingTeam}
            className="h-10 px-4 shrink-0"
          >
            <Plus className="h-4 w-4 mr-1" /> Přidat
          </Button>
        </div>
        {teams.length > 0 && (
          <div className="flex flex-wrap gap-2 pt-1">
            {teams.map((t) => (
              <Badge key={t.id} variant="secondary" className="text-sm px-3 py-1">{t.name}</Badge>
            ))}
          </div>
        )}
      </div>

      {/* Unassigned participants */}
      {unassigned.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-semibold text-muted-foreground uppercase tracking-widest">
            Nepřiřazeni ({unassigned.length})
          </p>
          {unassigned.map((p) => (
            <div key={p.id} className="rounded-xl border border-border bg-card p-3 space-y-2">
              <div className="flex items-center gap-2">
                <Avatar className="h-7 w-7">
                  <AvatarImage src={p.profile?.avatar_url ?? undefined} />
                  <AvatarFallback className="text-xs">
                    {p.profile?.display_name?.slice(0, 2).toUpperCase() ?? "??"}
                  </AvatarFallback>
                </Avatar>
                <span className="text-sm font-medium">{p.profile?.display_name ?? "Neznámý"}</span>
              </div>
              {teams.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {teams.map((t) => (
                    <Button
                      key={t.id}
                      size="sm"
                      variant="outline"
                      className="h-8 text-xs"
                      disabled={loading === p.user_id}
                      onClick={() => handleAssign(p.user_id, t.id)}
                    >
                      {t.name}
                    </Button>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">Nejprve vytvoř týmy výše</p>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Assigned participants */}
      {assigned.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-semibold text-muted-foreground uppercase tracking-widest">
            Přiřazeni
          </p>
          {assigned.map((p) => {
            const team = teams.find((t) => t.id === p.team_id);
            return (
              <div key={p.id} className="flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2">
                <Avatar className="h-7 w-7">
                  <AvatarImage src={p.profile?.avatar_url ?? undefined} />
                  <AvatarFallback className="text-xs">
                    {p.profile?.display_name?.slice(0, 2).toUpperCase() ?? "??"}
                  </AvatarFallback>
                </Avatar>
                <span className="text-sm flex-1">{p.profile?.display_name ?? "Neznámý"}</span>
                <Badge variant="outline" className="text-xs">{team?.name ?? "?"}</Badge>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-muted-foreground"
                  disabled={loading === p.user_id}
                  onClick={() => handleAssign(p.user_id, null)}
                  title="Odebrat z týmu"
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
            );
          })}
        </div>
      )}

      {participants.filter((p) => p.user_id !== masterUserId).length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-4">
          Zatím se nikdo nepřipojil. Sdílej kód závodu z sekce výše.
        </p>
      )}
    </div>
  );
}
