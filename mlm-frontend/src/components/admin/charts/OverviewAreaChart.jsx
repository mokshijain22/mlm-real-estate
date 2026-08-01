import { useEffect, useRef, useState } from "react";

/**
 * series: [{ name, color, data: number[] }]
 * labels: string[] (x-axis)
 */
function OverviewAreaChart({ labels, series, height = 220 }) {
  const wrapRef = useRef(null);
  const [width, setWidth] = useState(600);
  const [animate, setAnimate] = useState(false);
  const [hoverIdx, setHoverIdx] = useState(null);

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
  const xFor = (i) => (n <= 1 ? padding.left : padding.left + (i / (n - 1)) * innerW);
  const yFor = (v) => padding.top + innerH - (v / niceMax) * innerH;

  const buildLinePath = (data) =>
    data.map((v, i) => `${i === 0 ? "M" : "L"} ${xFor(i)} ${yFor(v)}`).join(" ");

  const buildAreaPath = (data) => {
    const line = data.map((v, i) => `${i === 0 ? "M" : "L"} ${xFor(i)} ${yFor(v)}`).join(" ");
    return `${line} L ${xFor(n - 1)} ${padding.top + innerH} L ${xFor(0)} ${padding.top + innerH} Z`;
  };

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
          <text key={l} x={xFor(i)} y={height - 6} textAnchor="middle" fontSize="11" fill="#7a7a8c" fontWeight="600">
            {l}
          </text>
        ))}

        {/* series: areas + lines */}
        {series.map((s, si) => {
          return (
            <g key={s.name} style={{ transition: `opacity .6s ease ${si * 0.1}s`, opacity: animate ? 1 : 0 }}>
              <defs>
                <linearGradient id={`grad-${si}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={s.color} stopOpacity="0.28" />
                  <stop offset="100%" stopColor={s.color} stopOpacity="0" />
                </linearGradient>
              </defs>
              <path d={buildAreaPath(s.data)} fill={`url(#grad-${si})`} />
              <path
                d={buildLinePath(s.data)}
                fill="none"
                stroke={s.color}
                strokeWidth={2.5}
                strokeLinecap="round"
                strokeLinejoin="round"
                pathLength={1}
                style={{
                  strokeDasharray: 1,
                  strokeDashoffset: animate ? 0 : 1,
                  transition: `stroke-dashoffset 1.1s cubic-bezier(.4,0,.2,1) ${si * 0.15}s`,
                }}
              />
              {s.data.map((v, i) => (
                <circle
                  key={i}
                  cx={xFor(i)}
                  cy={yFor(v)}
                  r={hoverIdx === i ? 5 : 3}
                  fill="#fff"
                  stroke={s.color}
                  strokeWidth={2}
                  style={{ transition: "r .15s ease", cursor: "pointer" }}
                  onMouseEnter={() => setHoverIdx(i)}
                  onMouseLeave={() => setHoverIdx(null)}
                />
              ))}
            </g>
          );
        })}

        {/* hover tooltip line */}
        {hoverIdx !== null && (
          <line
            x1={xFor(hoverIdx)}
            x2={xFor(hoverIdx)}
            y1={padding.top}
            y2={padding.top + innerH}
            stroke="#d0d0dc"
            strokeWidth={1}
            strokeDasharray="3 3"
          />
        )}
      </svg>

      {hoverIdx !== null && (
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
          <strong style={{ opacity: 0.75 }}>{labels[hoverIdx]}</strong>
          {series.map((s) => (
            <span key={s.name}>
              <span style={{ color: s.color }}>●</span> {s.name}: {inr(s.data[hoverIdx])}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

export default OverviewAreaChart;