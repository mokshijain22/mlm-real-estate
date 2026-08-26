import { useEffect, useRef, useState } from "react";

/**
 * series: [{ name, color, data: number[] }]
 * labels: string[] (x-axis)
 * Grouped bar chart — reads better than a line chart when many months are 0.
 */
function OverviewBarChart({ labels, series, height = 220 }) {
  const wrapRef = useRef(null);
  const [width, setWidth] = useState(600);
  const [animate, setAnimate] = useState(false);
  const [hover, setHover] = useState(null); // { groupIdx, seriesIdx }

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) setWidth(entry.contentRect.width);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const t = setTimeout(() => setAnimate(true), 80);
    return () => clearTimeout(t);
  }, []);

  const padding = { top: 16, right: 12, bottom: 28, left: 44 };
  const innerW = Math.max(width - padding.left - padding.right, 10);
  const innerH = height - padding.top - padding.bottom;

  const allValues = series.flatMap((s) => s.data);
  const maxVal = Math.max(1, ...allValues);
  const niceMax = maxVal <= 0 ? 1 : Math.ceil(maxVal * 1.15);

  const n = labels.length;
  const groupWidth = innerW / n;
  const barGap = 4;
  const barWidth = Math.max(4, (groupWidth - barGap * (series.length + 1)) / series.length);

  const yFor = (v) => padding.top + innerH - (v / niceMax) * innerH;
  const gridLines = 4;
  const inr = (v) =>
    "₹" + Number(v || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 });

  return (
    <div ref={wrapRef} style={{ width: "100%" }}>
      <svg width={width} height={height} style={{ overflow: "visible" }}>
        {/* horizontal grid */}
        {Array.from({ length: gridLines + 1 }).map((_, i) => {
          const y = padding.top + (innerH / gridLines) * i;
          const val = niceMax - (niceMax / gridLines) * i;
          return (
            <g key={i}>
              <line x1={padding.left} x2={width - padding.right} y1={y} y2={y} stroke="#f1f1f6" strokeWidth={1} />
              <text x={padding.left - 8} y={y + 4} textAnchor="end" fontSize="10" fill="#a0a0b0">
                {val >= 1000 ? `${Math.round(val / 1000)}k` : Math.round(val)}
              </text>
            </g>
          );
        })}

        {/* x labels */}
        {labels.map((l, i) => (
          <text
            key={l}
            x={padding.left + groupWidth * i + groupWidth / 2}
            y={height - 6}
            textAnchor="middle"
            fontSize="11"
            fill="#7a7a8c"
            fontWeight="600"
          >
            {l}
          </text>
        ))}

        {/* bars */}
        {labels.map((_, gi) => (
          <g key={gi}>
            {series.map((s, si) => {
              const v = s.data[gi] || 0;
              const x = padding.left + groupWidth * gi + barGap + si * (barWidth + barGap);
              const barH = innerH - (yFor(v) - padding.top);
              const isHover = hover && hover.groupIdx === gi && hover.seriesIdx === si;
              return (
                <rect
                  key={s.name}
                  x={x}
                  y={animate ? yFor(v) : padding.top + innerH}
                  width={barWidth}
                  height={animate ? barH : 0}
                  rx={3}
                  fill={s.color}
                  opacity={isHover ? 1 : 0.85}
                  style={{ transition: `y .6s ease ${gi * 0.04}s, height .6s ease ${gi * 0.04}s, opacity .15s ease`, cursor: "pointer" }}
                  onMouseEnter={() => setHover({ groupIdx: gi, seriesIdx: si })}
                  onMouseLeave={() => setHover(null)}
                />
              );
            })}
          </g>
        ))}
      </svg>

      {hover && (
        <div
          style={{
            fontSize: 12,
            background: "#1a1a2e",
            color: "#fff",
            borderRadius: 10,
            padding: "8px 12px",
            display: "inline-flex",
            flexDirection: "column",
            gap: 2,
            marginTop: 4,
          }}
        >
          <strong style={{ opacity: 0.75 }}>{labels[hover.groupIdx]}</strong>
          <span>
            <span style={{ color: series[hover.seriesIdx].color }}>●</span>{" "}
            {series[hover.seriesIdx].name}: {inr(series[hover.seriesIdx].data[hover.groupIdx])}
          </span>
        </div>
      )}
    </div>
  );
}

export default OverviewBarChart;