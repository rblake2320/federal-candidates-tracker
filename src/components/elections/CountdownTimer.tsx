import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  differenceInDays,
  differenceInHours,
  differenceInMinutes,
  differenceInSeconds,
  parseISO,
  isValid,
  isSameDay,
} from 'date-fns';
import { cn } from '@/lib/utils';

interface CountdownTimerProps {
  targetDate: string | null | undefined;
  compact?: boolean;
  className?: string;
}

interface TimeRemaining {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

function computeTimeRemaining(target: Date): TimeRemaining {
  const now = new Date();
  const totalSeconds = differenceInSeconds(target, now);

  if (totalSeconds <= 0) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0 };
  }

  const days = differenceInDays(target, now);
  const hours = differenceInHours(target, now) % 24;
  const minutes = differenceInMinutes(target, now) % 60;
  const seconds = totalSeconds % 60;

  return { days, hours, minutes, seconds };
}

function TimeBox({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex flex-col items-center px-3 py-2">
      <span className="text-2xl font-bold text-white tabular-nums leading-none">
        {String(value).padStart(2, '0')}
      </span>
      <span className="mt-1 text-[10px] uppercase text-slate-500 tracking-wider">
        {label}
      </span>
    </div>
  );
}

function CountdownTimerInner({ targetDate, compact, className }: CountdownTimerProps) {
  // Parse date upfront — memoize so the Date reference stays stable across renders
  const { target, validDate } = useMemo(() => {
    const parsed = targetDate ? parseISO(targetDate) : null;
    const vd = parsed && isValid(parsed) ? parsed : null;
    const t = vd
      ? new Date(vd.getFullYear(), vd.getMonth(), vd.getDate(), 23, 59, 59)
      : null;
    return { target: t, validDate: vd };
  }, [targetDate]);

  const [time, setTime] = useState<TimeRemaining>(() =>
    target ? computeTimeRemaining(target) : { days: 0, hours: 0, minutes: 0, seconds: 0 }
  );
  const [isPast, setIsPast] = useState(() =>
    target ? differenceInSeconds(target, new Date()) <= 0 : false
  );
  const [isToday, setIsToday] = useState(() =>
    validDate ? isSameDay(new Date(), validDate) : false
  );

  const tick = useCallback(() => {
    if (!target || !validDate) return;
    const now = new Date();
    setTime(computeTimeRemaining(target));
    setIsPast(differenceInSeconds(target, now) <= 0);
    setIsToday(isSameDay(now, validDate));
  }, [target, validDate]);

  useEffect(() => {
    if (!target) return;
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [tick, target]);

  // No valid date — show TBD
  if (!target) {
    return (
      <div className={cn('flex items-center justify-center rounded-lg bg-slate-800/50 px-4 py-3', className)}>
        <span className="text-sm text-slate-500">Date TBD</span>
      </div>
    );
  }

  // Election day today
  if (isToday && !isPast) {
    return (
      <div className={cn('flex items-center justify-center rounded-lg bg-blue-600/20 border border-blue-500/30 px-4 py-3', className)}>
        <span className="text-sm font-bold text-blue-400 uppercase tracking-wider">
          Election Day
        </span>
      </div>
    );
  }

  // Past election
  if (isPast) {
    return (
      <div className={cn('flex items-center justify-center rounded-lg bg-slate-800/50 px-4 py-3', className)}>
        <span className="text-sm text-slate-500">Election Concluded</span>
      </div>
    );
  }

  // Compact mode: show "X days" only
  if (compact) {
    return (
      <div className={cn('flex items-center justify-center rounded-lg bg-slate-800/50 px-3 py-2', className)}>
        <span className="text-sm font-medium text-white tabular-nums">
          {time.days}
        </span>
        <span className="ml-1 text-xs text-slate-400">
          {time.days === 1 ? 'day' : 'days'} left
        </span>
      </div>
    );
  }

  // Full countdown
  return (
    <div className={cn('flex items-center justify-center rounded-lg bg-slate-800/50', className)}>
      <TimeBox value={time.days} label="Days" />
      <div className="h-8 w-px bg-slate-700" />
      <TimeBox value={time.hours} label="Hours" />
      <div className="h-8 w-px bg-slate-700" />
      <TimeBox value={time.minutes} label="Minutes" />
      <div className="h-8 w-px bg-slate-700" />
      <TimeBox value={time.seconds} label="Seconds" />
    </div>
  );
}

export const CountdownTimer = React.memo(CountdownTimerInner);
CountdownTimer.displayName = 'CountdownTimer';
