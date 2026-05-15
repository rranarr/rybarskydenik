import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import { CatchForm } from "@/components/catch-form";

export default async function EditCatchPage({
  params,
}: {
  params: { id: string; catchId: string };
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth");

  const { data: event } = await supabase
    .from("events")
    .select("id, name, starts_at, ends_at, master_user_id")
    .eq("id", params.id)
    .single();

  if (!event) notFound();

  const { data: catchData } = await supabase
    .from("catches")
    .select("*")
    .eq("id", params.catchId)
    .single();

  if (!catchData) notFound();

  const isMaster = event.master_user_id === user.id;
  const isOwner = catchData.user_id === user.id;
  if (!isMaster && !isOwner) redirect(`/events/${params.id}`);

  return (
    <main className="min-h-screen bg-background px-4 py-6">
      <div className="max-w-md mx-auto">
        <CatchForm
          eventId={params.id}
          eventName={event.name}
          userId={user.id}
          existingCatch={catchData}
        />
      </div>
    </main>
  );
}
