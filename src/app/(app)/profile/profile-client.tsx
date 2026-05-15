"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { signOut } from "@/lib/actions/auth";
import { format } from "date-fns";
import { cs } from "date-fns/locale";
import { Fish, Trophy, LogOut, Pencil, Check, X } from "lucide-react";
import Link from "next/link";

interface Profile {
  id: string;
  display_name: string;
  avatar_url: string | null;
}

interface CatchSummary {
  id: string;
  weight_kg: number;
  species: string;
  caught_at: string;
  event_id: string;
}

interface EventSummary {
  id: string;
  name: string;
  starts_at: string;
  ends_at: string;
  mode: string;
}

interface Props {
  profile: Profile | null;
  email: string;
  catches: CatchSummary[];
  events: EventSummary[];
}

export function ProfileClient({ profile, email, catches, events }: Props) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [displayName, setDisplayName] = useState(profile?.display_name ?? "");
  const [saving, setSaving] = useState(false);

  const totalWeight = catches.reduce((s, c) => s + Number(c.weight_kg), 0);
  const biggestCatch = catches.length > 0
    ? catches.reduce((max, c) => Number(c.weight_kg) > Number(max.weight_kg) ? c : max)
    : null;

  const initials = displayName.slice(0, 2).toUpperCase() || email.slice(0, 2).toUpperCase();

  async function saveDisplayName() {
    if (!displayName.trim()) return;
    setSaving(true);
    const supabase = createClient();
    const { error } = await supabase
      .from("profiles")
      .upsert({ id: profile?.id, display_name: displayName.trim() });
    setSaving(false);
    if (error) { toast.error("Chyba při ukládání"); return; }
    toast.success("Jméno uloženo");
    setEditing(false);
    router.refresh();
  }

  return (
    <div className="min-h-screen bg-background px-4 py-6 pb-24 max-w-md mx-auto space-y-6">
      {/* Avatar + name */}
      <div className="flex flex-col items-center gap-4 pt-4">
        <Avatar className="h-20 w-20 text-2xl">
          <AvatarImage src={profile?.avatar_url ?? undefined} />
          <AvatarFallback className="text-2xl font-bold">{initials}</AvatarFallback>
        </Avatar>

        {editing ? (
          <div className="flex items-center gap-2 w-full">
            <Input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="h-12 text-lg text-center"
              autoFocus
              onKeyDown={(e) => { if (e.key === "Enter") saveDisplayName(); if (e.key === "Escape") setEditing(false); }}
            />
            <Button size="icon" className="h-12 w-12 shrink-0" onClick={saveDisplayName} disabled={saving}>
              <Check className="h-5 w-5" />
            </Button>
            <Button variant="ghost" size="icon" className="h-12 w-12 shrink-0" onClick={() => setEditing(false)}>
              <X className="h-5 w-5" />
            </Button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold">{displayName || email}</h1>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setEditing(true)}>
              <Pencil className="h-4 w-4" />
            </Button>
          </div>
        )}
        <p className="text-sm text-muted-foreground">{email}</p>
      </div>

      <Separator />

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-xl border border-border bg-card p-3 text-center">
          <p className="text-2xl font-bold">{catches.length}</p>
          <p className="text-xs text-muted-foreground mt-1">Úlovků</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-3 text-center">
          <p className="text-2xl font-bold">{Math.round(totalWeight * 100) / 100}</p>
          <p className="text-xs text-muted-foreground mt-1">kg celkem</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-3 text-center">
          <p className="text-2xl font-bold">{events.length}</p>
          <p className="text-xs text-muted-foreground mt-1">Závodů</p>
        </div>
      </div>

      {biggestCatch && (
        <div className="rounded-xl border border-border bg-card p-4 flex items-center gap-3">
          <Trophy className="h-8 w-8 text-yellow-500 shrink-0" />
          <div>
            <p className="text-xs text-muted-foreground">Největší ryba</p>
            <p className="font-bold text-lg">{biggestCatch.weight_kg} kg — {biggestCatch.species}</p>
            <p className="text-xs text-muted-foreground">
              {format(new Date(biggestCatch.caught_at), "d. MMMM yyyy", { locale: cs })}
            </p>
          </div>
        </div>
      )}

      {/* Recent catches */}
      {catches.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-widest">
            Poslední úlovky
          </h2>
          {catches.slice(0, 5).map((c) => (
            <Link
              key={c.id}
              href={`/events/${c.event_id}`}
              className="flex items-center justify-between rounded-xl border border-border bg-card px-4 py-3 hover:bg-muted transition-colors"
            >
              <div className="flex items-center gap-2">
                <Fish className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">{c.species}</p>
                  <p className="text-xs text-muted-foreground">
                    {format(new Date(c.caught_at), "d. M. yyyy", { locale: cs })}
                  </p>
                </div>
              </div>
              <Badge variant="secondary">{c.weight_kg} kg</Badge>
            </Link>
          ))}
        </div>
      )}

      {/* Events */}
      {events.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-widest">
            Závody
          </h2>
          {events.slice(0, 5).map((e) => {
            const now = new Date();
            const isActive = now >= new Date(e.starts_at) && now <= new Date(e.ends_at);
            return (
              <Link
                key={e.id}
                href={`/events/${e.id}`}
                className="flex items-center justify-between rounded-xl border border-border bg-card px-4 py-3 hover:bg-muted transition-colors"
              >
                <p className="text-sm font-medium">{e.name}</p>
                {isActive
                  ? <Badge className="bg-green-600 text-white text-xs">Probíhá</Badge>
                  : <Badge variant="secondary" className="text-xs">{format(new Date(e.starts_at), "d. M. yyyy", { locale: cs })}</Badge>
                }
              </Link>
            );
          })}
        </div>
      )}

      <Separator />

      {/* Sign out */}
      <form action={signOut}>
        <Button type="submit" variant="outline" className="w-full h-12 text-destructive border-destructive hover:bg-destructive hover:text-destructive-foreground">
          <LogOut className="h-4 w-4 mr-2" /> Odhlásit se
        </Button>
      </form>
    </div>
  );
}
