import { clsx } from 'clsx';
import type { ReactNode } from 'react';

interface FormStepProps {
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
}

export function FormStep({ title, description, children, className }: FormStepProps) {
  return (
    <div className={clsx('space-y-6', className)}>
      <div className="border-b border-gray-200 pb-4">
        <h2 className="text-xl font-semibold text-gray-900">{title}</h2>
        {description && (
          <p className="mt-1 text-sm text-gray-600">{description}</p>
        )}
      </div>
      <div className="space-y-4">{children}</div>
    </div>
  );
}
