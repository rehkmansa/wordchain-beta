export type FreqTier = "common" | "normal" | "rare";

export type Candidate = {
  a: string;
  b: string;
  category: string;
  example_usage: string;
};

export type FreqResult = {
  datamuse: boolean;
  wikipediaExact: boolean;
  wikipediaPartial: boolean;
  freq: number | null;
  score: number;
  tier: FreqTier | null;
};
