export function SlidersIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <path d="M4 6h6M14 6h6M4 12h11M19 12h1M4 18h3M11 18h9" />
      <circle cx="12" cy="6" r="2" />
      <circle cx="17" cy="12" r="2" />
      <circle cx="8" cy="18" r="2" />
    </svg>
  );
}
