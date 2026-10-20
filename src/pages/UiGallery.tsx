// Development-only gallery of every src/ui primitive in every state (route /_ui).
// Stand-in until Storybook is wired (P1-27); same purpose: one page to eyeball EN/NE, light/dark,
// brand colours, Lite effects and focus states. Not shipped: the route exists only when import.meta.env.DEV.
import { useState } from "react";
import { useT } from "@/lib/i18n";
import { useTheme } from "@/theme/ThemeProvider";
import {
  Badge, Button, Card, Checkbox, ChoiceCard, Chip, EmptyState, Field, GlassPanel, IconButton, Input, Radio, Rating,
  Select, Skeleton, SkeletonGroup, Switch, Textarea, Heart, Package, ShoppingCart, Trash2, Plus,
  Dialog, Sheet, Popover, Tooltip, toast, Info,
} from "@/ui";

const BRANDS = ["#F5A524", "#FFF200", "#111111", "#7B7B7B", "#0B7285", "#C2255C", "#2F9E44"];

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className="space-y-3"><h2 className="m-0 text-xl font-bold">{title}</h2>{children}</section>;
}

export default function UiGallery() {
  const { locale, setLocale } = useT();
  const { mode, setMode, fxPref, setFxPref, setBrandColor } = useTheme();
  const [sw, setSw] = useState(true);
  const [pressed, setPressed] = useState(true);
  const [brandInfo, setBrandInfo] = useState<string>("");
  const [pay, setPay] = useState("cod");
  const [dlg, setDlg] = useState(false);
  const [sheet, setSheet] = useState(false);

  return (
    <main className="container-page space-y-8">
      <h1 className="text-3xl font-bold">UI gallery</h1>

      <Section title="Controls">
        <div className="flex flex-wrap gap-2">
          {(["system", "light", "dark"] as const).map((m) => <Chip key={m} pressed={mode === m} onClick={() => setMode(m)}>{m}</Chip>)}
          {(["auto", "full", "lite"] as const).map((m) => <Chip key={m} pressed={fxPref === m} onClick={() => setFxPref(m)}>fx:{m}</Chip>)}
          {(["en", "ne"] as const).map((l) => <Chip key={l} pressed={locale === l} onClick={() => setLocale(l)}>{l}</Chip>)}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {BRANDS.map((b) => (
            <button key={b} type="button" aria-label={`brand ${b}`} className="size-12 rounded-full border border-line-strong" style={{ background: b }}
              onClick={() => { const r = setBrandColor(b); setBrandInfo(r ? `${r.brand} on-brand ${r.onBrand} ratio ${r.ratio.toFixed(2)}${r.warning ? ` WARNING: ${r.warning}` : ""}` : ""); }} />
          ))}
          <Chip onClick={() => { setBrandColor(null); setBrandInfo(""); }}>reset brand</Chip>
        </div>
        {brandInfo && <p className="m-0 text-sm text-muted">{brandInfo}</p>}
      </Section>

      <Section title="Button">
        <div className="flex flex-wrap items-center gap-2">
          <Button>Add to cart</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="danger">Cancel order</Button>
          <Button leadingIcon={ShoppingCart}>With icon</Button>
          <Button loading>Loading</Button>
          <Button disabled>Disabled</Button>
          <Button size="lg">Large</Button>
          <Button size="sm" variant="secondary">Small</Button>
          <Button block>Block</Button>
        </div>
        <p className="m-0 text-sm text-muted">Nepali: <span lang="ne">कार्टमा राख्नुहोस्</span></p>
        <Button lang="ne">कार्टमा राख्नुहोस्</Button>
      </Section>

      <Section title="IconButton">
        <div className="flex items-center gap-2">
          <IconButton icon={ShoppingCart} label="Cart" badge={3} />
          <IconButton icon={Heart} label="Wishlist" pressed={pressed} onClick={() => setPressed(!pressed)} variant="secondary" />
          <IconButton icon={Plus} label="Add" variant="primary" />
          <IconButton icon={Trash2} label="Remove" disabled />
        </div>
      </Section>

      <Section title="Fields">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Full name" required>{(p) => <Input {...p} placeholder="Ramesh Shrestha" />}</Field>
          <Field label="Phone" hint="98XXXXXXXX" >{(p) => <Input {...p} inputMode="tel" />}</Field>
          <Field label="Email" error="Enter a valid email">{(p) => <Input {...p} type="email" defaultValue="nope" />}</Field>
          <Field label="District">{(p) => <Select {...p}><option>Kathmandu</option><option>Lalitpur</option></Select>}</Field>
          <Field label="Note" className="sm:col-span-2">{(p) => <Textarea {...p} />}</Field>
          <Field label="Disabled">{(p) => <Input {...p} disabled defaultValue="locked" />}</Field>
        </div>
      </Section>

      <Section title="Choices">
        <Checkbox label="Save this address" description="Use it next time" defaultChecked />
        <Radio name="r" label="Home" defaultChecked />
        <Radio name="r" label="Office" />
        <Switch checked={sw} onCheckedChange={setSw} label="Order notifications" />
        <div className="grid gap-3 sm:grid-cols-2">
          <ChoiceCard name="pay" value="cod" checked={pay === "cod"} onChange={() => setPay("cod")} label="Cash on delivery" description="Pay the rider" />
          <ChoiceCard name="pay" value="manual" checked={pay === "manual"} onChange={() => setPay("manual")} label="eSewa / bank transfer" description="Upload the receipt" />
        </div>
      </Section>

      <Section title="Chip and Badge">
        <div className="flex flex-wrap gap-2">
          <Chip pressed>In stock</Chip><Chip>On sale</Chip><Chip onRemove={() => undefined} removeLabel="Remove Books">Books</Chip>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge>Neutral</Badge><Badge tone="success">Delivered</Badge><Badge tone="warning">Low stock</Badge><Badge tone="danger">Cancelled</Badge><Badge tone="info">New</Badge>
        </div>
      </Section>

      <Section title="Rating, Card, Skeleton, EmptyState">
        <div className="flex flex-wrap gap-4"><Rating value={4.5} count={28} label="4.5 out of 5, 28 reviews" /><Rating value={3} label="3 out of 5" /><Rating value={0.5} label="0.5 out of 5" /></div>
        <div className="grid gap-3 sm:grid-cols-2">
          <Card>Flat card</Card>
          <Card interactive>Interactive card (hover on desktop)</Card>
        </div>
        <SkeletonGroup label="Loading products" className="grid grid-cols-2 gap-3 sm:grid-cols-4"><Skeleton variant="card" /><Skeleton variant="card" /><Skeleton variant="card" className="hidden sm:block" /><Skeleton variant="card" className="hidden sm:block" /></SkeletonGroup>
        <Skeleton lines={3} />
        <Card><EmptyState icon={Package} title="No orders yet" description="When you place an order it will show up here." action={<Button>Start shopping</Button>} /></Card>
      </Section>

      <Section title="Overlays (lazy chunks)">
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={() => setDlg(true)}>Open dialog</Button>
          <Button variant="secondary" onClick={() => setSheet(true)}>Open sheet</Button>
          <Button variant="secondary" onClick={() => toast.success("Added to cart", { action: { label: "Undo", onClick: () => toast.info("Undone") } })}>Toast + undo</Button>
          <Button variant="secondary" onClick={() => toast.error("Out of stock")}>Error toast</Button>
          <Popover trigger={<IconButton icon={Info} label="Delivery info" variant="secondary" />}><p className="m-0 max-w-64">Free delivery over Rs. 5,000 in Kathmandu Valley.</p></Popover>
          <Tooltip label="Wishlist"><IconButton icon={Heart} label="Wishlist tooltip" variant="secondary" /></Tooltip>
        </div>
        <Dialog open={dlg} onOpenChange={setDlg} title="Cancel this order?" description="The vendor will be told." closeLabel="Close"><div className="flex gap-2"><Button variant="danger" onClick={() => setDlg(false)}>Cancel order</Button><Button variant="secondary" onClick={() => setDlg(false)}>Keep order</Button></div></Dialog>
        <Sheet open={sheet} onOpenChange={setSheet} title="Filters"><p className="m-0">Price, availability, category (Phase 3).</p><Button className="mt-4" onClick={() => setSheet(false)}>Apply</Button></Sheet>
      </Section>

      <Section title="Glass (floating layer only)">
        <div className="relative h-40 overflow-hidden rounded-xl" style={{ background: "linear-gradient(135deg,#F5A524,#D1244F 55%,#15173A)" }}>
          <GlassPanel shape="dialog" className="absolute inset-x-4 top-4 p-4"><p className="m-0 font-semibold">Text on glass uses ink only</p><p className="m-0 text-sm">Muted text is not allowed here.</p></GlassPanel>
          <GlassPanel shape="chip" className="absolute bottom-4 left-4">-25%</GlassPanel>
        </div>
      </Section>
    </main>
  );
}
