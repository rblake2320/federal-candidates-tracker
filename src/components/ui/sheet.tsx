import * as React from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/lib/utils';

interface SheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  side?: 'left' | 'right';
  children: React.ReactNode;
}

const Sheet: React.FC<SheetProps> = ({
  open,
  onOpenChange,
  side = 'left',
  children,
}) => {
  // Close on Escape key
  React.useEffect(() => {
    if (!open) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onOpenChange(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, onOpenChange]);

  // Prevent body scroll when open
  React.useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  if (typeof document === 'undefined') return null;

  return createPortal(
    <>
      {/* Overlay */}
      <div
        className={cn(
          'fixed inset-0 z-50 bg-black/50 transition-opacity duration-300',
          open ? 'opacity-100' : 'pointer-events-none opacity-0'
        )}
        onClick={() => onOpenChange(false)}
        aria-hidden="true"
      />

      {/* Content panel */}
      <div
        role="dialog"
        aria-modal="true"
        className={cn(
          'fixed top-0 z-50 h-full w-80 max-w-[85vw] bg-slate-900 shadow-xl transition-transform duration-300 ease-in-out',
          side === 'left' && 'left-0',
          side === 'right' && 'right-0',
          side === 'left' && (open ? 'translate-x-0' : '-translate-x-full'),
          side === 'right' && (open ? 'translate-x-0' : 'translate-x-full')
        )}
      >
        {children}
      </div>
    </>,
    document.body
  );
};
Sheet.displayName = 'Sheet';

interface SheetHeaderProps extends React.HTMLAttributes<HTMLDivElement> {}

const SheetHeader = React.forwardRef<HTMLDivElement, SheetHeaderProps>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        'flex items-center justify-between border-b border-slate-800 p-4',
        className
      )}
      {...props}
    />
  )
);
SheetHeader.displayName = 'SheetHeader';

interface SheetTitleProps extends React.HTMLAttributes<HTMLHeadingElement> {}

const SheetTitle = React.forwardRef<HTMLHeadingElement, SheetTitleProps>(
  ({ className, ...props }, ref) => (
    <h2
      ref={ref}
      className={cn('text-lg font-semibold text-white', className)}
      {...props}
    />
  )
);
SheetTitle.displayName = 'SheetTitle';

interface SheetContentProps extends React.HTMLAttributes<HTMLDivElement> {}

const SheetContent = React.forwardRef<HTMLDivElement, SheetContentProps>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn('flex-1 overflow-y-auto p-4', className)}
      {...props}
    />
  )
);
SheetContent.displayName = 'SheetContent';

export { Sheet, SheetHeader, SheetTitle, SheetContent };
export type { SheetProps, SheetHeaderProps, SheetTitleProps, SheetContentProps };
