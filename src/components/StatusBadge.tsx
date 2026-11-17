import {
  MILESTONE_LABEL,
  STATUS_LABEL,
  AVAILABILITY_LABEL,
  INTERVIEW_OUTCOME_LABEL,
  SENIORITY_LABEL,
} from "@/lib/format";

type Kind =
  | "milestone"
  | "verification"
  | "availability"
  | "interview"
  | "seniority";

function toneFor(kind: Kind, value: string): string {
  if (kind === "verification") {
    if (value === "verified") return "success";
    if (value === "pending") return "warning";
    if (value === "rejected") return "danger";
    return "muted";
  }
  if (kind === "availability") {
    if (value === "available") return "success";
    if (value === "limited") return "warning";
    if (value === "booked") return "info";
    return "muted";
  }
  if (kind === "interview") {
    if (value === "passed") return "success";
    if (value === "scheduled") return "info";
    if (value === "rescheduled") return "warning";
    if (value === "failed" || value === "no-show") return "danger";
    return "muted";
  }
  if (kind === "seniority") {
    if (value === "principal") return "brand";
    if (value === "staff") return "warning";
    if (value === "senior") return "success";
    if (value === "mid") return "info";
    return "muted";
  }
  // milestone
  if (value === "placed" || value === "offer") return "success";
  if (value === "interviewing") return "warning";
  if (value === "submitted") return "brand";
  if (value === "screening") return "info";
  return "muted";
}

function labelFor(kind: Kind, value: string): string {
  if (kind === "milestone") return MILESTONE_LABEL[value] ?? value;
  if (kind === "verification") return STATUS_LABEL[value] ?? value;
  if (kind === "availability") return AVAILABILITY_LABEL[value] ?? value;
  if (kind === "interview") return INTERVIEW_OUTCOME_LABEL[value] ?? value;
  return SENIORITY_LABEL[value] ?? value;
}

export default function StatusBadge({
  kind,
  value,
  size,
}: {
  kind: Kind;
  value: string;
  size?: "sm" | "md";
}) {
  const tone = toneFor(kind, value);
  const label = labelFor(kind, value);
  const cls = `badge ${tone}${size === "sm" ? " sm" : ""}`;

  return (
    <span className={cls}>
      <span className="dot" />
      <span>{label}</span>
    </span>
  );
}
