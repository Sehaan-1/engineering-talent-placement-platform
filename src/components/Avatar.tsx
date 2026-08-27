"use client";

import { initials } from "@/lib/format";

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
    <div className={cls} style={{ background: color }}>
      {initials(name)}
    </div>
  );
}
