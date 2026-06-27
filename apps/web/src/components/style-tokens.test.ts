import { describe, expect, it } from "vitest";
import {
  buttonClasses,
  chipClasses,
  dialogClasses,
  fieldClasses,
  iconButtonClasses,
  labelClasses,
} from "./style-tokens";

const tokens = (value: string) => value.split(/\s+/);

describe("style tokens", () => {
  it("exports touch-friendly button classes", () => {
    expect(tokens(buttonClasses.primary)).toEqual(
      expect.arrayContaining(["min-h-12", "px-4", "py-3", "bg-[#FCD535]", "text-zinc-950"]),
    );
    expect(tokens(buttonClasses.primary)).not.toEqual(expect.arrayContaining(["px-3", "py-2", "h-10"]));
    expect(tokens(buttonClasses.secondary)).toEqual(
      expect.arrayContaining(["min-h-11", "px-4", "py-3", "border-zinc-700", "bg-zinc-900"]),
    );
    expect(tokens(buttonClasses.secondary)).not.toEqual(expect.arrayContaining(["px-3", "py-2", "h-10"]));
    expect(tokens(buttonClasses.ghost)).toEqual(
      expect.arrayContaining(["min-h-11", "px-4", "py-3", "text-zinc-100"]),
    );
    expect(tokens(buttonClasses.ghost)).not.toEqual(expect.arrayContaining(["px-3", "py-2", "h-10"]));
    expect(tokens(buttonClasses.danger)).toEqual(
      expect.arrayContaining(["min-h-11", "px-4", "py-3", "bg-red-600", "text-white"]),
    );
    expect(tokens(buttonClasses.danger)).not.toEqual(expect.arrayContaining(["px-3", "py-2", "h-10"]));
  });

  it("exports touch-friendly field classes", () => {
    expect(tokens(fieldClasses.input)).toEqual(expect.arrayContaining(["min-h-11", "px-3", "py-2.5"]));
    expect(tokens(fieldClasses.select)).toEqual(expect.arrayContaining(["min-h-11", "px-3", "py-2.5"]));
    expect(tokens(fieldClasses.textarea)).toEqual(expect.arrayContaining(["min-h-24", "px-3", "py-2.5"]));
  });

  it("exports compact label classes", () => {
    expect(labelClasses).toContain("text-sm");
    expect(labelClasses).toContain("leading-5");
  });

  it("exports readable chip classes", () => {
    expect(tokens(chipClasses)).toEqual(expect.arrayContaining(["min-h-11", "px-3", "py-1.5", "text-sm"]));
  });

  it("exports readable icon button classes", () => {
    expect(tokens(iconButtonClasses)).toEqual(expect.arrayContaining(["min-h-11", "min-w-11", "p-2.5"]));
  });

  it("exports dialog classes", () => {
    expect(tokens(dialogClasses.overlay)).toEqual(expect.arrayContaining(["fixed", "inset-0", "bg-black/60"]));
    expect(tokens(dialogClasses.panel)).toEqual(
      expect.arrayContaining(["max-h-[90vh]", "max-w-xl", "overflow-y-auto", "p-7", "rounded-lg"]),
    );
    expect(tokens(dialogClasses.title)).toEqual(expect.arrayContaining(["text-xl", "font-semibold", "text-zinc-100"]));
    expect(tokens(dialogClasses.description)).toEqual(
      expect.arrayContaining(["mt-3", "text-base", "leading-7", "text-zinc-400"]),
    );
  });
});
