"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

function generateInviteCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

export async function createEvent(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth");

  const name = formData.get("name") as string;
  const description = formData.get("description") as string | null;
  const location = formData.get("location") as string | null;
  const starts_at = formData.get("starts_at") as string;
  const ends_at = formData.get("ends_at") as string;
  const mode = formData.get("mode") as "individual" | "teams";

  let invite_code = generateInviteCode();
  let attempts = 0;

  while (attempts < 10) {
    const { data: existing } = await supabase
      .from("events")
      .select("id")
      .eq("invite_code", invite_code)
      .single();
    if (!existing) break;
    invite_code = generateInviteCode();
    attempts++;
  }

  const { data: event, error } = await supabase
    .from("events")
    .insert({
      name,
      description: description || null,
      location: location || null,
      starts_at,
      ends_at,
      mode,
      invite_code,
      master_user_id: user.id,
    })
    .select("id")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  await supabase.from("event_participants").insert({
    event_id: event.id,
    user_id: user.id,
  });

  revalidatePath("/dashboard");
  redirect(`/events/${event.id}`);
}

export async function joinEventByCode(code: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth");

  const { data: event, error } = await supabase
    .from("events")
    .select("id, mode")
    .eq("invite_code", code.toUpperCase())
    .single();

  if (error || !event) {
    return { error: "Neplatný kód závodu." };
  }

  const { data: existing } = await supabase
    .from("event_participants")
    .select("id")
    .eq("event_id", event.id)
    .eq("user_id", user.id)
    .single();

  if (existing) {
    return { eventId: event.id, mode: event.mode, alreadyJoined: true };
  }

  await supabase.from("event_participants").insert({
    event_id: event.id,
    user_id: user.id,
  });
  revalidatePath("/dashboard");

  return { eventId: event.id, mode: event.mode };
}

export async function assignParticipantTeam(eventId: string, participantUserId: string, teamId: string | null) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth");

  const { data: event } = await supabase
    .from("events")
    .select("master_user_id")
    .eq("id", eventId)
    .single();

  if (!event || event.master_user_id !== user.id) {
    return { error: "Nemáš oprávnění přiřazovat účastníky." };
  }

  const { error } = await supabase
    .from("event_participants")
    .update({ team_id: teamId })
    .eq("event_id", eventId)
    .eq("user_id", participantUserId);

  if (error) return { error: error.message };
  revalidatePath(`/events/${eventId}`);
  return { success: true };
}

export async function createTeam(eventId: string, name: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth");

  const { data: event } = await supabase
    .from("events")
    .select("master_user_id")
    .eq("id", eventId)
    .single();

  if (!event || event.master_user_id !== user.id) {
    return { error: "Nemáš oprávnění vytvářet týmy." };
  }

  const { error } = await supabase
    .from("teams")
    .insert({ event_id: eventId, name });

  if (error) return { error: error.message };
  revalidatePath(`/events/${eventId}`);
  return { success: true };
}

export async function joinTeam(eventId: string, teamId: string | null, newTeamName?: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth");

  let resolvedTeamId = teamId;

  if (!teamId && newTeamName) {
    const { data: newTeam, error } = await supabase
      .from("teams")
      .insert({ event_id: eventId, name: newTeamName })
      .select("id")
      .single();
    if (error) return { error: error.message };
    resolvedTeamId = newTeam.id;
  }

  const { error } = await supabase.from("event_participants").upsert({
    event_id: eventId,
    user_id: user.id,
    team_id: resolvedTeamId,
  }, { onConflict: "event_id,user_id" });

  if (error) return { error: error.message };
  revalidatePath("/dashboard");
  return { success: true };
}
