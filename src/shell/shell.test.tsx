import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import axe from "axe-core";
import { I18nProvider } from "@/lib/i18n";
import { CartProvider } from "@/lib/cart";
import { MockAuthProvider } from "@/lib/auth";
import { ThemeProvider } from "@/theme/ThemeProvider";

// Public settings and categories are mocked so the shell renders without a network.
vi.mock("@/lib/queries", () => ({
  useStoreSettings: () => ({ data: { store_name: "Test Store", brand: {}, ui_v2: true, contact_phone: "9800000000", whatsapp_number: "9779800000000", contact_email: "hi@test.example", policies: { returns_en: "7 day returns" } } }),
  useCategories: () => ({ data: [{ id: "1", slug: "books", name_en: "Books", name_ne: "पुस्तकहरू" }] }),
}));

import { Header } from "./Header";
import { BottomNav } from "./BottomNav";
import { Footer } from "./Footer";
import { AppearancePanel } from "./AppearancePanel";
import { NotFound } from "./NotFound";
import { useShortcuts } from "./useShortcuts";

const wrap = (ui: React.ReactNode, path = "/") => (
  <QueryClientProvider client={new QueryClient()}>
    <ThemeProvider>
      <I18nProvider>
        <MockAuthProvider perms={[]}>
          <CartProvider>
            <MemoryRouter initialEntries={[path]}>{ui}</MemoryRouter>
          </CartProvider>
        </MockAuthProvider>
      </I18nProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

async function serious(container: HTMLElement) {
  const r = await axe.run(container, { rules: { "color-contrast": { enabled: false } }, resultTypes: ["violations"] });
  return r.violations.filter((v) => v.impact === "critical" || v.impact === "serious").map((v) => `${v.id}: ${v.nodes[0]?.html.slice(0, 140)}`);
}

beforeEach(() => { localStorage.clear(); });
afterEach(cleanup);

describe("shell accessibility (axe, structure only)", () => {
  it("header", async () => {
    const { container } = render(wrap(<Header />));
    expect(await serious(container)).toEqual([]);
    expect(screen.getByRole("banner")).toBeTruthy();
    expect(screen.getByRole("link", { name: /^Cart/ })).toBeTruthy();
  });

  it("bottom navigation has five labelled links", async () => {
    const { container } = render(wrap(<BottomNav />));
    expect(await serious(container)).toEqual([]);
    expect(screen.getByRole("navigation", { name: "Primary" }).querySelectorAll("a")).toHaveLength(5);
  });

  it("footer, appearance panel and 404", async () => {
    const { container } = render(wrap(<><Footer /><AppearancePanel /><NotFound /></>));
    expect(await serious(container)).toEqual([]);
    expect(screen.getByRole("contentinfo")).toBeTruthy();
    expect(container.querySelectorAll("fieldset")).toHaveLength(3); // theme, effects, language
  });
});

describe("bottom navigation visibility", () => {
  it("is hidden during checkout (SH-2)", () => {
    const { container } = render(wrap(<BottomNav />, "/checkout"));
    expect(container.querySelector("nav")).toBeNull();
  });

  it("is hidden while a text field has focus (keyboard open) and returns after", () => {
    render(wrap(<><BottomNav /><input aria-label="q" /></>));
    expect(screen.queryByRole("navigation", { name: "Primary" })).not.toBeNull();
    fireEvent.focusIn(screen.getByLabelText("q"));
    expect(screen.queryByRole("navigation", { name: "Primary" })).toBeNull();
    fireEvent.focusOut(screen.getByLabelText("q"));
    expect(screen.queryByRole("navigation", { name: "Primary" })).not.toBeNull();
  });
});

describe("keyboard shortcuts", () => {
  function Probe({ onHelp }: { onHelp: () => void }) {
    useShortcuts(onHelp);
    return <p data-testid="path">{useLocation().pathname}</p>;
  }
  const mount = (onHelp = vi.fn()) => render(wrap(<Routes><Route path="*" element={<Probe onHelp={onHelp} />} /></Routes>));

  it("g then c goes to the cart; g then h goes home", async () => {
    mount();
    fireEvent.keyDown(window, { key: "g" }); fireEvent.keyDown(window, { key: "c" });
    await waitFor(() => expect(screen.getByTestId("path").textContent).toBe("/cart"));
    fireEvent.keyDown(window, { key: "g" }); fireEvent.keyDown(window, { key: "h" });
    await waitFor(() => expect(screen.getByTestId("path").textContent).toBe("/"));
  });

  it("? opens help", () => {
    const onHelp = vi.fn();
    mount(onHelp);
    fireEvent.keyDown(window, { key: "?" });
    expect(onHelp).toHaveBeenCalledOnce();
  });

  it("ignores keys while typing and when a modifier is held", () => {
    const onHelp = vi.fn();
    render(wrap(<><input aria-label="x" /><Routes><Route path="*" element={<Probe onHelp={onHelp} />} /></Routes></>));
    fireEvent.keyDown(screen.getByLabelText("x"), { key: "?" });
    fireEvent.keyDown(window, { key: "?", ctrlKey: true });
    expect(onHelp).not.toHaveBeenCalled();
  });
});

