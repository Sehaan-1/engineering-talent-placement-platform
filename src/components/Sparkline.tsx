"use client";

import { useId, useMemo } from "react";

type SparklineProps = {
  data: number[];
  color?: string;
  fillColor?: string;
  height?: number;
  width?: number;
  showDots?: boolean;
};

/**
 * Responsive SVG sparkline with safe stroke inset and instance-unique gradient IDs.
 */
export default function Sparkline({
  data,
  color = "#7a1229",
  fillColor,
  height = 36,
  width = 220,
  showDots = false,
}: SparklineProps) {
  const rawId = useId();
  const gradientId = `spark-${rawId.replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const padX = 3;
  const padY = 4;

  const { path, area, points } = useMemo(() => {
    if (data.length === 0) {
      return { path: "", area: "", points: [] as { x: number; y: number }[] };
    }
    const max = Math.max(...data);
    const min = Math.min(...data);
    const range = Math.max(1, max - min);
    const innerW = Math.max(1, width - padX * 2);
    const innerH = Math.max(1, height - padY * 2);
    const stepX = data.length > 1 ? innerW / (data.length - 1) : 0;
    const pts = data.map((v, i) => ({
      x: Number((padX + i * stepX).toFixed(2)),
      y: Number((height - padY - ((v - min) / range) * innerH).toFixed(2)),
    }));
    const linePath = pts
      .map((p, i) => (i === 0 ? `M ${p.x},${p.y}` : `L ${p.x},${p.y}`))
      .join(" ");
    const last = pts[pts.length - 1];
    const first = pts[0];
    const areaPath =
      pts.length > 1
        ? `${linePath} L ${last.x},${height} L ${first.x},${height} Z`
        : "";
    return { path: linePath, area: areaPath, points: pts };
  }, [data, height, width]);

  const stopColor = fillColor ?? color;

  return (
    <svg
      width="100%"
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      style={{ display: "block", width: "100%", height }}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={gradientId} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={stopColor} stopOpacity={fillColor ? 1 : 0.14} />
          <stop offset="100%" stopColor={stopColor} stopOpacity={0} />
        </linearGradient>
      </defs>
      {area ? <path d={area} fill={`url(#${gradientId})`} /> : null}
      {path ? (
        <path
          d={path}
          fill="none"
          stroke={color}
          strokeWidth={1.75}
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />
      ) : null}
      {showDots
        ? points.map((p, i) => (
            <circle key={i} cx={p.x} cy={p.y} r={1.75} fill={color} />
          ))
        : null}
    </svg>
  );
}
