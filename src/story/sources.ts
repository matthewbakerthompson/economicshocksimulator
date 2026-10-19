/**
 * The figures that turn model results into people, and where each comes from. Only unemployment
 * has a real unit in the model; foreclosures and bank lending use a scale set by 2008–10.
 * Every figure here was checked against the publisher's release or data file on 2026-10-18.
 */

export type SourceId = "jobs" | "foreclosures" | "lending";

/** The top of the unemployment scale, in percentage points (src/sim/events.ts). */
export const POINTS_AT_TOP = 6;

/** Civilian labor force, September 2026 (BLS, The Employment Situation, Table A-1). */
export const LABOR_FORCE = 170_262_000;

/** How much more the broader U-6 rate rose than the official rate, March 2007 to October 2009. */
export const U6_MULTIPLE = (17.1 - 8.0) / (10.0 - 4.4);

/**
 * The rise in people with a new foreclosure each quarter, from before the 2008 crisis to its
 * peak (566,180 in 2009 Q2): from the 2003–06 average (178,860) and from the low (148,780 in
 * 2005 Q2). NY Fed, Household Debt and Credit, 2026 Q2 data workbook, page 17.
 */
export const FORECLOSURE_RISE: readonly [number, number] = [566_180 - 178_860, 566_180 - 148_780];

/**
 * Net percentage of banks tightening standards on C&I loans to small firms at the 2008–09 peak:
 * January 2009 (69.2) and October 2008 (74.5). Federal Reserve, Senior Loan Officer Opinion Survey.
 */
export const TIGHTENING_PEAK: readonly [number, number] = [69.2, 74.5];

/** People out of work for an unemployment result on the model's 0–1 scale. */
export function peopleOutOfWork(stress: number): number {
  return ((stress * POINTS_AT_TOP) / 100) * LABOR_FORCE;
}

/** More people a quarter with a new foreclosure, for missed-payment results across lag settings. */
export function foreclosuresAbove(stress: readonly number[]): [number, number] {
  return [Math.min(...stress) * FORECLOSURE_RISE[0], Math.max(...stress) * FORECLOSURE_RISE[1]];
}

/** Net percentage of banks tightening small-business lending, for tighter-lending results. */
export function banksTightening(stress: readonly number[]): [number, number] {
  return [Math.min(...stress) * TIGHTENING_PEAK[0], Math.max(...stress) * TIGHTENING_PEAK[1]];
}

type Link = { label: string; href: string };

export type SourceNote = {
  id: SourceId;
  /** What the tinted number counts. */
  title: string;
  /** One line under a chapter that uses it. */
  short: string;
  method: string;
  range: string;
  caveat: string;
  links: Link[];
};

export const SOURCES: Record<SourceId, SourceNote> = {
  jobs: {
    id: "jobs",
    title: "People out of work",
    short: "BLS labor force, September 2026",
    method:
      "The model's unemployment result is in percentage points. Each point is 1% of the civilian labor force: 170,262,000 people in September 2026, so about 1.7 million.",
    range:
      "The stories use the official count. The broader U-6 measure also counts people who have stopped looking for work and part-time workers who want full-time work. From March 2007 to October 2009 it rose 1.6 times as much as the official rate (8.0% to 17.1%, against 4.4% to 10.0%).",
    caveat:
      "Job losses come only from the unemployment shocks in a scenario. Weak spending and tight credit do not cost more jobs in this model, so when other shocks are in play the count is a floor.",
    links: [
      {
        label: "BLS, The Employment Situation, Table A-1",
        href: "https://www.bls.gov/news.release/empsit.t01.htm",
      },
      {
        label: "BLS series LNS14000000 (official rate)",
        href: "https://data.bls.gov/timeseries/LNS14000000",
      },
      { label: "BLS series LNS13327709 (U-6)", href: "https://data.bls.gov/timeseries/LNS13327709" },
    ],
  },
  foreclosures: {
    id: "foreclosures",
    title: "More people a quarter with a new foreclosure",
    short: "NY Fed household debt data, scaled to 2008–10",
    method:
      "The model's missed-payments result has no real unit. We set the top of its scale to the rise in new foreclosures from before the 2008 crisis to its peak in 2009, the worst in the New York Fed's data, and scale the result by it. New foreclosures were 148,780 a quarter at the pre-crisis low (2005 Q2), 178,860 on average in 2003–06, 566,180 at the peak (2009 Q2) and 55,160 in 2026 Q2.",
    range:
      "The low end measures the rise from the 2003–06 average and the high end from the 2005 low. Both ends also cover the model's short and long lag settings.",
    caveat:
      "This is a sense of size, not a measurement. Foreclosures cover mortgages only. Far more people fall behind on payments without losing a home, and the New York Fed publishes no count of them. If the model's scale is meant to top out below 2009, these counts are too high.",
    links: [
      {
        label: "NY Fed, Household Debt and Credit, 2026 Q2 data workbook",
        href: "https://www.newyorkfed.org/medialibrary/interactives/householdcredit/data/xls/HHD_C_Report_2026Q2.xlsx",
      },
      {
        label: "NY Fed, Household Debt and Credit, 2026 Q2 report",
        href: "https://www.newyorkfed.org/medialibrary/interactives/householdcredit/data/pdf/HHDC_2026Q2.pdf",
      },
    ],
  },
  lending: {
    id: "lending",
    title: "Banks tightening small-business lending",
    short: "Federal Reserve loan officer survey, scaled to 2008",
    method:
      "The model's tighter-lending result has no real unit. We set the top of its scale to the October 2008 survey, when a net 74.5% of banks tightened standards on business loans to small firms, and scale the result by it. In the July 2026 survey the figure was 1.8%.",
    range:
      "The low end takes the January 2009 survey (69.2%) as the top of the scale and the high end October 2008 (74.5%). Both ends also cover the model's short and long lag settings.",
    caveat:
      "This counts banks, not people, and shows how widely standards tightened, not by how much. We don't turn it into businesses or households turned down: the Fed's small-business survey began after 2008, so there is no crisis reading. In its 2025 survey, 52% of small employer firms that applied for a loan, credit line or cash advance were fully approved (a convenience sample of 6,525 firms).",
    links: [
      {
        label: "Federal Reserve, Senior Loan Officer Opinion Survey, July 2026 chart data",
        href: "https://www.federalreserve.gov/data/sloos/sloos-202607-chart-data.htm",
      },
      {
        label: "Federal Reserve Banks, 2026 Report on Employer Firms",
        href: "https://www.fedsmallbusiness.org/reports/survey/2026/2026-report-on-employer-firms",
      },
    ],
  },
};

export type ResearchId = "sullivan" | "roelfs";

export type ResearchNote = { id: ResearchId; finding: string; citation: string; href: string };

/** Health findings quoted beside job losses. The model computes none of this. */
export const RESEARCH: Record<ResearchId, ResearchNote> = {
  sullivan: {
    id: "sullivan",
    finding:
      "Long-tenured male workers in Pennsylvania who lost their jobs had death rates 50% to 100% higher than expected in the following year, and 10% to 15% higher about 20 years later.",
    citation: "Sullivan and von Wachter, Quarterly Journal of Economics, 2009",
    href: "https://doi.org/10.1162/qjec.2009.124.3.1265",
  },
  roelfs: {
    id: "roelfs",
    finding:
      "Across 42 studies covering more than 20 million people, unemployed people had 1.63 times the risk of dying of employed people. The gap was smaller in studies that accounted for health behaviors.",
    citation: "Roelfs and others, Social Science & Medicine, 2011",
    href: "https://pubmed.ncbi.nlm.nih.gov/21330027/",
  },
};

export const HEALTH_CAVEAT = {
  text: "The Pennsylvania study covers one group of workers in one state, with records from the 1970s and 1980s, and the review of 42 studies finds an association, not a cause. Across whole populations, overall death rates have been found to fall in recessions. So the stories quote these findings and never turn them into a count of deaths.",
  link: {
    label: "Ruhm, Quarterly Journal of Economics, 2000",
    href: "https://doi.org/10.1162/003355300554872",
  },
};
