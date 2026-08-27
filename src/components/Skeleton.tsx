export default function Skeleton({
  height = 14,
  width = "100%",
  radius = 6,
}: {
  height?: number | string;
  width?: number | string;
  radius?: number | string;
}) {
  return (
    <div
      className="skeleton"
      style={{
        height,
        width,
        borderRadius: radius,
      }}
    />
  );
}
