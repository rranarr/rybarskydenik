import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import { EventDetailClient } from "./event-detail-client";

export default async function EventDetailPage({ params }: { params: { id: string } }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth");

  const { data: event } = await supabase
    .from("events")
    .select("*")
    .eq("id", params.id)
    .single();

  if (!event) notFound();

  const { data: participant } = await supabase
    .from("event_participants")
    .select("id, team_id")
    .eq("event_id", params.id)
    .eq("user_id", user.id)
    .single();

  const { data: catches } = await supabase
    .from("catches")
    .select("*, profile:profiles(display_name, avatar_url)")
    .eq("event_id", params.id)
    .order("caught_at", { ascending: false });

  const { data: participants } = await supabase
    .from("event_participants")
    .select("id, user_id, team_id, profile:profiles(display_name, avatar_url), team:teams(id, name)")
    .eq("event_id", params.id);

  const { data: teams } = await supabase
    .from("teams")
    .select("*")
    .eq("event_id", params.id)
    .order("name");

  return (
    <EventDetailClient
      event={event as never}
      userId={user.id}
      isParticipant={!!participant}
      catches={(catches ?? []) as never[]}
      participants={(participants ?? []) as never[]}
      teams={(teams ?? []) as never[]}
    />
  );
}
