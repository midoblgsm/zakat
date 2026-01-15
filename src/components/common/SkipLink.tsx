import { clsx } from 'clsx';

interface SkipLinkProps {
  href?: string;
  children?: React.ReactNode;
  className?: string;
}

/**
 * Skip link component for keyboard navigation (WCAG 2.1 Level A)
 * Allows users to skip directly to main content
 */
export function SkipLink({
  href = '#main-content',
  children = 'Skip to main content',
  className,
}: SkipLinkProps) {
  return (
    <a
      href={href}
      className={clsx(
        'sr-only focus:not-sr-only',
        'focus:fixed focus:left-4 focus:top-4 focus:z-[100]',
        'focus:rounded-md focus:bg-primary-600 focus:px-4 focus:py-2',
        'focus:text-white focus:shadow-lg focus:outline-none focus:ring-2 focus:ring-white',
        'transition-all duration-200',
        className
      )}
    >
      {children}
    </a>
  );
}
