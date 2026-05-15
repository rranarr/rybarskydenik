"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { joinEventByCode, joinTeam } from "@/lib/actions/events";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { Plus } from "lucide-react";

interface Team {
  id: string;
  name: string;
}

type Step = "code" | "teams";

export function JoinEventModal({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<Step>("code");
  const [loading, setLoading] = useState(false);
  const [code, setCode] = useState("");
  const [eventId, setEventId] = useState("");
  const [teams, setTeams] = useState<Team[]>([]);
  const [newTeamName, setNewTeamName] = useState("");
  const [showNewTeam, setShowNewTeam] = useState(false);

  async function handleCodeSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (code.trim().length !== 6) {
      toast.error("Kód musí mít 6 znaků");
      return;
    }
    setLoading(true);
    const result = await joinEventByCode(code.trim());
    setLoading(false);

    if ("error" in result && result.error) {
      toast.error(result.error);
      return;
    }

    if (result.alreadyJoined) {
      toast.info("Už jsi součástí tohoto závodu");
      setOpen(false);
      router.push(`/events/${result.eventId}`);
      return;
    }

    if (result.mode === "individual") {
      toast.success("Připojen! 🎣");
      setOpen(false);
      router.push(`/events/${result.eventId}`);
      router.refresh();
      return;
    }

    // teams mode — fetch teams and show team picker
    const supabase = createClient();
    const { data: teamsData } = await supabase
      .from("teams")
      .select("id, name")
      .eq("event_id", result.eventId)
      .order("name");

    setEventId(result.eventId!);
    setTeams(teamsData ?? []);
    setStep("teams");
  }

  async function handleTeamJoin(teamId: string | null, customName?: string) {
    setLoading(true);
    const result = await joinTeam(eventId, teamId, customName);
    setLoading(false);

    if (result?.error) {
      toast.error(result.error);
      return;
    }

    toast.success("Připojen k týmu! 🎣");
    setOpen(false);
    router.push(`/events/${eventId}`);
    router.refresh();
  }

  function handleOpenChange(v: boolean) {
    setOpen(v);
    if (!v) {
      setStep("code");
      setCode("");
      setNewTeamName("");
      setShowNewTeam(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-w-sm mx-auto">
        {step === "code" && (
          <>
            <DialogHeader>
              <DialogTitle>Připojit se k závodu</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCodeSubmit} className="space-y-4 mt-2">
              <div className="space-y-2">
                <Label htmlFor="invite-code">Kód závodu (6 znaků)</Label>
                <Input
                  id="invite-code"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  placeholder="KAP42X"
                  maxLength={6}
                  className="h-14 text-2xl tracking-widest text-center font-mono uppercase"
                  autoFocus
                />
              </div>
              <Button type="submit" className="w-full h-12" disabled={loading || code.length !== 6}>
                {loading ? "Hledám závod..." : "Připojit se"}
              </Button>
            </form>
          </>
        )}

        {step === "teams" && (
          <>
            <DialogHeader>
              <DialogTitle>Vyber tým</DialogTitle>
            </DialogHeader>
            <div className="space-y-2 mt-2">
              {teams.map((team) => (
                <Button
                  key={team.id}
                  variant="outline"
                  className="w-full h-12 text-base justify-start"
                  onClick={() => handleTeamJoin(team.id)}
                  disabled={loading}
                >
                  {team.name}
                </Button>
              ))}

              {!showNewTeam ? (
                <Button
                  variant="ghost"
                  className="w-full h-12 text-base"
                  onClick={() => setShowNewTeam(true)}
                >
                  <Plus className="h-4 w-4 mr-2" /> Nový tým
                </Button>
              ) : (
                <div className="flex gap-2">
                  <Input
                    value={newTeamName}
                    onChange={(e) => setNewTeamName(e.target.value)}
                    placeholder="Název týmu"
                    className="h-12"
                    autoFocus
                  />
                  <Button
                    className="h-12 px-4"
                    onClick={() => handleTeamJoin(null, newTeamName)}
                    disabled={!newTeamName.trim() || loading}
                  >
                    OK
                  </Button>
                </div>
              )}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
