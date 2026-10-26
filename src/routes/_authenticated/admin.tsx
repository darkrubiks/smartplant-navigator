import { createFileRoute, Link } from "@tanstack/react-router";
import { ClientOnly } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { MBLogo } from "@/components/TopBar";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { ArrowLeft, Plus, QrCode, Copy, Loader2, Move, Save } from "lucide-react";
import type { BuildingRow } from "@/lib/types";
import { fetchBuildings, getBuildingName } from "@/lib/buildings";
import { PlantMap, type BuildingMarker } from "@/components/PlantMap";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({ meta: [{ title: "Admin — SmartPlant Navigator" }] }),
  component: AdminPage,
});

function AdminPage() {
  const [buildings, setBuildings] = useState<BuildingRow[]>([]);
  const [tokens, setTokens] = useState<
    Array<{ id: string; token: string; company: string; driver_name: string; valid_until: string }>
  >([]);
  const [form, setForm] = useState({
    company: "",
    driver_name: "",
    delivery_desc: "",
    destination_building_id: "",
    entry_gate_id: "",
    dock: "",
    hours: 8,
  });
  const [loading, setLoading] = useState(false);

  async function reload() {
    setBuildings(await fetchBuildings());
    const { data } = await supabase
      .from("supplier_tokens")
      .select("id, token, company, driver_name, valid_until")
      .order("created_at", { ascending: false })
      .limit(10);
    setTokens(data ?? []);
  }

  useEffect(() => {
    reload();
  }, []);

  async function createToken() {
    setLoading(true);
    try {
      const token = `MB-${Math.random().toString(36).slice(2, 8).toUpperCase()}-${Date.now().toString(36).toUpperCase()}`;
      const validUntil = new Date(Date.now() + form.hours * 3600 * 1000).toISOString();
      const { error } = await supabase.from("supplier_tokens").insert({
        token,
        company: form.company,
        driver_name: form.driver_name,
        delivery_desc: form.delivery_desc,
        destination_building_id: form.destination_building_id || null,
        entry_gate_id: form.entry_gate_id || null,
        dock: form.dock || null,
        valid_until: validUntil,
      });
      if (error) throw error;
      toast.success(`Token created: ${token}`);
      await reload();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Error creating token");
    } finally {
      setLoading(false);
    }
  }

  const gates = buildings.filter((b) => b.category === "gate");
  const destinations = buildings.filter((b) => b.category !== "gate");

  return (
    <div className="min-h-screen bg-secondary/30">
      <header className="flex items-center gap-3 border-b border-border bg-card px-4 py-3">
        <Link to="/" className="rounded-full p-2 hover:bg-accent">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <MBLogo />
        <div className="ml-auto text-sm text-muted-foreground">Admin panel</div>
      </header>

      <main className="mx-auto grid max-w-6xl gap-6 p-6 md:grid-cols-2">
        <Card className="p-5">
          <div className="mb-4 flex items-center gap-2">
            <QrCode className="h-5 w-5 text-[var(--mb-blue)]" />
            <h2 className="text-lg font-semibold">New Supplier QR Code</h2>
          </div>
          <div className="space-y-3">
            <Field label="Company">
              <Input
                value={form.company}
                onChange={(e) => setForm((f) => ({ ...f, company: e.target.value }))}
              />
            </Field>
            <Field label="Driver">
              <Input
                value={form.driver_name}
                onChange={(e) => setForm((f) => ({ ...f, driver_name: e.target.value }))}
              />
            </Field>
            <Field label="Delivery description">
              <Input
                value={form.delivery_desc}
                onChange={(e) => setForm((f) => ({ ...f, delivery_desc: e.target.value }))}
              />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Entry gate">
                <select
                  className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
                  value={form.entry_gate_id}
                  onChange={(e) => setForm((f) => ({ ...f, entry_gate_id: e.target.value }))}
                >
                  <option value="">Select…</option>
                  {gates.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.number} — {getBuildingName(g)}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Destination">
                <select
                  className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
                  value={form.destination_building_id}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, destination_building_id: e.target.value }))
                  }
                >
                  <option value="">Select…</option>
                  {destinations.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.number} — {getBuildingName(b)}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Dock (optional)">
                <Input
                  value={form.dock}
                  onChange={(e) => setForm((f) => ({ ...f, dock: e.target.value }))}
                  placeholder="Dock A3"
                />
              </Field>
              <Field label="Validity (hours)">
                <Input
                  type="number"
                  min={1}
                  max={72}
                  value={form.hours}
                  onChange={(e) => setForm((f) => ({ ...f, hours: Number(e.target.value) }))}
                />
              </Field>
            </div>
            <Button
              onClick={createToken}
              disabled={loading || !form.company || !form.driver_name}
              className="w-full bg-[var(--mb-blue)] hover:bg-[var(--mb-blue-dark)] text-white"
            >
              {loading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Plus className="mr-2 h-4 w-4" />
              )}
              Generate QR Code
            </Button>
          </div>
        </Card>

        <Card className="p-5">
          <h2 className="mb-4 text-lg font-semibold">Recently generated access links</h2>
          <div className="space-y-2">
            {tokens.length === 0 && (
              <div className="text-sm text-muted-foreground">No tokens yet.</div>
            )}
            {tokens.map((t) => {
              const url = `${new URL(import.meta.env.BASE_URL, window.location.origin).href}#/checkin/${encodeURIComponent(t.token)}`;
              return (
                <div
                  key={t.id}
                  className="rounded-lg border border-border bg-background p-3 text-sm"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-semibold">{t.driver_name}</div>
                      <div className="text-xs text-muted-foreground">{t.company}</div>
                    </div>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(url);
                        toast.success("URL copied");
                      }}
                      className="rounded p-1.5 hover:bg-accent"
                    >
                      <Copy className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="mt-1 text-xs font-mono text-[var(--mb-blue)] truncate">{url}</div>
                  <div className="mt-1 text-[11px] text-muted-foreground">
                    valid until {new Date(t.valid_until).toLocaleString("en-US")}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        <div className="md:col-span-2">
          <PositionEditor buildings={buildings} onSaved={reload} />
        </div>
      </main>
    </div>
  );
}

function PositionEditor({
  buildings,
  onSaved,
}: {
  buildings: BuildingRow[];
  onSaved: () => Promise<void>;
}) {
  const [edited, setEdited] = useState<Record<string, { x: number; y: number }>>({});
  const [saving, setSaving] = useState(false);

  const markers: BuildingMarker[] = buildings.map((b) => ({
    id: b.id,
    number: b.number,
    name: getBuildingName(b),
    category: b.category,
    x: edited[b.id]?.x ?? b.x,
    y: edited[b.id]?.y ?? b.y,
    description: b.description,
    department: b.department,
    responsible: b.responsible,
    phone: b.phone,
    hours: b.hours,
    dock: b.dock,
  }));

  const handleMove = (id: string, x: number, y: number) => {
    setEdited((e) => ({ ...e, [id]: { x, y } }));
  };

  const save = async () => {
    setSaving(true);
    try {
      const updates = Object.entries(edited);
      for (const [id, { x, y }] of updates) {
        const { error } = await supabase.from("buildings").update({ x, y }).eq("id", id);
        if (error) throw error;
      }
      toast.success(`${updates.length} position${updates.length === 1 ? "" : "s"} updated`);
      setEdited({});
      await onSaved();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Error saving positions");
    } finally {
      setSaving(false);
    }
  };

  const count = Object.keys(edited).length;

  return (
    <Card className="p-5">
      <div className="mb-4 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Move className="h-5 w-5 text-[var(--mb-blue)]" />
          <h2 className="text-lg font-semibold">Position editor</h2>
        </div>
        <div className="flex items-center gap-2">
          {count > 0 && (
            <div className="text-xs text-muted-foreground">
              {count} pending change{count === 1 ? "" : "s"}
            </div>
          )}
          <Button
            size="sm"
            disabled={saving || count === 0}
            onClick={save}
            className="bg-[var(--mb-blue)] hover:bg-[var(--mb-blue-dark)] text-white"
          >
            {saving ? (
              <Loader2 className="mr-1 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-1 h-4 w-4" />
            )}
            Save positions
          </Button>
        </div>
      </div>
      <p className="mb-3 text-xs text-muted-foreground">
        Drag markers directly on the official Mercedes-Benz plant map to correct any building
        position. Changes are applied only when you click Save.
      </p>
      <div className="h-[560px] w-full overflow-hidden rounded-lg border border-border">
        <ClientOnly
          fallback={
            <div className="grid h-full place-items-center text-sm text-muted-foreground">
              Loading editor…
            </div>
          }
        >
          <PlantMap buildings={markers} editable onMove={handleMove} />
        </ClientOnly>
      </div>
    </Card>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <Label className="mb-1 block text-xs">{label}</Label>
      {children}
    </div>
  );
}
