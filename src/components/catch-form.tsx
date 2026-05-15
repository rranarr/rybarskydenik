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
import { ArrowLeft, Fish } from "lucide-react";
import { FISH_SPECIES } from "@/lib/types";

const schema = z.object({
  species: z.string().min(1, "Vyberte druh"),
  weight_kg: z.string().min(1, "Zadejte váhu"),
  length_cm: z.string().optional(),
  note: z.string().optional(),
  caught_at: z.string().min(1),
});

type FormValues = z.infer<typeof schema>;

interface Props {
  eventId: string;
  eventName: string;
  userId: string;
  existingCatch?: {
    id: string;
    species: string;
    weight_kg: number;
    length_cm: number | null;
    note: string | null;
    caught_at: string;
  };
}

export function CatchForm({ eventId, eventName, userId, existingCatch }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [selectedSpecies, setSelectedSpecies] = useState<string>(existingCatch?.species ?? "Kapr");

  const { register, handleSubmit, setValue, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      species: existingCatch?.species ?? "Kapr",
      weight_kg: existingCatch?.weight_kg ? String(existingCatch.weight_kg) : "",
      length_cm: existingCatch?.length_cm ? String(existingCatch.length_cm) : "",
      note: existingCatch?.note ?? "",
      caught_at: existingCatch
        ? format(new Date(existingCatch.caught_at), "yyyy-MM-dd'T'HH:mm")
        : format(new Date(), "yyyy-MM-dd'T'HH:mm"),
    },
  });

  async function onSubmit(values: FormValues) {
    setLoading(true);
    const supabase = createClient();

    const payload = {
      event_id: eventId,
      user_id: userId,
      species: selectedSpecies,
      weight_kg: parseFloat(values.weight_kg),
      length_cm: values.length_cm ? parseFloat(values.length_cm) : null,
      note: values.note || null,
      caught_at: new Date(values.caught_at).toISOString(),
    };

    let error;
    if (existingCatch) {
      ({ error } = await supabase.from("catches").update(payload).eq("id", existingCatch.id));
    } else {
      ({ error } = await supabase.from("catches").insert(payload));
    }

    setLoading(false);

    if (error) {
      toast.error("Chyba při ukládání", { description: error.message });
      return;
    }

    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
      navigator.vibrate(200);
    }

    toast.success(existingCatch ? "Úlovek upraven!" : "Úlovek zapsán! 🎣");
    router.push(`/events/${eventId}`);
    router.refresh();
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-xl font-bold">{existingCatch ? "Upravit úlovek" : "Nový úlovek"}</h1>
          <p className="text-xs text-muted-foreground">{eventName}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        {/* Species grid */}
        <div className="space-y-2">
          <Label>Druh ryby *</Label>
          <div className="grid grid-cols-3 gap-2">
            {FISH_SPECIES.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => { setSelectedSpecies(s); setValue("species", s); }}
                className={`h-12 rounded-lg border text-sm font-medium transition-colors ${
                  selectedSpecies === s
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-background text-foreground hover:bg-muted"
                }`}
              >
                {s}
              </button>
            ))}
          </div>
          {errors.species && <p className="text-sm text-destructive">{errors.species.message}</p>}
        </div>

        {/* Weight */}
        <div className="space-y-2">
          <Label htmlFor="weight_kg">Váha (kg) *</Label>
          <div className="relative">
            <Input
              id="weight_kg"
              type="number"
              step="0.001"
              min="0.001"
              placeholder="4.25"
              inputMode="decimal"
              className="h-16 text-2xl font-bold pr-12"
              {...register("weight_kg")}
            />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">kg</span>
          </div>
          {errors.weight_kg && <p className="text-sm text-destructive">{errors.weight_kg.message}</p>}
        </div>

        {/* Length */}
        <div className="space-y-2">
          <Label htmlFor="length_cm">Délka (cm) – volitelné</Label>
          <div className="relative">
            <Input
              id="length_cm"
              type="number"
              step="1"
              min="1"
              placeholder="65"
              className="h-12 text-lg pr-12"
              {...register("length_cm")}
            />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground">cm</span>
          </div>
        </div>

        {/* Date/time */}
        <div className="space-y-2">
          <Label htmlFor="caught_at">Čas úlovku</Label>
          <Input id="caught_at" type="datetime-local" className="h-12" {...register("caught_at")} />
        </div>

        {/* Note */}
        <div className="space-y-2">
          <Label htmlFor="note">Poznámka (volitelné)</Label>
          <Textarea id="note" placeholder="Chycen na plávek, návnada kukuřice..." rows={2} {...register("note")} />
        </div>

        <Button type="submit" className="w-full h-16 text-lg font-bold" disabled={loading}>
          {loading ? "Ukládám..." : (
            <><Fish className="h-5 w-5 mr-2" />{existingCatch ? "Uložit změny" : "Zapsat úlovek 🎣"}</>
          )}
        </Button>
      </form>
    </div>
  );
}
