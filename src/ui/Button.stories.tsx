import type { Meta, StoryObj } from "@storybook/react-vite";
import { Button } from "./Button";
import { IconButton } from "./IconButton";
import { ShoppingCart, Heart, Plus, Trash2 } from "./icons";

const meta = { title: "Primitives/Button", component: Button, args: { children: "Add to cart" } } satisfies Meta<typeof Button>;
export default meta;
type S = StoryObj<typeof meta>;

export const Primary: S = {};
export const Secondary: S = { args: { variant: "secondary" } };
export const Ghost: S = { args: { variant: "ghost" } };
export const Danger: S = { args: { variant: "danger", children: "Cancel order" } };
export const WithIcon: S = { args: { leadingIcon: ShoppingCart } };
export const Loading: S = { args: { loading: true }, parameters: { docs: { description: { story: "Keeps its width while loading." } } } };
export const Disabled: S = { args: { disabled: true } };
export const Large: S = { args: { size: "lg" } };
export const Block: S = { args: { block: true } };
export const Nepali: S = { args: { children: "कार्टमा राख्नुहोस्", lang: "ne" } };
export const LongNepali: S = { args: { children: "अनुमति नपाएसम्म प्रतीक्षा गर्नुहोस्", lang: "ne", block: true } };

export const IconButtons: StoryObj = {
  render: () => (
    <div className="flex items-center gap-2">
      <IconButton icon={ShoppingCart} label="Cart" badge={3} />
      <IconButton icon={Heart} label="Wishlist" pressed variant="secondary" />
      <IconButton icon={Plus} label="Add" variant="primary" />
      <IconButton icon={Trash2} label="Remove" disabled />
    </div>
  ),
};
