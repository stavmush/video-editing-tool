import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import RenameField from "./RenameField";

describe("RenameField", () => {
  it("displays the custom name when provided", () => {
    render(<RenameField value="My Movie" fallback="IMG_1979.MP4" onSave={vi.fn()} />);
    expect(screen.getByText("My Movie")).toBeTruthy();
  });

  it("falls back to video filename when name is null", () => {
    render(<RenameField value={null} fallback="IMG_1979.MP4" onSave={vi.fn()} />);
    expect(screen.getByText("IMG_1979.MP4")).toBeTruthy();
  });

  it("falls back to 'Untitled' when both are null", () => {
    render(<RenameField value={null} fallback={null} onSave={vi.fn()} />);
    expect(screen.getByText("Untitled")).toBeTruthy();
  });

  it("clicking the span shows an input pre-filled with the current name", () => {
    render(<RenameField value="My Movie" fallback="IMG_1979.MP4" onSave={vi.fn()} />);
    fireEvent.click(screen.getByText("My Movie"));
    const input = screen.getByRole("textbox");
    expect((input as HTMLInputElement).value).toBe("My Movie");
  });

  it("clicking when value is null prefills input with empty string, placeholder is fallback", () => {
    render(<RenameField value={null} fallback="IMG_1979.MP4" onSave={vi.fn()} />);
    fireEvent.click(screen.getByText("IMG_1979.MP4"));
    const input = screen.getByRole("textbox") as HTMLInputElement;
    expect(input.value).toBe("");
    expect(input.placeholder).toBe("IMG_1979.MP4");
  });

  it("pressing Enter calls onSave with the trimmed value", () => {
    const onSave = vi.fn();
    render(<RenameField value="My Movie" fallback="IMG_1979.MP4" onSave={onSave} />);
    fireEvent.click(screen.getByText("My Movie"));
    const input = screen.getByRole("textbox");
    fireEvent.change(input, { target: { value: "  New Name  " } });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(onSave).toHaveBeenCalledWith("New Name");
  });

  it("pressing Escape reverts without calling onSave", () => {
    const onSave = vi.fn();
    render(<RenameField value="My Movie" fallback="IMG_1979.MP4" onSave={onSave} />);
    fireEvent.click(screen.getByText("My Movie"));
    const input = screen.getByRole("textbox");
    fireEvent.change(input, { target: { value: "Something else" } });
    fireEvent.keyDown(input, { key: "Escape" });
    expect(onSave).not.toHaveBeenCalled();
    expect(screen.getByText("My Movie")).toBeTruthy();
  });

  it("blurring the input calls onSave", () => {
    const onSave = vi.fn();
    render(<RenameField value="My Movie" fallback="IMG_1979.MP4" onSave={onSave} />);
    fireEvent.click(screen.getByText("My Movie"));
    const input = screen.getByRole("textbox");
    fireEvent.change(input, { target: { value: "Blurred Name" } });
    fireEvent.blur(input);
    expect(onSave).toHaveBeenCalledWith("Blurred Name");
  });

  it("does not open edit input when disabled", () => {
    render(<RenameField value="My Movie" fallback="IMG_1979.MP4" onSave={vi.fn()} disabled />);
    fireEvent.click(screen.getByText("My Movie"));
    expect(screen.queryByRole("textbox")).toBeNull();
  });
});
