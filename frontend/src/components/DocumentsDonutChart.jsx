import React, { useState } from "react";

const CX = 100;
const CY = 100;
const OUTER_R = 80;
const INNER_R = 48;

const SEGMENT_COLORS = [
  "#78AFCF",
  "#5D93B4",
  "#4FACFE",
  "#6BB8D9",
  "#73C0FF",
  "#5BA3C4",
  "#3D8EB5",
];

const SEGMENT_HOVER_COLORS = [
  "#00F2FE",
  "#4FACFE",
  "#78CFFF",
  "#00E5FF",
  "#5DEEFF",
  "#3DC8F0",
  "#2BB8E8",
];

const polarToCartesian = (cx, cy, r, angleDeg) => {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
};

const describeDonutSegment = (startAngle, endAngle) => {
  const startOuter = polarToCartesian(CX, CY, OUTER_R, startAngle);
  const endOuter = polarToCartesian(CX, CY, OUTER_R, endAngle);
  const startInner = polarToCartesian(CX, CY, INNER_R, endAngle);
  const endInner = polarToCartesian(CX, CY, INNER_R, startAngle);
  const largeArc = endAngle - startAngle > 180 ? 1 : 0;

  return [
    `M ${startOuter.x} ${startOuter.y}`,
    `A ${OUTER_R} ${OUTER_R} 0 ${largeArc} 1 ${endOuter.x} ${endOuter.y}`,
    `L ${startInner.x} ${startInner.y}`,
    `A ${INNER_R} ${INNER_R} 0 ${largeArc} 0 ${endInner.x} ${endInner.y}`,
    "Z",
  ].join(" ");
};

const getPopOutTransform = (startAngle, endAngle, offset = 0) => {
  const mid = (startAngle + endAngle) / 2;
  const rad = ((mid - 90) * Math.PI) / 180;
  const dx = offset * Math.cos(rad);
  const dy = offset * Math.sin(rad);
  return `translate(${dx}, ${dy})`;
};

const buildSegments = (items) => {
  const total = items.length;
  const slice = 360 / total;
  const gap = 2;

  return items.map((item, i) => {
    const startAngle = i * slice + gap / 2;
    const endAngle = (i + 1) * slice - gap / 2;
    return {
      ...item,
      startAngle,
      endAngle,
      path: describeDonutSegment(startAngle, endAngle),
      color: SEGMENT_COLORS[i % SEGMENT_COLORS.length],
      hoverColor: SEGMENT_HOVER_COLORS[i % SEGMENT_HOVER_COLORS.length],
      midAngle: (startAngle + endAngle) / 2,
    };
  });
};

const DocumentsDonutChart = ({ items, selected, onSelect }) => {
  const [hovered, setHovered] = useState(null);
  const [chartHovered, setChartHovered] = useState(false);
  const segments = buildSegments(items);

  const active = hovered ?? selected;
  const activeSegment = segments.find((s) => s.value === active);

  return (
    <div
      className={`donut-chart-wrapper ${chartHovered ? "donut-chart-hovered" : ""}`}
      onMouseEnter={() => setChartHovered(true)}
      onMouseLeave={() => {
        setChartHovered(false);
        setHovered(null);
      }}
      data-testid="documents-donut-chart"
    >
      <svg
        viewBox="0 0 200 200"
        className="donut-chart-svg"
        role="img"
        aria-label="Document services chart"
      >
        <defs>
          <filter id="donut-glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        <g className="donut-ring">
          {segments.map((seg) => {
            const isActive = active === seg.value;
            const isSelected = selected === seg.value;
            const popOffset = isActive ? 10 : 0;

            return (
              <g
                key={seg.value}
                className="donut-segment-group"
                style={{
                  transform: getPopOutTransform(seg.startAngle, seg.endAngle, popOffset),
                  transition: "transform 0.35s cubic-bezier(0.22, 1, 0.36, 1)",
                }}
              >
                <path
                  d={seg.path}
                  fill={isActive ? seg.hoverColor : seg.color}
                  className={`donut-segment ${isSelected ? "donut-segment-selected" : ""}`}
                  style={{
                    filter: isActive ? "url(#donut-glow)" : "none",
                    transition: "fill 0.3s ease, filter 0.3s ease",
                  }}
                  onMouseEnter={() => setHovered(seg.value)}
                  onMouseLeave={() => setHovered(null)}
                  onClick={() => onSelect(seg.value)}
                  data-testid={`donut-segment-${seg.value}`}
                  aria-label={seg.label}
                />
              </g>
            );
          })}
        </g>

        <circle cx={CX} cy={CY} r={INNER_R - 4} fill="var(--vs-bg)" />
        <text
          x={CX}
          y={CY - 6}
          textAnchor="middle"
          className="donut-center-count"
          fill="var(--vs-text-primary)"
          fontSize="22"
          fontWeight="600"
          fontFamily="var(--font-display)"
        >
          {items.length}
        </text>
        <text
          x={CX}
          y={CY + 14}
          textAnchor="middle"
          fill="var(--vs-text-muted)"
          fontSize="9"
          fontWeight="500"
          letterSpacing="0.12em"
          fontFamily="var(--font-body)"
        >
          SERVICES
        </text>
      </svg>

      {activeSegment && (
        <div className="donut-tooltip" role="tooltip">
          <span className="donut-tooltip-dot" style={{ background: activeSegment.hoverColor }} />
          <span className="donut-tooltip-label">{activeSegment.label}</span>
        </div>
      )}
    </div>
  );
};

export default DocumentsDonutChart;
