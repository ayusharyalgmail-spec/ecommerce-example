import type { Meta, StoryObj } from "@storybook/react-vite";
import { Badge } from "./Badge";
import { Card } from "./Card";
import { Chip } from "./Chip";
import { EmptyState } from "./EmptyState";
import { GlassPanel } from "./GlassPanel";
import { Rating } from "./Rating";
import { Skeleton, SkeletonGroup } from "./Skeleton";
import { Button } from "./Button";
import { Package } from "./icons";

const meta = { title: "Primitives/Display" } satisfies Meta;
export default meta;
type S = StoryObj;

export const Chips: S = {
  render: () => (
    <div className="flex flex-wrap gap-2">
      <Chip pressed>In stock</Chip><Chip>On sale</Chip><Chip onRemove={() => undefined} removeLabel="Remove Books">Books</Chip>
    </div>
  ),
};

export const Badges: S = {
  render: () => (
    <div className="flex flex-wrap gap-2">
      <Badge>Neutral</Badge><Badge tone="success">Delivered</Badge><Badge tone="warning">Low stock</Badge><Badge tone="danger">Cancelled</Badge><Badge tone="info">New</Badge>
      <Badge tone="success">पुग्यो</Badge><Badge tone="warning">कम स्टक</Badge>
    </div>
  ),
};

export const Ratings: S = {
  render: () => (
    <div className="flex flex-wrap gap-4">
      <Rating value={4.5} count={28} label="4.5 out of 5, 28 reviews" /><Rating value={3} label="3 out of 5" /><Rating value={0.5} label="0.5 out of 5" /><Rating value={0} label="No ratings yet" />
    </div>
  ),
};

export const Cards: S = {
  render: () => (
    <div className="grid gap-3 sm:grid-cols-2"><Card>Flat card</Card><Card interactive>Interactive card (hover on desktop)</Card></div>
  ),
};

export const Loading: S = {
  render: () => (
    <SkeletonGroup label="Loading products" className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <Skeleton variant="card" /><Skeleton variant="card" /><Skeleton variant="card" /><Skeleton variant="card" />
    </SkeletonGroup>
  ),
};

export const TextSkeleton: S = { render: () => <Skeleton lines={3} /> };

export const Empty: S = {
  render: () => <Card><EmptyState icon={Package} title="No orders yet" description="When you place an order it will show up here." action={<Button>Start shopping</Button>} /></Card>,
};

export const EmptyNepali: S = {
  render: () => <Card lang="ne"><EmptyState icon={Package} title="अहिलेसम्म कुनै अर्डर छैन" description="तपाईंले अर्डर गरेपछि यहाँ देखिनेछ।" action={<Button>किनमेल सुरु गर्नुहोस्</Button>} /></Card>,
};

export const Glass: S = {
  parameters: { docs: { description: { component: "Glass only floats above content. Ink text only; muted text fails contrast on glass." } } },
  render: () => (
    <div className="relative h-48 overflow-hidden rounded-xl" style={{ background: "linear-gradient(135deg,#F5A524,#D1244F 55%,#15173A)" }}>
      <GlassPanel shape="dialog" className="absolute inset-x-4 top-4 p-4"><p className="m-0 font-semibold">Text on glass uses ink only</p></GlassPanel>
      <GlassPanel shape="chip" className="absolute bottom-4 left-4">-25%</GlassPanel>
    </div>
  ),
};
