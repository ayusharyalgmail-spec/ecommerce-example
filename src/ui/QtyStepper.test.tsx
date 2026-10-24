import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { QtyStepper } from "./QtyStepper";

const labels = { group: "Quantity", less: "Less", more: "More", remove: "Remove" };
afterEach(cleanup);

describe("QtyStepper floor (minimum order)", () => {
  it("cannot go below the floor", () => {
    const onChange = vi.fn();
    render(<QtyStepper value={6} floor={6} max={20} onChange={onChange} labels={labels} />);
    expect(screen.getByRole("button", { name: "Less" })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "More" }));
    expect(onChange).toHaveBeenCalledWith(7);
  });

  it("steps down to the floor, not below it", () => {
    const onChange = vi.fn();
    render(<QtyStepper value={7} floor={6} max={20} onChange={onChange} labels={labels} />);
    fireEvent.click(screen.getByRole("button", { name: "Less" }));
    expect(onChange).toHaveBeenCalledWith(6);
  });

  it("with min 0, the minus at the floor removes the line instead of going to floor - 1", () => {
    const onChange = vi.fn();
    render(<QtyStepper value={6} min={0} floor={6} max={20} onChange={onChange} labels={labels} />);
    fireEvent.click(screen.getByRole("button", { name: "Remove" }));
    expect(onChange).toHaveBeenCalledWith(0);
  });

  it("keeps the old behaviour without a floor", () => {
    const onChange = vi.fn();
    render(<QtyStepper value={1} min={0} max={5} onChange={onChange} labels={labels} />);
    fireEvent.click(screen.getByRole("button", { name: "Remove" }));
    expect(onChange).toHaveBeenCalledWith(0);
  });
});
