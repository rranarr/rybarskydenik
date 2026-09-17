import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import { CatchForm } from "@/components/catch-form";

export default async function NewCatchPage({ params }: { params: { id: string } }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth");

  const { data: event } = await supabase
    .from("events")
    .select("id, name, starts_at, ends_at, mode")
    .eq("id", params.id)
    .single();

  if (!event) notFound();

  const now = new Date();
  const isActive = now >= new Date(event.starts_at) && now <= new Date(event.ends_at);
  if (!isActive) redirect(`/events/${params.id}`);

  const { data: participants, error: participantsError } = await supabase
    .from("event_participants")
    .select("user_id, profile:profiles(display_name)")
    .eq("event_id", params.id)
    .returns<{ user_id: string; profile: { display_name: string } | null }[]>();

  if (participantsError) throw new Error("Nepodařilo se načíst účastníky závodu.");
  if (!participants?.some((participant) => participant.user_id === user.id)) {
    redirect(`/events/${params.id}`);
  }

  const catchParticipants = participants
    .map((participant) => ({
      user_id: participant.user_id,
      display_name: participant.profile?.display_name ?? "Neznámý rybář",
    }))
    .sort((first, second) => first.display_name.localeCompare(second.display_name, "cs"));

  return (
    <main className="min-h-screen bg-background px-4 py-6">
      <div className="max-w-md mx-auto">
        <CatchForm eventId={params.id} eventName={event.name} userId={user.id} participants={catchParticipants} />
      </div>
    </main>
  );
}
