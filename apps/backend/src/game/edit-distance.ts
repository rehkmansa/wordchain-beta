// Standard Levenshtein. Early-bail when guaranteed > threshold.
export function levenshtein(a: string, b: string, threshold: number): number {
  if (a === b) return 0;
  if (Math.abs(a.length - b.length) > threshold) return threshold + 1;

  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;

  let prev = new Array<number>(n + 1);
  let curr = new Array<number>(n + 1);
  for (let j = 0; j <= n; j++) prev[j] = j;

  for (let i = 1; i <= m; i++) {
    curr[0] = i;
    let rowMin = i;
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      const ins = (curr[j - 1] ?? 0) + 1;
      const del = (prev[j] ?? 0) + 1;
      const sub = (prev[j - 1] ?? 0) + cost;
      const v = Math.min(ins, del, sub);
      curr[j] = v;
      if (v < rowMin) rowMin = v;
    }
    if (rowMin > threshold) return threshold + 1;
    [prev, curr] = [curr, prev];
  }
  return prev[n] ?? threshold + 1;
}
