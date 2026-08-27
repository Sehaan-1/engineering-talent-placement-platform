"use client";

import { useMemo } from "react";

type SparklineProps = {
  data: number[];
  color?: string;
  fillColor?: string;
  height?: number;
  width?: number;
  showDots?: boolean;
};

/**
 * Lightweight SVG sparkline. Renders an area + line.
 * Used inside KPI cards and dashboard tiles.
 */
export default function Sparkline({
  data,
  color = "#7a1229",
  fillColor,
  height = 40,
  width = 120,
  showDots = false,
}: SparklineProps) {
  const { path, area, points, max, min } = useMemo(() => {
    if (data.length === 0) {
      return { path: "", area: "", points: [] as { x: number; y: number }[], max: 0, min: 0 };
    }
    const max = Math.max(...data);
    const min = Math.min(...data);
    const range = Math.max(1, max - min);
    const stepX = data.length > 1 ? width / (data.length - 1) : 0;
    const points = data.map((v, i) => ({
      x: i * stepX,
      y: height - ((v - min) / range) * (height - 4) - 2,
    }));
    const path = points
      .map((p, i) => (i === 0 ? `M ${p.x},${p.y}` : `L ${p.x},${p.y}`))
      .join(" ");
    const area = `${path} L ${width},${height} L 0,${height} Z`;
    return { path, area, points, max, min };
  }, [data, height, width]);

  const fill = fillColor ?? `${color}26`;

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      style={{ display: "block", overflow: "visible" }}
    >
      <defs>
        <linearGradient id={`spark-fill-${color.replace("#", "")}`} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={fill} />
          <stop offset="100%" stopColor={fill.replace(/[0-9a-f]{2}$/i, "00")} />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#spark-fill-${color.replace("#", "")})`} />
      <path
        d={path}
        fill="none"
        stroke={color}
        strokeWidth={1.75}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {showDots
        ? points.map((p, i) => (
            <circle
              key={i}
              cx={p.x}
              cy={p.y}
              r={1.5}
              fill={color}
            />
          ))
        : null}
      {points.length > 0 ? (
        <circle
          cx={points[points.length - 1].x}
          cy={points[points.length - 1].y}
          r={2.5}
          fill={color}
        />
      ) : null}
    </svg>
  );
}
