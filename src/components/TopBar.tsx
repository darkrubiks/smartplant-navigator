import { Link, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LogOut, User as UserIcon, LayoutDashboard, Shield } from "lucide-react";

export function MBLogo({ className = "" }: { className?: string }) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className="flex h-9 w-9 shrink-0 items-center justify-center">
        <img
          src={`${import.meta.env.BASE_URL}mercedes-benz-star.svg`}
          alt=""
          aria-hidden="true"
          className="h-9 w-9 object-contain"
        />
      </div>
      <div className="leading-none">
        <div className="text-[15px] font-semibold tracking-tight text-foreground">
          SmartPlant <span className="text-[var(--mb-blue)]">Navigator</span>
        </div>
        <div className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
          Mercedes-Benz
        </div>
      </div>
    </div>
  );
}

export function TopBar() {
  const { user } = useAuth();
  const router = useRouter();
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    if (!user) return setIsAdmin(false);
    supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .then(({ data }) => setIsAdmin(!!data?.some((r) => r.role === "admin")));
  }, [user]);

  async function signOut() {
    await supabase.auth.signOut();
    router.navigate({ to: "/" });
  }

  return (
    <header className="pointer-events-none absolute inset-x-0 top-0 z-[500] flex items-start justify-between p-3 sm:p-4">
      <Link
        to="/"
        className="pointer-events-auto rounded-2xl bg-card/95 px-4 py-2 shadow-[var(--shadow-elegant)] backdrop-blur border border-border/60"
      >
        <MBLogo />
      </Link>
      <div className="pointer-events-auto flex items-center gap-2">
        {user ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="secondary"
                className="rounded-full bg-card/95 shadow-[var(--shadow-soft)] backdrop-blur h-10 px-3"
              >
                <UserIcon className="h-4 w-4" />
                <span className="hidden sm:inline">{user.email?.split("@")[0]}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>{user.email}</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {isAdmin && (
                <>
                  <DropdownMenuItem onClick={() => router.navigate({ to: "/dashboard" })}>
                    <LayoutDashboard className="mr-2 h-4 w-4" /> Dashboard
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => router.navigate({ to: "/admin" })}>
                    <Shield className="mr-2 h-4 w-4" /> Admin panel
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                </>
              )}
              <DropdownMenuItem onClick={signOut}>
                <LogOut className="mr-2 h-4 w-4" /> Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <Button
            asChild
            variant="default"
            className="rounded-full bg-[var(--mb-blue)] hover:bg-[var(--mb-blue-dark)] text-white shadow-[var(--shadow-elegant)] h-10 px-4"
          >
            <Link to="/auth">Sign in</Link>
          </Button>
        )}
      </div>
    </header>
  );
}
