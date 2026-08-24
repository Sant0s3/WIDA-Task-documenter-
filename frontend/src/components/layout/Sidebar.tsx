'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { 
  LayoutDashboard, 
  TrendingUp, 
  Users, 
  MessageSquare, 
  BarChart3, 
  Settings, 
  LogOut 
} from 'lucide-react';

export default function Sidebar() {
  const pathname = usePathname();
  const { logout, username } = useAuth();

  const menuItems = [
    { name: 'لوحة المتابعة', href: '/', icon: LayoutDashboard },
    { name: 'سجل الإنجازات', href: '/tasks', icon: TrendingUp },
    { name: 'الموظفين', href: '/employees', icon: Users },
    { name: 'المساعد الذكي', href: '/assistant', icon: MessageSquare },
    { name: 'التقارير', href: '/reports', icon: BarChart3 },
    { name: 'الإعدادات', href: '/settings', icon: Settings },
  ];

  return (
    <aside className="w-64 bg-[#0b0512] h-screen fixed top-0 left-0 z-20 flex flex-col justify-between border-r border-wida-border rounded-none shadow-2xl">
      <div className="p-6">
        <div className="mb-8 flex items-center justify-center w-full">
          {/* Official WIDA PNG Logo Centered */}
          <img 
            src="/WidaLOGO.png" 
            alt="WIDA Logo" 
            className="h-10 w-auto object-contain mx-auto"
          />
        </div>

        <nav className="space-y-1">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all ${
                  isActive 
                    ? 'bg-wida-primary text-white shadow-lg shadow-wida-primary/30' 
                    : 'text-wida-text-muted hover:bg-wida-surface-hover hover:text-white'
                }`}
              >
                <Icon size={18} />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="p-6 border-t border-wida-border">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-wida-surface flex items-center justify-center text-xs font-bold text-wida-accent border border-wida-border">
              {username?.slice(0, 2).toUpperCase() || 'AD'}
            </div>
            <div className="text-right">
              <p className="text-xs font-semibold text-white leading-none">المنسق</p>
              <p className="text-[10px] text-wida-text-muted mt-1">{username}</p>
            </div>
          </div>
        </div>
        <button
          onClick={logout}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium text-wida-danger hover:bg-wida-danger/10 transition-colors"
        >
          <LogOut size={16} />
          <span>تسجيل الخروج</span>
        </button>
      </div>
    </aside>
  );
}
