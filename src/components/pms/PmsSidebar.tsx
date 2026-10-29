import {
  LayoutDashboard,
  UserCheck,
  CalendarDays,
  CalendarRange,
  BedDouble,
  Receipt,
  RotateCcw,
  Users,
  Boxes,
  BarChart3,
  ScrollText,
  Settings,
  Images,
} from 'lucide-react';

export type PmsTab =
  | 'overview'
  | 'walk_in'
  | 'reservations'
  | 'calendar'
  | 'rooms'
  | 'gallery'
  | 'billing'
  | 'cancellations'
  | 'guests'
  | 'inventory'
  | 'reports'
  | 'audit'
  | 'settings';

interface Props {
  activeTab: PmsTab;
  onTabChange: (tab: PmsTab) => void;
  pendingRequestsCount: number;
  awaitingAdvanceCount: number;
}

export const PmsSidebar: React.FC<Props> = ({
  activeTab,
  onTabChange,
  pendingRequestsCount,
  awaitingAdvanceCount,
}) => {
  const navItems: { id: PmsTab; label: string; icon: React.ReactNode; badge?: number; highlight?: boolean }[] = [
    { id: 'overview', label: 'Operations Dashboard', icon: <LayoutDashboard className="w-4 h-4" /> },
    {
      id: 'walk_in',
      label: '⚡ Walk-In Check-In',
      icon: <UserCheck className="w-4 h-4" />,
      highlight: true,
    },
    {
      id: 'reservations',
      label: 'Reservations & Phone',
      icon: <CalendarDays className="w-4 h-4" />,
      badge: pendingRequestsCount + awaitingAdvanceCount,
    },
    { id: 'calendar', label: 'Room Calendar (Grid)', icon: <CalendarRange className="w-4 h-4" /> },
    { id: 'rooms', label: 'Rooms & Housekeeping', icon: <BedDouble className="w-4 h-4" /> },
    { id: 'gallery', label: 'Hotel & Room Photos', icon: <Images className="w-4 h-4" /> },
    { id: 'billing', label: 'Billing & GST Invoices', icon: <Receipt className="w-4 h-4" /> },
    { id: 'cancellations', label: 'Cancellations & Refunds', icon: <RotateCcw className="w-4 h-4" /> },
    { id: 'guests', label: 'Guest KYC & History', icon: <Users className="w-4 h-4" /> },
    { id: 'inventory', label: 'Supplies & Linens', icon: <Boxes className="w-4 h-4" /> },
    { id: 'reports', label: 'Reports & Exports', icon: <BarChart3 className="w-4 h-4" /> },
    { id: 'audit', label: 'Operational Audit Log', icon: <ScrollText className="w-4 h-4" /> },
    { id: 'settings', label: 'Hotel Rules & Settings', icon: <Settings className="w-4 h-4" /> },
  ];

  return (
    <aside className="w-64 bg-slate-950 border-r border-slate-800 flex flex-col justify-between shrink-0 h-[calc(100vh-4rem)] overflow-y-auto">
      <div className="p-3 space-y-1">
        <div className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-500 font-mono">
          Front Desk Management
        </div>

        {navItems.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                item.highlight
                  ? isActive
                    ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                    : 'bg-amber-500/10 text-amber-300 border border-amber-500/30 hover:bg-amber-500/20'
                  : isActive
                  ? 'bg-slate-800 text-amber-300 border-l-2 border-amber-400'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <span className={isActive ? 'text-amber-400' : 'text-slate-400'}>
                  {item.icon}
                </span>
                <span>{item.label}</span>
              </div>

              {item.badge !== undefined && item.badge > 0 && (
                <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500 text-slate-950">
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Hotel Quick Contact / Location Card */}
      <div className="p-3 m-3 rounded-xl bg-slate-900 border border-slate-800 text-[11px] text-slate-400 space-y-1">
        <p className="font-bold text-slate-200">Pandokhar Sarkar Peeth</p>
        <p className="text-[10px]">Desk Line: 7000354771</p>
        <div className="pt-1 flex items-center gap-1.5 text-emerald-400 text-[10px]">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
          <span>16 Rooms Database Synced</span>
        </div>
      </div>
    </aside>
  );
};
