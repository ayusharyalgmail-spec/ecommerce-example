import { BookOpen, Cable, CookingPot, Cookie, CupSoda, Droplets, Footprints, Lamp, PenLine, Shirt, SprayCan, Store, Wheat, type LucideIcon } from "@/ui";

// Category tiles and image-less products use a line icon picked from the category slug or name.
// Order matters: the first matching keyword wins, so the more specific words come first.
const RULES: [RegExp, LucideIcon][] = [
  [/shoe|footwear|sneaker|boot|sandal/, Footprints],
  [/cloth|apparel|shirt|wear|fashion|pant|jacket|hoodie/, Shirt],
  [/kitchen|cook|utensil/, CookingPot],
  [/home|lifestyle|decor|light/, Lamp],
  [/household|clean|laundry/, SprayCan],
  [/personal|care|beauty|health|hygiene/, Droplets],
  [/stationer|office|school|pen/, PenLine],
  [/book/, BookOpen],
  [/electronic|accessor|gadget|phone|mobile|audio|headphone/, Cable],
  [/beverage|drink|juice|tea|coffee/, CupSoda],
  [/snack|biscuit|sweet|chocolate/, Cookie],
  [/grocer|food|staple|rice|vegetable|fruit/, Wheat],
  [/general|store|daily|essential/, Store],
];

export function categoryIcon(slugOrName?: string | null): LucideIcon {
  const key = (slugOrName ?? "").toLowerCase();
  return RULES.find(([re]) => re.test(key))?.[1] ?? Store;
}
