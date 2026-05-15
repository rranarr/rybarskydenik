"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { joinEventByCode } from "@/lib/actions/events";
import { toast } from "sonner";

export function JoinEventModal({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [code, setCode] = useState("");

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

    const msg = result.mode === "teams"
      ? "Připojen! Zakladatel tě přiřadí do týmu. 🎣"
      : "Připojen! 🎣";
    toast.success(msg);
    setOpen(false);
    router.push(`/events/${result.eventId}`);
    router.refresh();
  }

  function handleOpenChange(v: boolean) {
    setOpen(v);
    if (!v) setCode("");
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-w-sm mx-auto">
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
      </DialogContent>
    </Dialog>
  );
}
