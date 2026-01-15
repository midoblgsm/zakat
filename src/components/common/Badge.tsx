import { clsx } from 'clsx';
import type { ReactNode } from 'react';

type BadgeVariant = 'default' | 'primary' | 'success' | 'warning' | 'error' | 'info';
type BadgeSize = 'sm' | 'md' | 'lg';

interface BadgeProps {
  children: ReactNode;
  variant?: BadgeVariant;
  size?: BadgeSize;
  className?: string;
  dot?: boolean;
}

const variantClasses: Record<BadgeVariant, string> = {
  default: 'bg-gray-100 text-gray-700',
  primary: 'bg-primary-100 text-primary-700',
  success: 'bg-green-100 text-green-700',
  warning: 'bg-amber-100 text-amber-700',
  error: 'bg-red-100 text-red-700',
  info: 'bg-blue-100 text-blue-700',
};

const dotClasses: Record<BadgeVariant, string> = {
  default: 'bg-gray-400',
  primary: 'bg-primary-500',
  success: 'bg-green-500',
  warning: 'bg-amber-500',
  error: 'bg-red-500',
  info: 'bg-blue-500',
};

const sizeClasses: Record<BadgeSize, string> = {
  sm: 'px-2 py-0.5 text-xs',
  md: 'px-2.5 py-1 text-xs',
  lg: 'px-3 py-1.5 text-sm',
};

export function Badge({
  children,
  variant = 'default',
  size = 'md',
  className,
  dot = false,
}: BadgeProps) {
  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1.5 rounded-full font-medium',
        variantClasses[variant],
        sizeClasses[size],
        className
      )}
    >
      {dot && (
        <span
          className={clsx('h-1.5 w-1.5 rounded-full', dotClasses[variant])}
        />
      )}
      {children}
    </span>
  );
}

// Severity-specific badge component for flags
interface SeverityBadgeProps {
  severity: 'warning' | 'blocked';
  size?: BadgeSize;
  className?: string;
}

export function SeverityBadge({ severity, size = 'md', className }: SeverityBadgeProps) {
  const variant = severity === 'blocked' ? 'error' : 'warning';
  const label = severity === 'blocked' ? 'Blocked' : 'Warning';

  return (
    <Badge variant={variant} size={size} className={className} dot>
      {label}
    </Badge>
  );
}

// Status-specific badge for flags
interface FlagStatusBadgeProps {
  isActive: boolean;
  size?: BadgeSize;
  className?: string;
}

export function FlagStatusBadge({ isActive, size = 'md', className }: FlagStatusBadgeProps) {
  return (
    <Badge
      variant={isActive ? 'error' : 'success'}
      size={size}
      className={className}
      dot
    >
      {isActive ? 'Active' : 'Resolved'}
    </Badge>
  );
}
