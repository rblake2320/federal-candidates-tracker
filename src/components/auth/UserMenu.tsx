import { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { User, LogOut, Bookmark, ChevronDown } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';

interface UserMenuProps {
  collapsed?: boolean;
}

export function UserMenu({ collapsed = false }: UserMenuProps) {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close on click outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!user) return null;

  const initials = (user.display_name || user.email)
    .split(/[\s@]/)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase() || '')
    .join('');

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className={cn(
          'flex items-center gap-2 rounded-lg transition-colors hover:bg-slate-800',
          collapsed ? 'justify-center p-2' : 'w-full px-3 py-2'
        )}
        title={collapsed ? user.display_name || user.email : undefined}
      >
        <div className="w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center text-xs font-bold text-white shrink-0">
          {initials}
        </div>
        {!collapsed && (
          <>
            <div className="flex-1 min-w-0 text-left">
              <div className="text-sm font-medium text-white truncate">
                {user.display_name || user.email.split('@')[0]}
              </div>
              <div className="text-[11px] text-slate-500 truncate">
                {user.role}
              </div>
            </div>
            <ChevronDown className={cn(
              'h-3.5 w-3.5 text-slate-500 transition-transform',
              open && 'rotate-180'
            )} />
          </>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div className={cn(
          'absolute z-50 bg-slate-900 border border-slate-700 rounded-lg shadow-xl py-1 min-w-[180px]',
          collapsed ? 'left-full ml-2 bottom-0' : 'bottom-full mb-1 left-0 right-0'
        )}>
          <div className="px-3 py-2 border-b border-slate-800">
            <div className="text-sm font-medium text-white truncate">
              {user.display_name || 'User'}
            </div>
            <div className="text-xs text-slate-500 truncate">{user.email}</div>
          </div>

          <Link
            to="/watchlist"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2 px-3 py-2 text-sm text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
          >
            <Bookmark className="h-4 w-4" />
            My Watchlist
          </Link>

          {user.role === 'candidate' && (
            <Link
              to="/portal/candidate"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2 px-3 py-2 text-sm text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
            >
              <User className="h-4 w-4" />
              Candidate Portal
            </Link>
          )}

          <div className="border-t border-slate-800 mt-1">
            <button
              onClick={() => { logout(); setOpen(false); }}
              className="flex items-center gap-2 w-full px-3 py-2 text-sm text-red-400 hover:bg-slate-800 hover:text-red-300 transition-colors"
            >
              <LogOut className="h-4 w-4" />
              Sign Out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
