export type JobScoreInput = {
  stackFit: number;
  remoteLocationEligibility: number;
  seniorityFit: number;
  companyProductQuality: number;
  compensationPotential: number;
  applicationFriction: number;
  hardSkipReasonCodes?: string[];
};

export type JobVerdict = "strong_apply" | "apply" | "maybe" | "skip";

export type JobScore = {
  totalScore: number;
  verdict: JobVerdict;
  componentScores: {
    stackFit: number;
    remoteLocationEligibility: number;
    seniorityFit: number;
    companyProductQuality: number;
    compensationPotential: number;
    applicationFriction: number;
  };
  reasonCodes: string[];
};

const WEIGHTS = {
  stackFit: 30,
  remoteLocationEligibility: 25,
  seniorityFit: 15,
  companyProductQuality: 10,
  compensationPotential: 10,
  applicationFriction: 10
} as const satisfies Record<keyof JobScore["componentScores"], number>;

function clampRatio(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.min(1, Math.max(0, value));
}

function verdictFor(totalScore: number): JobVerdict {
  if (totalScore >= 85) {
    return "strong_apply";
  }

  if (totalScore >= 75) {
    return "apply";
  }

  if (totalScore >= 60) {
    return "maybe";
  }

  return "skip";
}

export function scoreJob(input: JobScoreInput): JobScore {
  const hardSkipReasonCodes = input.hardSkipReasonCodes ?? [];

  const componentScores = {
    stackFit: Math.round(clampRatio(input.stackFit) * WEIGHTS.stackFit),
    remoteLocationEligibility: Math.round(clampRatio(input.remoteLocationEligibility) * WEIGHTS.remoteLocationEligibility),
    seniorityFit: Math.round(clampRatio(input.seniorityFit) * WEIGHTS.seniorityFit),
    companyProductQuality: Math.round(clampRatio(input.companyProductQuality) * WEIGHTS.companyProductQuality),
    compensationPotential: Math.round(clampRatio(input.compensationPotential) * WEIGHTS.compensationPotential),
    applicationFriction: Math.round(clampRatio(input.applicationFriction) * WEIGHTS.applicationFriction)
  };

  const totalScore = Object.values(componentScores).reduce((sum, value) => sum + value, 0);

  if (hardSkipReasonCodes.length > 0) {
    return {
      totalScore: 0,
      verdict: "skip",
      componentScores,
      reasonCodes: hardSkipReasonCodes
    };
  }

  return {
    totalScore,
    verdict: verdictFor(totalScore),
    componentScores,
    reasonCodes: []
  };
}
