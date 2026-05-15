import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { CreateEventForm } from "./create-event-form";

export default async function NewEventPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth");

  return (
    <main className="min-h-screen bg-background px-4 py-6">
      <div className="max-w-md mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Nový závod</h1>
          <p className="text-sm text-muted-foreground">Vytvoř rybářský závod a pozvi ostatní</p>
        </div>
        <CreateEventForm />
      </div>
    </main>
  );
}
