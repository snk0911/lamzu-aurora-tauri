// Custom, minimal logo — NOT a third-party brand. V4 design: a rounded-square
// container with a cyan gradient, the mouse as a dark negative-space cutout,
// and a cyan sensor LED. Matches the app icon files exactly.
export function Logo({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="lamzuLogoContainer" x1="0" y1="0" x2="0.4" y2="1">
          <stop offset="0" stopColor="#4fd0dc" />
          <stop offset="1" stopColor="#1a7fa0" />
        </linearGradient>
      </defs>
      {/* Rounded square container */}
      <rect x="4" y="4" width="92" height="92" rx="22" fill="url(#lamzuLogoContainer)" />
      {/* Mouse body as negative space — bulged in the middle for a real
          mouse silhouette (narrow top, wide belly) */}
      <path
        d="M50 26 C41 26 37 31 36 40 C35 46 33 52 33 58 C33 69 40 74 50 74 C60 74 67 69 67 58 C67 52 65 46 64 40 C63 31 59 26 50 26 Z"
        fill="#0f1115"
      />
      {/* Cyan sensor LED */}
      <rect x="47" y="33" width="6" height="13" rx="3" fill="#7ef0ff" />
    </svg>
  );
}
