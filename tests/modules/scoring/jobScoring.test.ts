import { describe, expect, it } from "vitest";

import { scoreJob } from "../../../src/modules/scoring/jobScoring.js";

describe("scoreJob", () => {
  it("applies the configured component weights", () => {
    expect(
      scoreJob({
        stackFit: 1,
        remoteLocationEligibility: 1,
        seniorityFit: 1,
        companyProductQuality: 0.5,
        compensationPotential: 0.5,
        applicationFriction: 1
      })
    ).toMatchObject({
      totalScore: 90,
      verdict: "strong_apply",
      componentScores: {
        stackFit: 30,
        remoteLocationEligibility: 25,
        seniorityFit: 15,
        companyProductQuality: 5,
        compensationPotential: 5,
        applicationFriction: 10
      }
    });
  });

  it("hard-skips before score verdicts", () => {
    expect(
      scoreJob({
        stackFit: 1,
        remoteLocationEligibility: 1,
        seniorityFit: 1,
        companyProductQuality: 1,
        compensationPotential: 1,
        applicationFriction: 1,
        hardSkipReasonCodes: ["us_only"]
      })
    ).toMatchObject({
      totalScore: 0,
      verdict: "skip",
      reasonCodes: ["us_only"]
    });
  });
});
