import type { SourceId } from "./sources";

/**
 * Story text is plain strings and translations. A translation turns a model result into people
 * and names the source it rests on, so the interface can set it apart from the model's output.
 */
export type Translation = { text: string; source: SourceId };
export type Segment = string | Translation;
export type Paragraph = Segment[];

export const tr = (text: string, source: SourceId): Translation => ({ text, source });

export function plainText(p: Paragraph): string {
  return p.map((s) => (typeof s === "string" ? s : s.text)).join("");
}

export function sourcesIn(paragraphs: Paragraph[]): SourceId[] {
  const ids = paragraphs.flat().flatMap((s) => (typeof s === "string" ? [] : [s.source]));
  return [...new Set(ids)];
}

/** A count of people, rounded the way a newspaper would: 2.3 million, 620,000, 17,000. */
export function people(n: number): string {
  if (n >= 1e6) return `${(Math.round(n / 1e5) / 10).toLocaleString("en-US")} million`;
  return roundCount(n).toLocaleString("en-US");
}

function roundCount(n: number): number {
  const unit = n >= 1e5 ? 1e4 : n >= 1e4 ? 1e3 : 1e2;
  return Math.round(n / unit) * unit;
}

/** "90,000 to 130,000", or one number when the ends round to the same value. */
export function countRange([lo, hi]: readonly [number, number]): string {
  const unit = Math.max(lo, hi) >= 1e5 ? 1e4 : Math.max(lo, hi) >= 1e4 ? 1e3 : 1e2;
  const a = Math.round(lo / unit) * unit;
  const b = Math.round(hi / unit) * unit;
  return a === b
    ? `about ${a.toLocaleString("en-US")}`
    : `${a.toLocaleString("en-US")} to ${b.toLocaleString("en-US")}`;
}

/** A shock's size in percentage points, as entered: "1", "1.5". */
export function points(x: number): string {
  return String(Math.round(x * 10) / 10);
}

/** A model result in percentage points, always to two decimals: "0.93", "0.90". */
export function resultPoints(x: number): string {
  return x.toFixed(2);
}

/** A share, 0 to 1, as a whole percent. */
export function pct(share: number): string {
  return `${Math.round(share * 100)}%`;
}

/** How much lower `value` is than `base`, as a whole percent. */
export function pctLower(base: number, value: number): string {
  return pct(1 - value / base);
}

export function pctRange([lo, hi]: readonly [number, number]): string {
  const a = Math.round(lo);
  const b = Math.round(hi);
  return a === b ? `${a}%` : `${a}% to ${b}%`;
}
