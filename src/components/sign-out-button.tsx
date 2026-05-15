"use client";

import { signOut } from "@/lib/actions/auth";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";

export function SignOutButton() {
  return (
    <form action={signOut}>
      <Button variant="ghost" size="icon" type="submit" className="h-10 w-10">
        <LogOut className="h-5 w-5" />
      </Button>
    </form>
  );
}
