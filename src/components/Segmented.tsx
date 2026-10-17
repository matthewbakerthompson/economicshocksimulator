import type { KeyboardEvent } from "react";

type Option<T extends string | number> = { value: T; label: string };

/** A row of mutually exclusive options, announced and navigated as a radio group. */
export function Segmented<T extends string | number>(props: {
  label: string;
  options: ReadonlyArray<Option<T>>;
  value: T;
  onChange: (value: T) => void;
  size?: "md" | "sm";
}) {
  const { label, options, value, onChange, size = "md" } = props;
  const index = options.findIndex((o) => o.value === value);

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const step = e.key === "ArrowRight" || e.key === "ArrowDown" ? 1 : e.key === "ArrowLeft" || e.key === "ArrowUp" ? -1 : 0;
    if (!step) return;
    e.preventDefault();
    const next = options[(index + step + options.length) % options.length];
    onChange(next.value);
    const el = e.currentTarget.querySelectorAll<HTMLButtonElement>("button")[options.indexOf(next)];
    el?.focus();
  };

  return (
    <div className={`segmented segmented-${size}`} role="radiogroup" aria-label={label} onKeyDown={onKeyDown}>
      {options.map((o) => {
        const on = o.value === value;
        return (
          <button
            key={String(o.value)}
            type="button"
            role="radio"
            aria-checked={on}
            tabIndex={on ? 0 : -1}
            className={on ? "segment on" : "segment"}
            onClick={() => onChange(o.value)}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
