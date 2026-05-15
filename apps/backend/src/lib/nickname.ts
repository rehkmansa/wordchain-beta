const ADJECTIVES = [
  "swift",
  "brave",
  "lucky",
  "mighty",
  "silent",
  "clever",
  "noble",
  "bold",
  "sleepy",
  "fuzzy",
  "snappy",
  "witty",
  "sunny",
  "stormy",
  "fierce",
  "gentle",
  "curious",
  "frosty",
  "merry",
  "wild",
  "calm",
  "dapper",
  "sneaky",
  "rusty",
];

const ANIMALS = [
  "otter",
  "panda",
  "fox",
  "wolf",
  "tiger",
  "owl",
  "hawk",
  "lynx",
  "badger",
  "moose",
  "raven",
  "seal",
  "stoat",
  "whale",
  "shark",
  "koala",
  "beaver",
  "heron",
  "gecko",
  "puma",
  "yak",
  "ibis",
  "lemur",
  "stag",
];

function pick<T>(arr: readonly T[]): T {
  const v = arr[Math.floor(Math.random() * arr.length)];
  if (v === undefined) throw new Error("pick: array must be non-empty");
  return v;
}

export function generateNickname(): string {
  const n = Math.floor(Math.random() * 900 + 100);
  return `${pick(ADJECTIVES)}-${pick(ANIMALS)}-${n}`;
}
