import React from "react";

// VisitSarva monogram — a stylised "V" rising from a horizon
const Logo = ({ size = 32, className = "", color = "#0D7A6B" }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 40 40"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    aria-hidden="true"
  >
    <path
      d="M4 9 L20 31 L36 9"
      stroke={color}
      strokeWidth="2.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
    />
    <circle cx="20" cy="9" r="2" fill={color} />
    <path d="M2 35 H38" stroke={color} strokeWidth="1" opacity="0.5" />
  </svg>
);

export default Logo;
