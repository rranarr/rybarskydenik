import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { ProfileClient } from "./profile-client";

export default async function ProfilePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth");

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  const { data: catches } = await supabase
    .from("catches")
    .select("id, weight_kg, species, caught_at, event_id")
    .eq("user_id", user.id)
    .order("caught_at", { ascending: false });

  const { data: events } = await supabase
    .from("event_participants")
    .select("event:events(id, name, starts_at, ends_at, mode)")
    .eq("user_id", user.id)
    .order("joined_at", { ascending: false });

  return (
    <ProfileClient
      profile={profile}
      email={user.email ?? ""}
      catches={catches ?? []}
      events={(events ?? []).map((e) => e.event).filter(Boolean) as never[]}
    />
  );
}
