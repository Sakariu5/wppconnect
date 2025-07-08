// Simple Badge component for UI
import * as React from 'react';
import { cn } from '@/lib/utils';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'secondary';
}

const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  function Badge({ className, variant = 'default', children, ...props }, ref) {
    return (
      <span
        ref={ref}
        className={cn(
          'inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold',
          variant === 'secondary'
            ? 'bg-blue-100 text-blue-800'
            : 'bg-gray-200 text-gray-800',
          className
        )}
        {...props}
      >
        {children}
      </span>
    );
  }
);

// @ts-expect-error displayName is valid on forwardRef
Badge.displayName = 'Badge';

export { Badge };
