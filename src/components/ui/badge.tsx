import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-slate-900',
  {
    variants: {
      variant: {
        default: 'bg-blue-600/20 text-blue-400 border border-blue-500/30',
        secondary: 'bg-slate-700/50 text-slate-300 border border-slate-600/30',
        destructive: 'bg-red-600/20 text-red-400 border border-red-500/30',
        outline: 'bg-transparent text-slate-300 border border-slate-700',

        // Political party variants
        democratic: 'bg-blue-600/20 text-blue-400 border border-blue-500/30',
        republican: 'bg-red-600/20 text-red-400 border border-red-500/30',
        libertarian:
          'bg-yellow-600/20 text-yellow-400 border border-yellow-500/30',
        green: 'bg-emerald-600/20 text-emerald-400 border border-emerald-500/30',
        independent:
          'bg-purple-600/20 text-purple-400 border border-purple-500/30',
        other: 'bg-gray-600/20 text-gray-400 border border-gray-500/30',

        // Election type variants
        general: 'bg-blue-600/20 text-blue-400 border border-blue-500/30',
        special: 'bg-amber-600/20 text-amber-400 border border-amber-500/30',
        primary:
          'bg-emerald-600/20 text-emerald-400 border border-emerald-500/30',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className, variant, ...props }, ref) => {
    return (
      <span
        ref={ref}
        className={cn(badgeVariants({ variant, className }))}
        {...props}
      />
    );
  }
);
Badge.displayName = 'Badge';

export { Badge, badgeVariants };
export type { BadgeProps };
