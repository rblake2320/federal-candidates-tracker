import { useState, useCallback, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Menu, Search } from 'lucide-react';
import { cn } from '@/lib/utils';

// ── Props ──────────────────────────────────────────────────

interface TopBarProps {
  onToggleSidebar: () => void;
  className?: string;
}

// ── Component ──────────────────────────────────────────────

export function TopBar({ onToggleSidebar, className }: TopBarProps) {
  const navigate = useNavigate();
  const [searchValue, setSearchValue] = useState('');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Clean up debounce timer on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const handleSearchSubmit = useCallback(
    (value: string) => {
      const trimmed = value.trim();
      if (trimmed) {
        navigate(`/search?q=${encodeURIComponent(trimmed)}`);
      }
    },
    [navigate]
  );

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      setSearchValue(value);

      // Debounce: auto-navigate after 300ms of inactivity
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        handleSearchSubmit(value);
      }, 300);
    },
    [handleSearchSubmit]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        // Immediate submit on Enter — cancel pending debounce
        if (debounceRef.current) clearTimeout(debounceRef.current);
        handleSearchSubmit(searchValue);
      }
    },
    [handleSearchSubmit, searchValue]
  );

  return (
    <header
      className={cn(
        'sticky top-0 z-40 flex items-center h-14 px-4 gap-3',
        'bg-slate-950/95 backdrop-blur border-b border-slate-800',
        className
      )}
    >
      {/* ── Hamburger (mobile only) ────────────────────── */}
      <button
        onClick={onToggleSidebar}
        className="lg:hidden flex items-center justify-center w-9 h-9 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
        aria-label="Open sidebar"
      >
        <Menu className="w-5 h-5" />
      </button>

      {/* ── Search input ───────────────────────────────── */}
      <div className="flex-1 max-w-md">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
          <input
            type="text"
            value={searchValue}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder="Search candidates, elections..."
            className={cn(
              'w-full h-9 pl-9 pr-3 rounded-md text-sm',
              'bg-slate-900 border border-slate-700 text-white placeholder:text-slate-500',
              'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent',
              'transition-colors'
            )}
          />
        </div>
      </div>

      {/* ── Right actions ──────────────────────────────── */}
      <div className="flex items-center gap-1.5">
        <span className="text-xs text-slate-500 hidden sm:block">
          2026 Midterm Elections
        </span>
      </div>
    </header>
  );
}
