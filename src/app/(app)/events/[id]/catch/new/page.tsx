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

  const { data: participant } = await supabase
    .from("event_participants")
    .select("id")
    .eq("event_id", params.id)
    .eq("user_id", user.id)
    .single();

  if (!participant) redirect(`/events/${params.id}`);

  return (
    <main className="min-h-screen bg-background px-4 py-6">
      <div className="max-w-md mx-auto">
        <CatchForm eventId={params.id} eventName={event.name} userId={user.id} />
      </div>
    </main>
  );
}
