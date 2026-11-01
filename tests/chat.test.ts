import { describe, expect, it } from "vitest";
import { chatInput } from "@/server/services/chat";
import { findPlace, findTrade, readIntent } from "@/server/services/chat/intent";

const TOWNS = ["Windsor", "Windsor-Essex", "Tecumseh", "Belle River", "LaSalle"];

describe("chat: understanding the request", () => {
  it.each([
    ["My kitchen tap is leaking", "plumbing"],
    ["the furnace stopped working", "hvac"],
    ["need someone to fix my garage door", "garage-doors"],
    ["new carpet in the living room", "flooring-tile"],
    ["carpenter for a new deck", "carpentry"],
    ["mice in the attic", "pest-control"],
    ["outlet sparks when I plug things in", "electrical"],
    ["can you help?", null],
  ])("%s → %s", (text, slug) => expect(findTrade(text)).toBe(slug));

  it("finds postal codes and listed towns", () => {
    expect(findPlace("roof repair near n9a6s1", TOWNS)).toBe("N9A6S1");
    expect(findPlace("in 48226 please", TOWNS)).toBe("48226");
    expect(findPlace("we live in belle river", TOWNS)).toBe("Belle River");
    expect(findPlace("Windsor-Essex area", TOWNS)).toBe("Windsor-Essex");
    expect(findPlace("somewhere", TOWNS)).toBeNull();
  });

  it("builds the intent over the conversation, latest mention winning", () => {
    expect(readIntent(["my toilet is clogged", "Tecumseh"], TOWNS)).toEqual({ category: "plumbing", location: "Tecumseh" });
    expect(readIntent(["electrician in Windsor", "actually I need a plumber"], TOWNS)).toEqual({ category: "plumbing", location: "Windsor" });
  });

  it("accepts only short, visitor-last conversations", () => {
    expect(chatInput.safeParse({ messages: [{ role: "user", content: "hi" }] }).success).toBe(true);
    expect(chatInput.safeParse({ messages: [{ role: "assistant", content: "hi" }] }).success).toBe(false);
    expect(chatInput.safeParse({ messages: [{ role: "user", content: "x".repeat(801) }] }).success).toBe(false);
    expect(chatInput.safeParse({ messages: Array.from({ length: 21 }, () => ({ role: "user", content: "a" })) }).success).toBe(false);
  });
});
