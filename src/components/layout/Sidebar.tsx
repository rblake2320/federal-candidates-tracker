import { useState, useEffect, useCallback } from 'react';
import { NavLink } from 'react-router-dom';
import {
  Vote,
  Users,
  BarChart3,
  Database,
  Shield,
  Settings,
  Zap,
  ChevronDown,
  ChevronRight,
  Search,
  Globe,
  Landmark,
  Radio,
  FileBarChart,
  Code,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ── Types ──────────────────────────────────────────────────

interface NavItemDef {
  label: string;
  to: string;
  icon: React.ElementType;
}

interface NavGroupDef {
  key: string;
  label: string;
  items: NavItemDef[];
}

// ── Nav structure ──────────────────────────────────────────

const NAV_GROUPS: NavGroupDef[] = [
  {
    key: 'explore',
    label: 'Explore',
    items: [
      { label: 'Elections', to: '/', icon: Vote },
      { label: 'Congress', to: '/congress', icon: Users },
    ],
  },
  {
    key: 'portals',
    label: 'Portals',
    items: [
      { label: 'Campaign Portal', to: '/portal/campaign', icon: Landmark },
      { label: 'Candidate Portal', to: '/portal/candidate', icon: FileBarChart },
    ],
  },
  {
    key: 'data-tools',
    label: 'Data Tools',
    items: [
      { label: 'Real-Time Monitor', to: '/monitor', icon: Radio },
      { label: 'Data Steward', to: '/steward', icon: Database },
      { label: 'Civic Data APIs', to: '/apis', icon: Code },
    ],
  },
  {
    key: 'admin',
    label: 'Admin',
    items: [
      { label: 'Congress Admin', to: '/admin/congress', icon: Shield },
      { label: 'Global Observatory', to: '/admin/observatory', icon: Globe },
    ],
  },
];

const QUICK_ACCESS: NavItemDef[] = [
  { label: '2026 Midterms', to: '/search?q=2026', icon: Zap },
];

// ── Storage helpers ────────────────────────────────────────

const STORAGE_KEY = 'sidebar-collapsed-groups';

function loadCollapsedGroups(): Record<string, boolean> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveCollapsedGroups(state: Record<string, boolean>) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // localStorage unavailable — ignore
  }
}

// ── Props ──────────────────────────────────────────────────

interface SidebarProps {
  collapsed: boolean;
  onToggleCollapse: () => void;
  className?: string;
}

// ── Component ──────────────────────────────────────────────

export function Sidebar({ collapsed, onToggleCollapse, className }: SidebarProps) {
  const [groupState, setGroupState] = useState<Record<string, boolean>>(loadCollapsedGroups);

  useEffect(() => {
    saveCollapsedGroups(groupState);
  }, [groupState]);

  const toggleGroup = useCallback((key: string) => {
    setGroupState((prev) => ({ ...prev, [key]: !prev[key] }));
  }, []);

  const isGroupOpen = (key: string) => !groupState[key]; // default open

  return (
    <aside
      className={cn(
        'flex flex-col h-full bg-slate-950 border-r border-slate-800 overflow-y-auto transition-[width] duration-200',
        collapsed ? 'w-[var(--sidebar-width-collapsed)]' : 'w-[var(--sidebar-width)]',
        className
      )}
    >
      {/* ── Header ──────────────────────────────────────── */}
      <div className="flex items-center gap-3 px-4 h-14 shrink-0 border-b border-slate-800">
        <button
          onClick={onToggleCollapse}
          className="flex items-center justify-center w-8 h-8 rounded-lg bg-blue-600 text-white font-bold text-sm shrink-0 hover:bg-blue-500 transition-colors"
          aria-label="Toggle sidebar"
        >
          E
        </button>
        {!collapsed && (
          <span className="font-semibold text-white text-sm truncate">
            ElectionTracker
          </span>
        )}
      </div>

      {/* ── Navigation ──────────────────────────────────── */}
      <nav className="flex-1 py-3 space-y-1">
        {/* Search link (always visible) */}
        <SidebarNavItem
          item={{ label: 'Search', to: '/search', icon: Search }}
          collapsed={collapsed}
        />

        <div className="my-2 mx-3 border-t border-slate-800" />

        {/* Collapsible groups */}
        {NAV_GROUPS.map((group) => (
          <div key={group.key}>
            {!collapsed ? (
              <button
                onClick={() => toggleGroup(group.key)}
                className="flex items-center justify-between w-full px-4 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500 hover:text-slate-300 transition-colors"
              >
                <span>{group.label}</span>
                {isGroupOpen(group.key) ? (
                  <ChevronDown className="w-3.5 h-3.5" />
                ) : (
                  <ChevronRight className="w-3.5 h-3.5" />
                )}
              </button>
            ) : (
              <div className="my-2 mx-3 border-t border-slate-800" />
            )}

            {(collapsed || isGroupOpen(group.key)) && (
              <div className="space-y-0.5">
                {group.items.map((item) => (
                  <SidebarNavItem
                    key={item.to}
                    item={item}
                    collapsed={collapsed}
                  />
                ))}
              </div>
            )}
          </div>
        ))}

        {/* Quick Access */}
        <div className="my-2 mx-3 border-t border-slate-800" />
        {!collapsed && (
          <div className="px-4 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
            Quick Access
          </div>
        )}
        {QUICK_ACCESS.map((item) => (
          <SidebarNavItem
            key={item.to}
            item={item}
            collapsed={collapsed}
          />
        ))}
      </nav>

      {/* ── Footer (settings) ──────────────────────────── */}
      <div className="shrink-0 border-t border-slate-800 py-2">
        <SidebarNavItem
          item={{ label: 'Settings', to: '/settings', icon: Settings }}
          collapsed={collapsed}
        />
      </div>
    </aside>
  );
}

// ── SidebarNavItem ─────────────────────────────────────────

function SidebarNavItem({
  item,
  collapsed,
}: {
  item: NavItemDef;
  collapsed: boolean;
}) {
  const Icon = item.icon;

  return (
    <NavLink
      to={item.to}
      end={item.to === '/'}
      title={collapsed ? item.label : undefined}
      className={({ isActive }) =>
        cn(
          'flex items-center gap-3 mx-2 rounded-md text-sm font-medium transition-colors',
          collapsed ? 'justify-center px-0 py-2' : 'px-3 py-2',
          isActive
            ? 'bg-blue-600/20 text-blue-400'
            : 'text-slate-400 hover:bg-slate-800 hover:text-white'
        )
      }
    >
      <Icon className="w-4 h-4 shrink-0" />
      {!collapsed && <span className="truncate">{item.label}</span>}
    </NavLink>
  );
}
