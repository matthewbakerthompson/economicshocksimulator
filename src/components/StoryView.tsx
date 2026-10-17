import { useEffect, useMemo, useRef } from "react";
import { describeMonth, fmtDelta, joinList } from "../sim/story";
import { useAppStore } from "../state/store";
import { type ReceiptRow, namedDrivers, receiptRows } from "../ui/receipts";

function driverText(r: ReceiptRow): string {
  // Shock titles carry their detail in parentheses ("Stagflation (demand weakness)").
  const name = r.kind === "shock" ? `${r.title.replace(/ \(.*\)$/, "")} shock` : r.title;
  return `${name} (${fmtDelta(r.amount)})`;
}

/** The run told month by month, in plain language. Lines that haven't changed aren't repeated. */
export function StoryView() {
  const result = useAppStore((s) => s.result);
  const scenario = useAppStore((s) => s.scenario);
  const t = useAppStore((s) => s.t);
  const setT = useAppStore((s) => s.setT);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  const entries = useMemo(() => {
    if (!result) return [];
    let previous = "";
    return Array.from({ length: result.steps }, (_, m) => {
      const story = describeMonth(result, scenario, m);
      const detail = story.detail === previous ? null : story.detail;
      previous = story.detail;
      const drivers = story.topMover ? namedDrivers(receiptRows(result, story.topMover.nodeId, m)) : [];
      return { m, headline: story.headline, detail, drivers: drivers.map(driverText) };
    });
  }, [result, scenario]);

  // Keep the current month in view inside the panel, without scrolling the page.
  useEffect(() => {
    const box = scrollRef.current;
    const item = box?.querySelector<HTMLElement>("[aria-current]");
    if (!box || !item || box.scrollHeight <= box.clientHeight) return;
    const top = item.offsetTop - box.offsetTop;
    if (top < box.scrollTop || top + item.offsetHeight > box.scrollTop + box.clientHeight) {
      box.scrollTop = top - box.clientHeight / 3;
    }
  }, [t]);

  return (
    <div className="storyScroll" ref={scrollRef}>
      <ol className="storyList" aria-label="The run, month by month">
        {entries.map((e) => (
          <li key={e.m} aria-current={e.m === t ? "step" : undefined} className={e.m > t ? "later" : undefined}>
            <button type="button" className="storyItem" onClick={() => setT(e.m)}>
              <span className="storyMonth">m{e.m}</span>
              <span className="storyText">
                <span className="storyHeadline">{e.headline}</span>
                {e.drivers.length > 0 && <span className="storyDrivers">Driven by {joinList(e.drivers)}.</span>}
                {e.detail && <span className="storyDetail">{e.detail}</span>}
              </span>
            </button>
          </li>
        ))}
      </ol>
    </div>
  );
}
