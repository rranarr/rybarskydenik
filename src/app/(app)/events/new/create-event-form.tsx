"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { format } from "date-fns";
import { Copy } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";

const schema = z.object({
  name: z.string().min(2, "Název musí mít alespoň 2 znaky"),
  description: z.string().optional(),
  location: z.string().optional(),
  starts_at: z.string().min(1, "Vyberte datum zahájení"),
  ends_at: z.string().min(1, "Vyberte datum ukončení"),
  mode: z.enum(["individual", "teams"]),
}).refine((d) => new Date(d.ends_at) > new Date(d.starts_at), {
  message: "Konec musí být po začátku",
  path: ["ends_at"],
});

type FormValues = z.infer<typeof schema>;

function generateInviteCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

export function CreateEventForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [createdEvent, setCreatedEvent] = useState<{ id: string; invite_code: string } | null>(null);

  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      mode: "individual",
      starts_at: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
      ends_at: format(new Date(Date.now() + 24 * 60 * 60 * 1000), "yyyy-MM-dd'T'HH:mm"),
    },
  });

  const mode = watch("mode");

  async function onSubmit(values: FormValues) {
    setLoading(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push("/auth"); return; }

    let invite_code = generateInviteCode();
    for (let i = 0; i < 10; i++) {
      const { data } = await supabase.from("events").select("id").eq("invite_code", invite_code).single();
      if (!data) break;
      invite_code = generateInviteCode();
    }

    const { data: event, error } = await supabase
      .from("events")
      .insert({
        name: values.name,
        description: values.description || null,
        location: values.location || null,
        starts_at: new Date(values.starts_at).toISOString(),
        ends_at: new Date(values.ends_at).toISOString(),
        mode: values.mode,
        invite_code,
        master_user_id: user.id,
      })
      .select("id, invite_code")
      .single();

    setLoading(false);

    if (error) {
      toast.error("Chyba při vytváření závodu", { description: error.message });
      return;
    }

    await supabase.from("event_participants").insert({ event_id: event.id, user_id: user.id });
    setCreatedEvent(event);
    toast.success("Závod byl vytvořen! 🎣");
  }

  function copyCode() {
    if (createdEvent) {
      navigator.clipboard.writeText(createdEvent.invite_code);
      toast.success("Kód zkopírován!");
    }
  }

  if (createdEvent) {
    const eventUrl = `${window.location.origin}/events/${createdEvent.id}`;
    return (
      <div className="space-y-6 text-center">
        <div className="space-y-2">
          <p className="text-muted-foreground text-sm">Kód pro připojení k závodu</p>
          <div className="flex items-center justify-center gap-3">
            <span className="text-5xl font-mono font-bold tracking-widest">{createdEvent.invite_code}</span>
            <Button variant="ghost" size="icon" onClick={copyCode}>
              <Copy className="h-5 w-5" />
            </Button>
          </div>
        </div>

        <div className="flex justify-center">
          <QRCodeSVG value={eventUrl} size={160} bgColor="transparent" fgColor="currentColor" />
        </div>

        <div className="flex flex-col gap-2">
          <Button onClick={() => router.push(`/events/${createdEvent.id}`)} className="w-full h-12">
            Otevřít závod →
          </Button>
          {typeof navigator !== "undefined" && "share" in navigator && (
            <Button
              variant="outline"
              className="w-full h-12"
              onClick={() => navigator.share({ title: "Připoj se k závodu!", text: `Kód: ${createdEvent.invite_code}`, url: eventUrl })}
            >
              Sdílet kód
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      <div className="space-y-2">
        <Label htmlFor="name">Název závodu *</Label>
        <Input id="name" placeholder="Pstruhový pohár 2025" className="h-12 text-base" {...register("name")} />
        {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="location">Místo (volitelné)</Label>
        <Input id="location" placeholder="Řeka Vltava, Praha" className="h-12 text-base" {...register("location")} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Popis (volitelné)</Label>
        <Textarea id="description" placeholder="Popis závodu, pravidla..." rows={3} {...register("description")} />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label htmlFor="starts_at">Začátek *</Label>
          <Input id="starts_at" type="datetime-local" className="h-12" {...register("starts_at")} />
          {errors.starts_at && <p className="text-xs text-destructive">{errors.starts_at.message}</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="ends_at">Konec *</Label>
          <Input id="ends_at" type="datetime-local" className="h-12" {...register("ends_at")} />
          {errors.ends_at && <p className="text-xs text-destructive">{errors.ends_at.message}</p>}
        </div>
      </div>

      <div className="space-y-2">
        <Label>Režim závodu</Label>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setValue("mode", "individual")}
            className={`h-12 rounded-lg border text-sm font-medium transition-colors ${
              mode === "individual"
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-background text-foreground hover:bg-muted"
            }`}
          >
            👤 Jednotlivci
          </button>
          <button
            type="button"
            onClick={() => setValue("mode", "teams")}
            className={`h-12 rounded-lg border text-sm font-medium transition-colors ${
              mode === "teams"
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-background text-foreground hover:bg-muted"
            }`}
          >
            👥 Týmy
          </button>
        </div>
      </div>

      <Button type="submit" className="w-full h-14 text-base" disabled={loading}>
        {loading ? "Vytvářím závod..." : "Vytvořit závod 🎣"}
      </Button>
    </form>
  );
}
