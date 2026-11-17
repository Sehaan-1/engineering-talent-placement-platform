"use client";

import { harmonizeColor, initials } from "@/lib/format";

export default function Avatar({
  name,
  color,
  size,
}: {
  name: string;
  color: string;
  size?: "sm" | "md" | "lg" | "xl" | "xxl";
}) {
  const cls =
    size === "sm"
      ? "avatar sm"
      : size === "lg"
        ? "avatar lg"
        : size === "xl"
          ? "avatar xl"
          : size === "xxl"
            ? "avatar xxl"
            : "avatar";
  return (
    <div
      className={cls}
      style={{ background: harmonizeColor(color, name) }}
      aria-hidden="true"
    >
      {initials(name)}
    </div>
  );
}
