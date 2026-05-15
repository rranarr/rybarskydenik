"use client";

import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell
} from "recharts";

interface Team { id: string; name: string; }
interface Participant { user_id: string; team_id: string | null; }
interface Catch {
  user_id: string;
  weight_kg: number;
  species: string;
}

interface Props {
  catches: Catch[];
  teams: Team[];
  participants: Participant[];
  mode: string;
}

const COLORS = ["#3b82f6", "#22c55e", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#06b6d4", "#84cc16"];

export function StatsTab({ catches, teams, participants, mode }: Props) {
  if (catches.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 py-16 text-center">
        <div className="text-5xl">📊</div>
        <p className="text-muted-foreground">Statistiky se zobrazí po prvním úlovku</p>
      </div>
    );
  }

  const totalWeight = catches.reduce((s, c) => s + Number(c.weight_kg), 0);
  const avgWeight = totalWeight / catches.length;
  const biggest = catches.reduce((max, c) => Number(c.weight_kg) > Number(max.weight_kg) ? c : max);

  // Species frequency
  const speciesMap = new Map<string, number>();
  for (const c of catches) {
    speciesMap.set(c.species, (speciesMap.get(c.species) ?? 0) + 1);
  }
  const speciesData = Array.from(speciesMap.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);

  // Team comparison
  const teamWeightMap = new Map<string, number>();
  if (mode === "teams") {
    for (const t of teams) teamWeightMap.set(t.id, 0);
    for (const c of catches) {
      const p = participants.find((ep) => ep.user_id === c.user_id);
      if (p?.team_id) {
        teamWeightMap.set(p.team_id, (teamWeightMap.get(p.team_id) ?? 0) + Number(c.weight_kg));
      }
    }
  }
  const teamData = teams.map((t) => ({
    name: t.name,
    weight: Math.round((teamWeightMap.get(t.id) ?? 0) * 100) / 100,
  })).sort((a, b) => b.weight - a.weight);

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-3">
        <StatCard label="Celková váha" value={`${Math.round(totalWeight * 100) / 100} kg`} />
        <StatCard label="Počet úlovků" value={String(catches.length)} />
        <StatCard label="Průměrná váha" value={`${Math.round(avgWeight * 100) / 100} kg`} />
        <StatCard label="Největší ryba" value={`${biggest.weight_kg} kg`} sub={biggest.species} />
      </div>

      {/* Species chart */}
      {speciesData.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-widest">Druhy ryb</h3>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={speciesData} margin={{ top: 0, right: 0, bottom: 24, left: 0 }}>
              <XAxis
                dataKey="name"
                tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                angle={-30}
                textAnchor="end"
              />
              <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} allowDecimals={false} />
              <Tooltip
                contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: 8 }}
                labelStyle={{ color: "hsl(var(--foreground))" }}
                itemStyle={{ color: "hsl(var(--foreground))" }}
              />
              <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                {speciesData.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Team comparison */}
      {mode === "teams" && teamData.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-widest">Porovnání týmů</h3>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={teamData} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
              <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} unit=" kg" />
              <Tooltip
                contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: 8 }}
                labelStyle={{ color: "hsl(var(--foreground))" }}
                itemStyle={{ color: "hsl(var(--foreground))" }}
                formatter={(v) => [`${v} kg`, "Váha"]}
              />
              <Bar dataKey="weight" radius={[4, 4, 0, 0]}>
                {teamData.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-3 space-y-1">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-xl font-bold">{value}</p>
      {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
    </div>
  );
}
