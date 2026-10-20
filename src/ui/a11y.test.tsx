// Structural accessibility checks with axe-core over every primitive (jsdom has no layout, so the
// colour-contrast rule is skipped here: contrast is verified by scripts/contrast.mjs and in Storybook).
import { describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import axe from "axe-core";
import { useState } from "react";
import { afterEach } from "vitest";
import { Badge, Button, Card, Checkbox, ChoiceCard, Chip, EmptyState, Field, IconButton, Input, Radio, Rating, Select, Skeleton, SkeletonGroup, Switch, Textarea, Dialog, Package, Heart } from "@/ui";

afterEach(cleanup);

async function violations(container: HTMLElement) {
  const r = await axe.run(container, { rules: { "color-contrast": { enabled: false } }, resultTypes: ["violations"] });
  return r.violations.filter((v) => v.impact === "critical" || v.impact === "serious").map((v) => `${v.id}: ${v.nodes.map((n) => n.html).join(" | ").slice(0, 160)}`);
}

describe("harness", () => {
  it("negative control: axe does flag an unlabelled input (so the suite can fail)", async () => {
    const { container } = render(<input />);
    expect((await violations(container)).length).toBeGreaterThan(0);
  });
});

describe("primitives have no critical or serious axe violations", () => {
  it("buttons", async () => {
    const { container } = render(<div><Button>Add</Button><Button loading>Add</Button><Button disabled>Add</Button><IconButton icon={Heart} label="Wishlist" pressed /><IconButton icon={Package} label="Orders" badge={3} /></div>);
    expect(await violations(container)).toEqual([]);
  });

  it("fields with label, hint and error", async () => {
    const { container } = render(
      <form>
        <Field label="Name" required>{(p) => <Input {...p} />}</Field>
        <Field label="Phone" hint="98XXXXXXXX">{(p) => <Input {...p} />}</Field>
        <Field label="Email" error="Enter a valid email">{(p) => <Input {...p} />}</Field>
        <Field label="District">{(p) => <Select {...p}><option>A</option></Select>}</Field>
        <Field label="Note">{(p) => <Textarea {...p} />}</Field>
      </form>
    );
    expect(await violations(container)).toEqual([]);
    expect(screen.getByLabelText(/Email/)).toHaveProperty("ariaInvalid", "true");
  });

  it("choices", async () => {
    function C() { const [on, setOn] = useState(false); return (<div><Checkbox label="Save" /><Radio name="r" label="Home" /><ChoiceCard name="p" label="COD" description="Pay the rider" /><Switch checked={on} onCheckedChange={setOn} label="Notify" /></div>); }
    const { container } = render(<C />);
    expect(await violations(container)).toEqual([]);
  });

  it("chips, badges, rating, cards, skeletons, empty state", async () => {
    const { container } = render(
      <div>
        <Chip pressed onClick={() => undefined}>In stock</Chip><Chip onRemove={() => undefined} removeLabel="Remove Books">Books</Chip>
        <Badge tone="success">Delivered</Badge><Badge tone="danger">Cancelled</Badge>
        <Rating value={4.5} count={28} label="4.5 out of 5, 28 reviews" />
        <Card>Card</Card>
        <SkeletonGroup label="Loading"><Skeleton variant="card" /><Skeleton lines={2} /></SkeletonGroup>
        <EmptyState icon={Package} title="No orders yet" action={<Button>Start shopping</Button>} />
      </div>
    );
    expect(await violations(container)).toEqual([]);
  });

  it("dialog has a name, description and a labelled close button", async () => {
    render(<Dialog open onOpenChange={() => undefined} title="Cancel this order?" description="The vendor will be told." closeLabel="Close"><Button>OK</Button></Dialog>);
    const dlg = await screen.findByRole("dialog");
    expect(dlg.getAttribute("aria-labelledby")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Close" })).toBeTruthy();
    expect(await violations(document.body)).toEqual([]);
  });
});
