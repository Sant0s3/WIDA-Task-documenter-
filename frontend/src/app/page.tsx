'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { apiRequest } from '@/lib/api';
import { DashboardResponse } from '@/lib/types';
import Header from '@/components/layout/Header';
import { 
  Users, 
  CheckSquare, 
  Clock, 
  TrendingUp, 
  Calendar 
} from 'lucide-react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell
} from 'recharts';

export default function Dashboard() {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const router = useRouter();
  const [data, setData] = useState<DashboardResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, authLoading, router]);

  useEffect(() => {
    if (isAuthenticated) {
      apiRequest<DashboardResponse>('/api/dashboard')
        .then(setData)
        .catch(console.error)
        .finally(() => setLoading(false));
    }
  }, [isAuthenticated]);

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-wida-bg flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-wida-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!data) return null;

  const cardStats = [
    { label: 'إنجازات اليوم', value: data.stats.today_activities, icon: TrendingUp, color: 'text-wida-success' },
    { label: 'إجمالي الإنتاجية', value: data.stats.total_activities, icon: CheckSquare, color: 'text-wida-accent' },
    { label: 'إجمالي الموظفين', value: data.stats.total_employees, icon: Users, color: 'text-wida-warning' },
    { label: 'الموظفين النشطين', value: data.stats.active_employees, icon: Clock, color: 'text-wida-primary' },
  ];

  return (
    <>
      <Header title="لوحة المتابعة" />

      <div className="mt-8 space-y-8">
        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {cardStats.map((stat, idx) => {
            const Icon = stat.icon;
            return (
              <div key={idx} className="glass-card p-6 flex items-center justify-between">
                <div>
                  <span className="text-xs text-wida-text-muted font-medium">{stat.label}</span>
                  <h3 className="text-2xl font-bold text-white mt-2">{stat.value}</h3>
                </div>
                <div className={`p-3.5 rounded-xl bg-wida-surface border border-wida-border ${stat.color}`}>
                  <Icon size={20} />
                </div>
              </div>
            );
          })}
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Trend Chart */}
          <div className="lg:col-span-2 glass-card p-6">
            <h3 className="text-base font-bold text-white mb-6">منحنى الإنتاجية اليومي</h3>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data.activity_trend}>
                  <defs>
                    <linearGradient id="trendGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6e4fdc" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="#6e4fdc" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="date" stroke="#a8a0b8" fontSize={11} tickLine={false} />
                  <YAxis stroke="#a8a0b8" fontSize={11} tickLine={false} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#1a1225', borderColor: '#2d2440', color: '#fff', borderRadius: '8px' }}
                    labelClassName="text-xs text-wida-text-muted"
                  />
                  <Area type="monotone" dataKey="count" stroke="#6e4fdc" strokeWidth={2} fillOpacity={1} fill="url(#trendGradient)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Activity Breakdown */}
          <div className="glass-card p-6">
            <h3 className="text-base font-bold text-white mb-6">تحليل المخرجات (أسبوعي)</h3>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.entity_breakdown} layout="vertical">
                  <XAxis type="number" stroke="#a8a0b8" fontSize={11} hide />
                  <YAxis type="category" dataKey="entity_name" stroke="#a8a0b8" fontSize={11} tickLine={false} width={80} />
                  <Tooltip contentStyle={{ backgroundColor: '#1a1225', borderColor: '#2d2440', color: '#fff', borderRadius: '8px' }} />
                  <Bar dataKey="total_quantity" fill="#9168ea" radius={[0, 4, 4, 0]}>
                    {data.entity_breakdown.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={index % 2 === 0 ? '#6e4fdc' : '#9168ea'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Details List & Top Performers */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Recent Activities */}
          <div className="lg:col-span-2 glass-card p-6">
            <h3 className="text-base font-bold text-white mb-6">أحدث الإنجازات اليومية</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-right text-sm">
                <thead>
                  <tr className="border-b border-wida-border text-wida-text-muted text-xs">
                    <th className="pb-3 font-semibold">الموظف</th>
                    <th className="pb-3 font-semibold">الحدث</th>
                    <th className="pb-3 font-semibold">الكمية</th>
                    <th className="pb-3 font-semibold">التاريخ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-wida-border/50 text-white">
                  {data.recent_activities.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-4 text-center text-wida-text-muted">لا توجد أنشطة مسجلة اليوم بعد</td>
                    </tr>
                  ) : (
                    data.recent_activities.map((activity) => (
                      <tr key={activity.id} className="hover:bg-wida-surface-hover/30 transition-colors">
                        <td className="py-3.5 font-medium">{activity.employee_name}</td>
                        <td className="py-3.5 text-wida-accent">{activity.action_type_name} {activity.entity_type_name}</td>
                        <td className="py-3.5">{activity.quantity}</td>
                        <td className="py-3.5 text-xs text-wida-text-muted">{activity.activity_date}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Top Performers */}
          <div className="glass-card p-6">
            <h3 className="text-base font-bold text-white mb-6">نجوم الأسبوع الأكثر إنتاجية</h3>
            <div className="space-y-4">
              {data.employee_performance.length === 0 ? (
                <p className="text-sm text-wida-text-muted text-center py-4">لم يتم تسجيل أعمال هذا الأسبوع</p>
              ) : (
                data.employee_performance.map((perf, index) => (
                  <div key={perf.employee_id} className="flex items-center justify-between p-3 rounded-lg bg-wida-surface border border-wida-border/40">
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-bold text-wida-text-muted">#{index + 1}</span>
                      <span className="text-sm font-semibold text-white">{perf.employee_name}</span>
                    </div>
                    <span className="text-sm font-bold text-wida-primary">{perf.total_quantity} إنجاز</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
