const SIZE_CLASSES = {
  md: 'size-12 rounded-2xl',
  sm: 'size-9 rounded-[10px]',
} as const;

const ICON_SIZE = {
  md: 26,
  sm: 20,
} as const;

export function BrandIcon({
  className,
  size = 'md',
}: {
  className?: string;
  size?: keyof typeof SIZE_CLASSES;
}) {
  return (
    <span
      className={`flex items-center justify-center bg-accent shadow-sm ${SIZE_CLASSES[size]} ${className ?? ''}`}
    >
      <svg
        width={ICON_SIZE[size]}
        height={ICON_SIZE[size]}
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
