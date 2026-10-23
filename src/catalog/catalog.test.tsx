import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { BookOpen, CookingPot, QtyStepper, SprayCan, Store, Wheat } from "@/ui";
import { categoryIcon } from "./categoryIcon";
import * as demo from "./demo";
import { DEMO_ROWS } from "./demo/fixture";
import { DEMO_IMAGES } from "./demo/images";
import type { ShopFilters } from "./data";

const F: ShopFilters = { q: "", category: "", sort: "newest", min: null, max: null, stock: false, sale: false };

describe("demo catalogue fixture", () => {
  it("has a realistic size, unique slugs and genuine discounts only", () => {
    expect(demo.products.length).toBeGreaterThanOrEqual(40);
    expect(new Set(demo.products.map((p) => p.slug)).size).toBe(demo.products.length);
    for (const p of demo.products) {
      if (p.discount_price_paisa != null) expect(p.discount_price_paisa).toBeLessThan(p.price_paisa);
      expect(p.slug.startsWith("demo-")).toBe(true);
    }
    // every category is used, so every tile leads somewhere
    expect(Object.keys(DEMO_ROWS).sort()).toEqual(demo.categories.map((c) => c.slug).sort());
  });

  it("gives every product a freely licensed photo with an author for attribution", () => {
    for (const p of demo.products) {
      const img = DEMO_IMAGES[p.slug.replace(/^demo-/, "")];
      expect(img, p.slug).toBeTruthy();
      expect(img.license).toMatch(/^(CC0|CC BY|CC-BY|Public domain)/i);
      expect(img.author.length).toBeGreaterThan(0);
    }
  });

  it("uses valid UUIDs, so ids can never be mistaken for a real row format error", () => {
    for (const p of demo.products) expect(p.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-8[0-9a-f]{3}-[0-9a-f]{12}$/);
  });

  it("filters like the server: search by name or category word, price on list price, stock and sale", () => {
    expect(demo.shopPage({ ...F, q: "rice" }, null, 1, 100).products.map((p) => p.name_en)).toEqual(
      expect.arrayContaining(["Basmati Rice, 5 kg", "Beaten Rice (Chiura), 1 kg"]));
    const snacks = demo.categories.find((c) => c.slug === "snacks")!;
    // a category word finds every product in that category (and, like the server, description matches too)
    const bySearch = demo.shopPage({ ...F, q: "snacks" }, null, 1, 100).products.map((p) => p.id);
    expect(bySearch).toEqual(expect.arrayContaining(demo.shopPage(F, snacks.id, 1, 100).products.map((p) => p.id)));
    const cheap = demo.shopPage({ ...F, max: 100 }, null, 1, 100).products;
    expect(cheap.every((p) => p.price_paisa <= 10000)).toBe(true);
    expect(demo.shopPage({ ...F, stock: true }, null, 1, 100).products.every((p) => p.stock_quantity - p.reserved_quantity > 0)).toBe(true);
    expect(demo.shopPage({ ...F, sale: true }, null, 1, 100).products.every((p) => p.discount_price_paisa != null)).toBe(true);
  });

  it("sorts by price and by name, and pages consistently with the count", () => {
    const asc = demo.shopPage({ ...F, sort: "price_asc" }, null, 1, 100).products.map((p) => p.price_paisa);
    expect(asc).toEqual([...asc].sort((a, b) => a - b));
    const names = demo.shopPage({ ...F, sort: "name" }, null, 1, 100).products.map((p) => p.name_en);
    expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b)));
    const all = demo.shopPage(F, null, 1, 12);
    expect(all.products).toHaveLength(12);
    expect(demo.shopPage(F, null, Math.ceil(all.count / 12), 12).products.length).toBeGreaterThan(0);
  });

  it("answers the product page and cart with the same shapes as Supabase", () => {
    const pdp = demo.productPage("demo-basmati-rice-5kg")!;
    expect(pdp.p.name_en).toBe("Basmati Rice, 5 kg");
    expect(pdp.related.every((r) => r.id !== pdp.p.id)).toBe(true);
    expect(demo.productPage("nope")).toBeNull();
    const [line] = demo.cartLines([pdp.p.id, "unknown"]);
    expect(line).toMatchObject({ id: pdp.p.id, available: pdp.p.stock_quantity });
    expect(line.image).toMatch(/^https:\/\/(thumb|upload)\.wikimedia\.org\//);
    expect(pdp.credit).toMatchObject({ license: expect.stringMatching(/^(CC|Public domain)/i) });
  });
});

describe("categoryIcon", () => {
  it("maps category slugs and names to a line icon, with a neutral fallback", () => {
    expect(categoryIcon("groceries")).toBe(Wheat);
    expect(categoryIcon("Household essentials")).toBe(SprayCan);
    expect(categoryIcon("kitchen")).toBe(CookingPot);
    expect(categoryIcon("books")).toBe(BookOpen);
    expect(categoryIcon("garden-tools")).toBe(Store);
    expect(categoryIcon(null)).toBe(Store);
  });
});

describe("QtyStepper", () => {
  const labels = { group: "Quantity", less: "Decrease", more: "Increase", remove: "Remove" };
  it("never goes below one or above the stock limit", () => {
    const onChange = vi.fn();
    const { rerender } = render(<QtyStepper value={1} max={3} onChange={onChange} labels={labels} />);
    expect(screen.getByRole("button", { name: "Decrease" })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Increase" }));
    expect(onChange).toHaveBeenLastCalledWith(2);
    rerender(<QtyStepper value={3} max={3} onChange={onChange} labels={labels} />);
    expect(screen.getByRole("button", { name: "Increase" })).toBeDisabled();
  });
  it("turns the minus into Remove at one when min is 0 (product cards)", () => {
    const onChange = vi.fn();
    render(<QtyStepper value={1} max={5} min={0} onChange={onChange} labels={labels} />);
    fireEvent.click(screen.getByRole("button", { name: "Remove" }));
    expect(onChange).toHaveBeenLastCalledWith(0);
  });
});
