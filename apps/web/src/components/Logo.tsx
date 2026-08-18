import Link from 'next/link';
import { BrandIcon } from './BrandIcon';

export function Logo() {
  return (
    <Link
      href="/"
      className="mb-6 flex flex-col items-center gap-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 rounded-lg"
    >
      <BrandIcon />
      <span className="text-lg font-semibold tracking-tight text-foreground">
        Видеовстречи
      </span>
    </Link>
  );
}
