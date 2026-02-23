import React from 'react';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';

interface ElectionCardSkeletonProps {
  className?: string;
}

export function ElectionCardSkeleton({ className }: ElectionCardSkeletonProps) {
  return (
    <div
      className={cn(
        'rounded-xl border border-slate-700 bg-slate-900/60',
        className
      )}
    >
      <div className="p-5 sm:p-6">
        {/* Badges */}
        <div className="flex items-center gap-2">
          <Skeleton className="h-5 w-16 rounded-full" />
          <Skeleton className="h-5 w-24 rounded-full" />
        </div>

        {/* Title */}
        <Skeleton className="mt-3 h-6 w-3/4" />

        {/* Subtitle */}
        <Skeleton className="mt-2 h-4 w-1/2" />

        {/* Date + location */}
        <div className="mt-4 flex items-center gap-4">
          <Skeleton className="h-4 w-44" />
          <Skeleton className="h-4 w-24" />
        </div>

        {/* Countdown timer */}
        <div className="mt-4 flex items-center justify-center rounded-lg bg-slate-800/50 py-3">
          <div className="flex items-center gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex flex-col items-center gap-1 px-3">
                <Skeleton className="h-7 w-10" />
                <Skeleton className="h-2.5 w-12" />
              </div>
            ))}
          </div>
        </div>

        {/* Candidates preview */}
        <div className="mt-4 space-y-3">
          {/* Header */}
          <div className="flex items-center justify-between">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-3 w-20" />
          </div>

          {/* Candidate grid */}
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="flex items-center gap-3 rounded-lg bg-slate-800/40 px-3 py-2.5"
              >
                <Skeleton className="h-9 w-9 shrink-0 rounded-full" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-4 w-28" />
                  <Skeleton className="h-3 w-16" />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Action row */}
        <div className="mt-5 flex items-center gap-2 border-t border-slate-800 pt-4">
          <Skeleton className="h-8 w-20 rounded-md" />
          <Skeleton className="h-8 w-24 rounded-md" />
          <Skeleton className="h-8 w-22 rounded-md" />
          <div className="flex-1" />
          <Skeleton className="h-8 w-20 rounded-md" />
        </div>
      </div>
    </div>
  );
}
