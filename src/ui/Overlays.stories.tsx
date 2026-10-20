import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { Button } from "./Button";
import { IconButton } from "./IconButton";
import { Dialog, Popover, Sheet, Tooltip } from "./Overlays";
import { ToastHost, toast } from "./toast";
import { Heart, Info } from "./icons";

const meta = { title: "Overlays" } satisfies Meta;
export default meta;
type S = StoryObj;

export const DialogStory: S = {
  name: "Dialog",
  render: function Render() {
    const [open, setOpen] = useState(false);
    return (
      <>
        <Button variant="secondary" onClick={() => setOpen(true)}>Open dialog</Button>
        <Dialog open={open} onOpenChange={setOpen} title="Cancel this order?" description="The vendor will be told." closeLabel="Close">
          <div className="flex gap-2"><Button variant="danger" onClick={() => setOpen(false)}>Cancel order</Button><Button variant="secondary" onClick={() => setOpen(false)}>Keep order</Button></div>
        </Dialog>
      </>
    );
  },
};

export const SheetStory: S = {
  name: "Bottom sheet",
  render: function Render() {
    const [open, setOpen] = useState(false);
    return (
      <>
        <Button variant="secondary" onClick={() => setOpen(true)}>Open sheet</Button>
        <Sheet open={open} onOpenChange={setOpen} title="Filters"><p className="m-0">Price, availability, category.</p><Button className="mt-4" onClick={() => setOpen(false)}>Apply</Button></Sheet>
      </>
    );
  },
};

export const Toasts: S = {
  render: () => (
    <>
      <ToastHost closeLabel="Close" />
      <div className="flex flex-wrap gap-2">
        <Button variant="secondary" onClick={() => toast.success("Added to cart", { action: { label: "Undo", onClick: () => toast.info("Undone") } })}>Toast with undo</Button>
        <Button variant="secondary" onClick={() => toast.error("Out of stock")}>Error toast</Button>
        <Button variant="secondary" onClick={() => toast.info("कार्टमा थपियो")}>Nepali toast</Button>
      </div>
    </>
  ),
};

export const PopoverAndTooltip: S = {
  render: () => (
    <div className="flex gap-3">
      <Popover trigger={<IconButton icon={Info} label="Delivery info" variant="secondary" />}><p className="m-0 max-w-64">Free delivery over Rs. 5,000 in Kathmandu Valley.</p></Popover>
      <Tooltip label="Wishlist"><IconButton icon={Heart} label="Wishlist" variant="secondary" /></Tooltip>
    </div>
  ),
};
