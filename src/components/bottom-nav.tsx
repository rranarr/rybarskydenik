"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Plus, User } from "lucide-react";
import { cn } from "@/lib/utils";

export function BottomNav() {
  const pathname = usePathname();
  const eventId = pathname.match(/^\/events\/([^/]+)(?:\/|$)/)?.[1];
  const newCatchHref = eventId && eventId !== "new"
    ? `/events/${eventId}/catch/new`
    : "/catch/new";

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="mx-auto flex max-w-md items-center">
        <Link
          href="/dashboard"
          className={cn(
            "flex flex-1 flex-col items-center justify-center gap-1 py-3 text-xs transition-colors min-h-[56px]",
            pathname === "/dashboard" ? "text-primary" : "text-muted-foreground hover:text-foreground"
          )}
        >
          <LayoutDashboard className="h-5 w-5" />
          <span>Závody</span>
        </Link>

        {/* Center FAB */}
        <div className="flex flex-1 justify-center">
          <Link
            href={newCatchHref}
            aria-label="Zapsat nový úlovek"
            title="Zapsat nový úlovek"
            className="flex items-center justify-center h-14 w-14 rounded-full bg-primary text-primary-foreground shadow-lg active:scale-95 transition-transform -translate-y-3"
          >
            <Plus className="h-7 w-7" />
          </Link>
        </div>

        <Link
          href="/profile"
          className={cn(
            "flex flex-1 flex-col items-center justify-center gap-1 py-3 text-xs transition-colors min-h-[56px]",
            pathname === "/profile" ? "text-primary" : "text-muted-foreground hover:text-foreground"
          )}
        >
          <User className="h-5 w-5" />
          <span>Profil</span>
        </Link>
      </div>
    </nav>
  );
}
