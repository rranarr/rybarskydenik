"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Fish, Users, UserRound } from "lucide-react";

interface Profile { display_name: string; avatar_url: string | null; }
interface Team { id: string; name: string; }
interface Catch { user_id: string; weight_kg: number; species: string; profile?: Profile; }
interface Participant { user_id: string; team_id: string | null; profile?: Profile; team?: Team; }

interface Props {
  catches: Catch[];
  participants: Participant[];
  teams: Team[];
  mode: string;
}

interface PlayerEntry {
  user_id: string;
  display_name: string;
  avatar_url: string | null;
  total_weight: number;
  catch_count: number;
  biggest_fish: number;
  team_id: string | null;
  team_name: string | null;
}

interface TeamEntry {
  team_id: string;
  team_name: string;
  total_weight: number;
  catch_count: number;
  members: PlayerEntry[];
}

function buildLeaderboard(catches: Catch[], participants: Participant[], teams: Team[]): PlayerEntry[] {
  const map = new Map<string, PlayerEntry>();
  const teamNames = new Map(teams.map((team) => [team.id, team.name]));

  for (const p of participants) {
    map.set(p.user_id, {
      user_id: p.user_id,
      display_name: p.profile?.display_name ?? "Neznámý",
      avatar_url: p.profile?.avatar_url ?? null,
      total_weight: 0,
      catch_count: 0,
      biggest_fish: 0,
      team_id: p.team_id,
      team_name: p.team_id ? teamNames.get(p.team_id) ?? p.team?.name ?? null : null,
    });
  }

  for (const c of catches) {
    const entry = map.get(c.user_id);
    if (!entry) continue;
    entry.total_weight = Math.round((entry.total_weight + Number(c.weight_kg)) * 1000) / 1000;
    entry.catch_count += 1;
    if (Number(c.weight_kg) > entry.biggest_fish) entry.biggest_fish = Number(c.weight_kg);
  }

  return Array.from(map.values()).sort((a, b) => b.total_weight - a.total_weight);
}

function buildTeamLeaderboard(playerEntries: PlayerEntry[], teams: Team[]): TeamEntry[] {
  const teamMap = new Map<string, TeamEntry>();

  for (const t of teams) {
    teamMap.set(t.id, { team_id: t.id, team_name: t.name, total_weight: 0, catch_count: 0, members: [] });
  }

  for (const p of playerEntries) {
    if (!p.team_id) continue;
    const t = teamMap.get(p.team_id);
    if (!t) continue;
    t.total_weight = Math.round((t.total_weight + p.total_weight) * 1000) / 1000;
    t.catch_count += p.catch_count;
    t.members.push(p);
  }

  return Array.from(teamMap.values()).sort((a, b) => b.total_weight - a.total_weight);
}

const rankEmoji = ["🥇", "🥈", "🥉"];

export function LeaderboardTab({ catches, participants, teams, mode }: Props) {
  const players = buildLeaderboard(catches, participants, teams);
  const teamEntries = mode === "teams" ? buildTeamLeaderboard(players, teams) : [];

  if (players.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 py-16 text-center">
        <div className="text-5xl">🏆</div>
        <p className="text-muted-foreground">Žebříček se naplní prvním úlovkem</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Team leaderboard */}
      {mode === "teams" && teamEntries.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2 pb-1">
            <h3 className="flex items-center gap-2 text-sm font-semibold text-muted-foreground uppercase tracking-widest">
              <Users className="h-4 w-4" /> Týmy
            </h3>
            <Badge variant="secondary">{teamEntries.length}</Badge>
          </div>
          {teamEntries.map((team, i) => (
            <div key={team.team_id} className="rounded-xl border border-border bg-card px-4 py-3">
              <div className="flex items-center gap-3">
                <span className="text-xl w-8 shrink-0 text-center" aria-label={`${i + 1}. místo`}>{rankEmoji[i] ?? `${i + 1}.`}</span>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold break-words">{team.team_name}</p>
                  <p className="text-xs text-muted-foreground">{team.members.length} členů · {team.catch_count} úlovků</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-xl font-bold tabular-nums">{team.total_weight} kg</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Individual leaderboard — all participants, regardless of team */}
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2 pb-1">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-muted-foreground uppercase tracking-widest">
            <UserRound className="h-4 w-4" /> Jednotlivci
          </h3>
          <Badge variant="secondary">{players.length}</Badge>
        </div>
        {mode === "teams" && (
          <p className="text-xs text-muted-foreground pb-2">Celkové pořadí všech rybářů napříč týmy podle váhy úlovků.</p>
        )}
        {players.map((p, i) => (
          <div key={p.user_id} className="rounded-xl border border-border bg-card px-4 py-3">
            <div className="flex items-center gap-3">
              <span className="text-xl w-8 shrink-0 text-center" aria-label={`${i + 1}. místo`}>{rankEmoji[i] ?? `${i + 1}.`}</span>
              <Avatar className="hidden h-8 w-8 shrink-0 sm:flex">
                <AvatarImage src={p.avatar_url ?? undefined} />
                <AvatarFallback className="text-xs">
                  {p.display_name.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0 space-y-1">
                <p className="font-medium break-words">{p.display_name}</p>
                {mode === "teams" && (
                  <Badge variant={p.team_id ? "secondary" : "outline"} className="max-w-full whitespace-normal break-words text-xs">
                    {p.team_name ?? (p.team_id ? "Neznámý tým" : "Bez týmu")}
                  </Badge>
                )}
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1"><Fish className="h-3 w-3" /> {p.catch_count} úlovků</span>
                  {p.biggest_fish > 0 && <span>· max {p.biggest_fish} kg</span>}
                </div>
              </div>
              <div className="text-right shrink-0">
                <p className="text-xl font-bold tabular-nums">{p.total_weight} kg</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
