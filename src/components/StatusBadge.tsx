import {
  MILESTONE_COLOR,
  MILESTONE_LABEL,
  STATUS_LABEL,
  AVAILABILITY_LABEL,
  AVAILABILITY_COLOR,
  INTERVIEW_OUTCOME_LABEL,
  INTERVIEW_OUTCOME_COLOR,
  SENIORITY_LABEL,
  SENIORITY_COLOR,
} from "@/lib/format";

type Kind =
  | "milestone"
  | "verification"
  | "availability"
  | "interview"
  | "seniority";

export default function StatusBadge({
  kind,
  value,
  size,
}: {
  kind: Kind;
  value: string;
  size?: "sm" | "md";
}) {
  let label = value;
  let color = "#6b6562";
  let bg = "var(--pebble-soft)";
  let cls = "badge";

  if (kind === "milestone") {
    label = MILESTONE_LABEL[value] ?? value;
    color = MILESTONE_COLOR[value] ?? color;
    bg = `${color}1f`;
  } else if (kind === "verification") {
    label = STATUS_LABEL[value] ?? value;
    if (value === "verified") {
      cls = "badge success";
    } else if (value === "pending") {
      cls = "badge warning";
    } else if (value === "rejected") {
      cls = "badge danger";
    } else {
      cls = "badge muted";
    }
    return (
      <span className={cls}>
        <span className="dot" /> {label}
      </span>
    );
  } else if (kind === "availability") {
    label = AVAILABILITY_LABEL[value] ?? value;
    color = AVAILABILITY_COLOR[value] ?? color;
    bg = `${color}1f`;
  } else if (kind === "interview") {
    label = INTERVIEW_OUTCOME_LABEL[value] ?? value;
    color = INTERVIEW_OUTCOME_COLOR[value] ?? color;
    bg = `${color}1f`;
  } else if (kind === "seniority") {
    label = SENIORITY_LABEL[value] ?? value;
    color = SENIORITY_COLOR[value] ?? color;
    bg = `${color}1f`;
  }

  if (size === "sm") {
    return (
      <span
        className={cls}
        style={{
          background: bg,
          color,
          padding: "2px 8px",
          fontSize: 10,
        }}
      >
        <span className="dot" />
        {label}
      </span>
    );
  }

  return (
    <span className={cls} style={{ background: bg, color }}>
      <span className="dot" />
      {label}
    </span>
  );
}
