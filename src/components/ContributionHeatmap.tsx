import { useMemo, useState } from "react";
import { formatFull, plural } from "@/lib/format";
import { HEATMAP_DAYS, buildHeatmap, type HeatDay } from "@/lib/stats";
import { ACTIVITY_FILTERS, describeEvent } from "@/lib/events";
import type { GitHubEvent } from "@/lib/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/primitives";

const CELL = 13;
const GAP = 3;
const LEFT = 28; // room for weekday labels
const TOP = 16; // room for month labels

function dayLabel(day: HeatDay) {
  const date = new Date(`${day.date}T00:00:00`);
  const when = date.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });
  return `${day.count === 0 ? "No" : formatFull(day.count)} ${day.count === 1 ? "contribution" : "contributions"} on ${when}`;
}

export function ContributionHeatmap({ events }: { events: GitHubEvent[] }) {
  const map = useMemo(() => buildHeatmap(events), [events]);
  const [hover, setHover] = useState<HeatDay | null>(null);
  const capped = events.length >= 300;
  const oldest = events.length
    ? new Date(events[events.length - 1].created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short" })
    : null;

  const width = LEFT + map.weeks.length * (CELL + GAP);
  const height = TOP + 7 * (CELL + GAP);

  // A month label above the first week that starts in a new month
  const months: { x: number; label: string }[] = [];
  map.weeks.forEach((week, i) => {
    const first = new Date(`${week[0].date}T00:00:00`);
    const prev = i > 0 ? new Date(`${map.weeks[i - 1][0].date}T00:00:00`) : null;
    if (!prev || prev.getMonth() !== first.getMonth()) {
      const x = LEFT + i * (CELL + GAP);
      if (!months.length || x - months[months.length - 1].x > 30) {
        months.push({ x, label: first.toLocaleDateString("en-GB", { month: "short" }) });
      }
    }
  });

  return (
    <Card>
      <CardHeader className="flex-row flex-wrap items-start justify-between gap-2">
        <div className="space-y-1">
          <CardTitle>Public activity</CardTitle>
          <CardDescription>
            Public events over the last {HEATMAP_DAYS / 7} weeks: pushes, pull requests, issues, reviews, releases and stars.
            {capped && oldest && (
              <> GitHub only shares the latest 300 events, so days before {oldest} aren't counted.</>
            )}
          </CardDescription>
        </div>
        <p className="tabular text-sm font-medium">{plural(map.total, "contribution")}</p>
      </CardHeader>
      <CardContent className="flex flex-col gap-6 md:flex-row md:items-start">
        <div className="min-w-0 shrink-0">
        <div className="overflow-x-auto pb-1">
          <svg
            width={width}
            height={height}
            viewBox={`0 0 ${width} ${height}`}
            role="img"
            aria-label={`Activity heatmap: ${plural(map.total, "contribution")} over ${map.activeDays} active days in the last ${HEATMAP_DAYS} days`}
            className="block"
            onMouseLeave={() => setHover(null)}
          >
            {months.map((m) => (
              <text key={m.x} x={m.x} y={10} className="fill-muted-foreground text-[10px]">
                {m.label}
              </text>
            ))}
            {["Mon", "Wed", "Fri"].map((d, i) => (
              <text key={d} x={0} y={TOP + (i * 2 + 1) * (CELL + GAP) + CELL - 3} className="fill-muted-foreground text-[10px]">
                {d}
              </text>
            ))}
            {map.weeks.map((week, wi) =>
              week.map((day, di) =>
                day.inRange ? (
                  <rect
                    key={day.date}
                    x={LEFT + wi * (CELL + GAP)}
                    y={TOP + di * (CELL + GAP)}
                    width={CELL}
                    height={CELL}
                    rx={2.5}
                    fill={`var(--heat-${day.level})`}
                    stroke={hover?.date === day.date ? "var(--color-foreground)" : "none"}
                    strokeWidth={1.5}
                    onMouseEnter={() => setHover(day)}
                  >
                    <title>{dayLabel(day)}</title>
                  </rect>
                ) : null,
              ),
            )}
          </svg>
        </div>

        <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground">
          <p aria-live="polite" className="min-h-4">
            {hover ? dayLabel(hover) : map.total === 0 ? `No public activity in the last ${HEATMAP_DAYS} days.` : "Hover a day for details"}
          </p>
          <div className="flex items-center gap-1" aria-hidden="true">
            Less
            {[0, 1, 2, 3, 4].map((l) => (
              <span key={l} className="size-[11px] rounded-[2px]" style={{ background: `var(--heat-${l})` }} />
            ))}
            More
          </div>
        </div>
        </div>
        <ActivitySummary map={map} events={events} />
      </CardContent>
    </Card>
  );
}

function ActivitySummary({ map, events }: { map: ReturnType<typeof buildHeatmap>; events: GitHubEvent[] }) {
  const repoCounts = new Map<string, number>();
  const kindCounts = new Map<string, number>();
  for (const e of events) {
    repoCounts.set(e.repo.name, (repoCounts.get(e.repo.name) ?? 0) + 1);
    const kind = describeEvent(e).kind;
    kindCounts.set(kind, (kindCounts.get(kind) ?? 0) + 1);
  }
  const topRepo = [...repoCounts.entries()].sort((a, b) => b[1] - a[1])[0];
  const kinds = ACTIVITY_FILTERS.filter((f) => f.kind !== "all" && kindCounts.get(f.kind))
    .map((f) => ({ label: f.label, n: kindCounts.get(f.kind)! }))
    .sort((a, b) => b.n - a.n);
  const maxKind = Math.max(1, ...kinds.map((k) => k.n));
  const busiest = map.busiest
    ? new Date(`${map.busiest.date}T00:00:00`).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" })
    : "None";

  const facts = [
    { label: "Active days", value: `${map.activeDays} of ${HEATMAP_DAYS}` },
    { label: "Longest streak", value: plural(map.longestStreak, "day") },
    { label: "Current streak", value: plural(map.currentStreak, "day") },
    { label: "Busiest day", value: map.busiest ? `${busiest} (${map.busiest.count})` : busiest },
  ];

  return (
    <div className="min-w-0 flex-1 space-y-4 md:border-l md:pl-6">
      <dl className="grid grid-cols-2 gap-x-4 gap-y-3">
        {facts.map((f) => (
          <div key={f.label} className="min-w-0">
            <dt className="text-xs text-muted-foreground">{f.label}</dt>
            <dd className="tabular truncate text-sm font-medium">{f.value}</dd>
          </div>
        ))}
        {topRepo && (
          <div className="col-span-2 min-w-0">
            <dt className="text-xs text-muted-foreground">Most active in</dt>
            <dd className="truncate font-mono text-[13px] font-medium" title={topRepo[0]}>
              {topRepo[0]} <span className="font-sans text-xs font-normal text-muted-foreground">({plural(topRepo[1], "event")})</span>
            </dd>
          </div>
        )}
      </dl>
      {kinds.length > 0 && (
        <ul className="space-y-1.5" aria-label="Events by type">
          {kinds.map((k) => (
            <li key={k.label} className="grid grid-cols-[7.5rem_1fr_2rem] items-center gap-2 text-xs">
              <span className="truncate text-muted-foreground">{k.label}</span>
              <span className="h-1.5 overflow-hidden rounded-full bg-muted">
                <span className="block h-full rounded-full" style={{ width: `${(k.n / maxKind) * 100}%`, background: "var(--heat-3)" }} />
              </span>
              <span className="tabular text-right">{k.n}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
