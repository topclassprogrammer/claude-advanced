export function BrandIcon({ className }: { className?: string }) {
  return (
    <span
      className={`flex size-12 items-center justify-center rounded-2xl bg-accent shadow-sm ${className ?? ''}`}
    >
      <svg
        width="26"
        height="26"
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden="true"
      >
        <rect
          x="2"
          y="6"
          width="13"
          height="12"
          rx="3"
          fill="white"
          fillOpacity="0.95"
        />
        <path
          d="M17.5 10.2 21 8v8l-3.5-2.2v-3.6Z"
          fill="white"
          fillOpacity="0.95"
        />
      </svg>
    </span>
  );
}
