export function GaugeIcon(props: React.SVGProps<SVGSVGElement>) {
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
      <path d="M12 20a8 8 0 1 0-8-8" />
      <path d="M12 12 16 8" />
      <path d="M12 12v.01" />
    </svg>
  );
}
