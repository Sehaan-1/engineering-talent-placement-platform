"use client";

import { FRAMEWORKS, PROFICIENCY_LABEL, getSkillColor } from "@/lib/format";

export type SkillChipProps = {
  framework?: string;
  name?: string;
  skill?: {
    name: string;
    slug?: string;
    categoryColor?: string;
    color?: string;
  };
  color?: string;
  proficiency?: string;
  size?: "sm" | "md";
};

export default function FrameworkChip({
  framework,
  name,
  skill,
  color: customColor,
  proficiency,
  size,
}: SkillChipProps) {
  const skillName = skill?.name ?? name ?? framework ?? "Skill";
  const skillSlug = skill?.slug ?? framework ?? skillName.toLowerCase();
  const legacyMeta = FRAMEWORKS.find(
    (f) => f.value === framework || f.value === skillSlug
  );

  const label = legacyMeta?.label ?? skillName;
  const color =
    customColor ??
    skill?.color ??
    legacyMeta?.color ??
    getSkillColor(skillSlug, skill?.categoryColor);

  const cls = proficiency ? `skill-tag ${proficiency}` : "chip";

  const style: React.CSSProperties =
    size === "sm" ? { padding: "3px 8px", fontSize: 10 } : {};

  return (
    <span className={cls} style={style}>
      <span className="swatch" style={{ background: color }} />
      {label}
      {proficiency ? (
        <span
          style={{
            opacity: 0.75,
            fontWeight: 500,
            fontSize: size === "sm" ? 9 : 10,
          }}
        >
          · {PROFICIENCY_LABEL[proficiency] ?? proficiency}
        </span>
      ) : null}
    </span>
  );
}

export { FrameworkChip as SkillChip };

