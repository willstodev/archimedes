import { describe, expect, it } from "vitest";

import { canonicalizeUrl } from "../../src/shared/normalization/url.js";

describe("canonicalizeUrl", () => {
  it("removes fragments and tracking parameters", () => {
    expect(
      canonicalizeUrl(" https://Example.com/jobs/123/?utm_source=x&ref=feed&gh_jid=123#apply ")
    ).toBe("https://example.com/jobs/123?gh_jid=123");
  });

  it("preserves identity parameters and sorts them", () => {
    expect(canonicalizeUrl("https://boards.greenhouse.io/acme/jobs/7?b=2&a=1")).toBe(
      "https://boards.greenhouse.io/acme/jobs/7?a=1&b=2"
    );
  });

  it("canonicalizes known Ashby job path variants", () => {
    expect(canonicalizeUrl("https://jobs.ashbyhq.com/Acme/job/abc-123/")).toBe(
      "https://jobs.ashbyhq.com/Acme/abc-123"
    );
  });
});
