import { describe, expect, it } from "vitest";

import { normalizeTextIdentity } from "../../src/shared/normalization/text.js";

describe("normalizeTextIdentity", () => {
  it("creates stable lowercase ASCII identity text", () => {
    expect(normalizeTextIdentity("  São Paulo - Backend Engineer!! ")).toBe("sao paulo backend engineer");
  });
});
