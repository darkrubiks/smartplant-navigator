import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { MBLogo } from "@/components/TopBar";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Truck, MapPin, Clock, Loader2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/checkin/$token")({
  component: CheckinPage,
});

type TokenRow = {
  id: string;
  company: string;
  driver_name: string;
  delivery_desc: string | null;
  dock: string | null;
  valid_until: string;
  destination_building_id: string | null;
  entry_gate_id: string | null;
  buildings_destination?: {
    id: string;
    number: string;
    name_pt: string;
    name_en: string | null;
  } | null;
  buildings_gate?: { id: string; number: string; name_pt: string; name_en: string | null } | null;
};

function CheckinPage() {
  const { token } = Route.useParams();
  const router = useRouter();
  const [state, setState] = useState<
    { status: "loading" } | { status: "error"; message: string } | { status: "ok"; data: TokenRow }
  >({ status: "loading" });

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from("supplier_tokens")
        .select(
          "id, company, driver_name, delivery_desc, dock, valid_until, destination_building_id, entry_gate_id, buildings_destination:buildings!supplier_tokens_destination_building_id_fkey(id, number, name_pt, name_en), buildings_gate:buildings!supplier_tokens_entry_gate_id_fkey(id, number, name_pt, name_en)",
        )
        .eq("token", token)
        .maybeSingle();
      if (error || !data) {
        setState({ status: "error", message: "Invalid or expired QR Code." });
        return;
      }
      if (new Date(data.valid_until) < new Date()) {
        setState({
          status: "error",
          message: "This access has expired. Request a new QR Code at the gate.",
        });
        return;
      }
      setState({ status: "ok", data: data as TokenRow });
    })();
  }, [token]);

  async function startNavigation() {
    if (state.status !== "ok") return;
    const t = state.data;
    await supabase.from("arrivals").insert({
      supplier_token_id: t.id,
      building_id: t.destination_building_id,
      company: t.company,
      source: "supplier_qr",
    });
    if (t.destination_building_id) {
      router.navigate({ to: "/nav/$destId", params: { destId: t.destination_building_id } });
    } else {
      toast.error("No destination is configured for this token.");
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-secondary/40 to-background">
      <header className="flex items-center justify-between p-4">
        <Link to="/">
          <MBLogo />
        </Link>
      </header>
      <main className="mx-auto max-w-md p-4">
        <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-[var(--shadow-elegant)]">
          <div className="bg-[var(--mb-graphite)] px-5 py-4 text-white">
            <div className="text-[11px] uppercase tracking-widest opacity-70">
              Supplier Check-in
            </div>
            <div className="text-lg font-semibold">Temporary access</div>
          </div>

          {state.status === "loading" && (
            <div className="grid place-items-center py-16">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          )}

          {state.status === "error" && (
            <div className="p-6 text-center">
              <AlertTriangle className="mx-auto mb-2 h-8 w-8 text-destructive" />
              <div className="font-semibold">{state.message}</div>
              <Button asChild className="mt-4">
                <Link to="/">Back</Link>
              </Button>
            </div>
          )}

          {state.status === "ok" && (
            <div className="space-y-4 p-5">
              <div>
                <div className="text-[11px] uppercase tracking-widest text-muted-foreground">
                  Welcome
                </div>
                <div className="text-2xl font-semibold">{state.data.driver_name}</div>
                <div className="text-sm text-muted-foreground">{state.data.company}</div>
              </div>

              <div className="rounded-xl border border-border bg-secondary/40 p-4 space-y-2 text-sm">
                <div className="flex items-start gap-2">
                  <Truck className="mt-0.5 h-4 w-4 text-[var(--mb-blue)]" />
                  <div>
                    <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
                      Delivery
                    </div>
                    <div className="font-medium">
                      {state.data.delivery_desc ?? "No description"}
                    </div>
                  </div>
                </div>
                {state.data.buildings_destination && (
                  <div className="flex items-start gap-2">
                    <MapPin className="mt-0.5 h-4 w-4 text-[var(--mb-blue)]" />
                    <div>
                      <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
                        Destination
                      </div>
                      <div className="font-medium">
                        Building {state.data.buildings_destination.number} —{" "}
                        {state.data.buildings_destination.name_en?.trim() ||
                          state.data.buildings_destination.name_pt}
                      </div>
                      {state.data.dock && (
                        <div className="text-xs text-muted-foreground">{state.data.dock}</div>
                      )}
                    </div>
                  </div>
                )}
                {state.data.buildings_gate && (
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 text-[var(--mb-blue)]" />
                    <div>
                      <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
                        Entry gate
                      </div>
                      <div className="font-medium">
                        {state.data.buildings_gate.number} —{" "}
                        {state.data.buildings_gate.name_en?.trim() ||
                          state.data.buildings_gate.name_pt}
                      </div>
                    </div>
                  </div>
                )}
                <div className="flex items-start gap-2">
                  <Clock className="mt-0.5 h-4 w-4 text-[var(--mb-blue)]" />
                  <div>
                    <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
                      Access valid until
                    </div>
                    <div className="font-medium">
                      {new Date(state.data.valid_until).toLocaleString("en-US")}
                    </div>
                  </div>
                </div>
              </div>

              {state.data.buildings_destination && (
                <div className="rounded-xl bg-[var(--mb-blue)]/10 border border-[var(--mb-blue)]/30 p-3 text-sm">
                  <div className="font-semibold text-[var(--mb-blue-dark)]">
                    Hello, {state.data.driver_name.split(" ")[0]}!
                  </div>
                  <div className="text-foreground/80">
                    Your delivery will be made at Building {state.data.buildings_destination.number}{" "}
                    —{" "}
                    {state.data.buildings_destination.name_en?.trim() ||
                      state.data.buildings_destination.name_pt}
                    . I’ve prepared the best route for you.
                  </div>
                </div>
              )}

              <Button
                onClick={startNavigation}
                className="w-full bg-[var(--mb-blue)] hover:bg-[var(--mb-blue-dark)] text-white h-11"
              >
                Start navigation
              </Button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
