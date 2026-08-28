export function HardDriveIcon(props: React.SVGProps<SVGSVGElement>) {
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
      <path d="m3 12 3-8h12l3 8" />
      <rect x="3" y="12" width="18" height="7" rx="1.5" />
      <path d="M7 16h.01M11 16h4" />
    </svg>
  );
}
