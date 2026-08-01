import { useEffect, useState } from "react";

/**
 * segments: [{ label, value, color }]
 */
function DonutChart({ segments, size = 180, thickness = 22, centerLabel, centerValue }) {
  const [animate, setAnimate] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setAnimate(true), 60);
    return () => clearTimeout(t);
  }, []);

  const total = segments.reduce((s, seg) => s + (seg.value || 0), 0);
  const radius = (size - thickness) / 2;
  const circumference = 2 * Math.PI * radius;
  const center = size / 2;

  let cumulative = 0;

  return (
    <div className="donut-chart-wrap" style={{ width: size, height: size, position: "relative" }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke="#f1f1f6"
          strokeWidth={thickness}
        />
        {total > 0 &&
          segments.map((seg, i) => {
            const fraction = seg.value / total;
            const dash = fraction * circumference;
            const gap = circumference - dash;
            const offset = -cumulative * circumference;
            cumulative += fraction;
            return (
              <circle
                key={i}
                cx={center}
                cy={center}
                r={radius}
                fill="none"
                stroke={seg.color}
                strokeWidth={thickness}
                strokeDasharray={animate ? `${dash} ${gap}` : `0 ${circumference}`}
                strokeDashoffset={offset}
                strokeLinecap="butt"
                transform={`rotate(-90 ${center} ${center})`}
                style={{ transition: `stroke-dasharray 1s cubic-bezier(.4,0,.2,1) ${i * 0.12}s` }}
              />
            );
          })}
      </svg>
      <div
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          textAlign: "center",
        }}
      >
        <div style={{ fontSize: 26, fontWeight: 800, color: "#1a1a2e", lineHeight: 1.1 }}>
          {centerValue}
        </div>
        <div style={{ fontSize: 12, fontWeight: 600, color: "#7a7a8c" }}>{centerLabel}</div>
      </div>
    </div>
  );
}

export default DonutChart;