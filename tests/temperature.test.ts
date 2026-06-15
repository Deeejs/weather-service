import { describe, expect, it } from "vitest";

import { characterize } from "../src/temperature";

// The classification rule is the one piece of real business logic, so it gets
// exhaustive boundary coverage: the cutoffs are < 50 and > 80.
describe("characterize", () => {
  it("is cold below 50", () => {
    expect(characterize(49)).toBe("cold");
    expect(characterize(-10)).toBe("cold");
  });

  it("is moderate at the cold boundary (50) through the hot boundary (80)", () => {
    expect(characterize(50)).toBe("moderate");
    expect(characterize(65)).toBe("moderate");
    expect(characterize(80)).toBe("moderate");
  });

  it("is hot above 80", () => {
    expect(characterize(81)).toBe("hot");
    expect(characterize(120)).toBe("hot");
  });
});
