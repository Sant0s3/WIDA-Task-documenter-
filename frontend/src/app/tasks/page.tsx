'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { apiRequest } from '@/lib/api';
import { DailyActivity, Employee } from '@/lib/types';
import Header from '@/components/layout/Header';
import Link from 'next/link';
import { 
  MessageSquare, 
  Filter, 
  Calendar, 
  User, 
  TrendingUp, 
  Search,
  ChevronDown,
  Sparkles,
  Trash2
} from 'lucide-react';

export default function TasksPage() {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const router = useRouter();

  const [activities, setActivities] = useState<DailyActivity[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);

  // Filter states
  const [filterEmployee, setFilterEmployee] = useState<string>('');
  const [filterStartDate, setFilterStartDate] = useState<string>('');
  const [filterEndDate, setFilterEndDate] = useState<string>('');
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, authLoading, router]);

  const fetchData = async () => {
    try {
      const [empsData] = await Promise.all([
        apiRequest<Employee[]>('/api/employees'),
      ]);
      setEmployees(empsData);
      await fetchActivities();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchActivities = async () => {
    try {
      let query = '/api/activities?limit=200';
      if (filterEmployee) query += `&employee_id=${filterEmployee}`;
      if (filterStartDate) query += `&start_date=${filterStartDate}`;
      if (filterEndDate) query += `&end_date=${filterEndDate}`;
      const data = await apiRequest<DailyActivity[]>(query);
      setActivities(data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetchData();
    }
  }, [isAuthenticated]);

  // Re-fetch when filters change
  useEffect(() => {
    if (isAuthenticated && !loading) {
      fetchActivities();
    }
  }, [filterEmployee, filterStartDate, filterEndDate]);

  const handleDelete = async (id: number) => {
    if (!confirm('هل أنت متأكد من حذف هذا السجل؟')) return;
    try {
      await apiRequest(`/api/activities/${id}`, 'DELETE');
      fetchActivities();
    } catch (err) {
      console.error(err);
    }
  };

  // Group activities by date
  const groupedByDate = activities.reduce<Record<string, DailyActivity[]>>((acc, act) => {
    const dateKey = act.activity_date;
    if (!acc[dateKey]) acc[dateKey] = [];
    acc[dateKey].push(act);
    return acc;
  }, {});

  const sortedDates = Object.keys(groupedByDate).sort((a, b) => b.localeCompare(a));

  // Stats
  const totalActivities = activities.length;
  const totalQuantity = activities.reduce((sum, a) => sum + a.quantity, 0);
  const uniqueEmployees = new Set(activities.map(a => a.employee_id)).size;

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-wida-bg flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-wida-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <>
      <Header title="سجل الإنجازات" />

      <div className="mt-8 space-y-6">
        {/* Top Bar: Stats + Actions */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
          {/* Quick Stats */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-wida-surface border border-wida-border">
              <TrendingUp size={14} className="text-wida-primary" />
              <span className="text-xs text-wida-text-muted">إجمالي:</span>
              <span className="text-sm font-bold text-white">{totalQuantity} إنجاز</span>
            </div>
            <div className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-wida-surface border border-wida-border">
              <User size={14} className="text-wida-accent" />
              <span className="text-xs text-wida-text-muted">موظفين:</span>
              <span className="text-sm font-bold text-white">{uniqueEmployees}</span>
            </div>
            <div className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-wida-surface border border-wida-border">
              <Calendar size={14} className="text-wida-success" />
              <span className="text-xs text-wida-text-muted">سجلات:</span>
              <span className="text-sm font-bold text-white">{totalActivities}</span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border text-sm font-medium transition-all ${
                showFilters 
                  ? 'bg-wida-primary/10 border-wida-primary text-wida-primary' 
                  : 'bg-wida-surface border-wida-border text-wida-text-muted hover:text-white'
              }`}
            >
              <Filter size={14} />
              <span>فلترة</span>
              <ChevronDown size={12} className={`transition-transform ${showFilters ? 'rotate-180' : ''}`} />
            </button>
            <Link
              href="/assistant"
              className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-wida-primary hover:bg-wida-secondary text-white font-semibold text-sm transition-colors"
            >
              <Sparkles size={16} />
              <span>تسجيل إنجازات جديدة</span>
            </Link>
          </div>
        </div>

        {/* Filter Panel */}
        {showFilters && (
          <div className="glass-card p-5 border border-wida-border">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs text-wida-text-muted mb-2 font-medium">الموظف</label>
                <select
                  value={filterEmployee}
                  onChange={(e) => setFilterEmployee(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-lg bg-[#170b24] border border-wida-border text-white text-sm focus:outline-none focus:border-wida-primary"
                >
                  <option value="" className="bg-[#170b24]">جميع الموظفين</option>
                  {employees.map(emp => (
                    <option key={emp.id} value={emp.id} className="bg-[#170b24]">{emp.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-wida-text-muted mb-2 font-medium">من تاريخ</label>
                <input
                  type="date"
                  value={filterStartDate}
                  onChange={(e) => setFilterStartDate(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-lg bg-wida-surface border border-wida-border text-white text-sm focus:outline-none focus:border-wida-primary"
                />
              </div>
              <div>
                <label className="block text-xs text-wida-text-muted mb-2 font-medium">إلى تاريخ</label>
                <input
                  type="date"
                  value={filterEndDate}
                  onChange={(e) => setFilterEndDate(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-lg bg-wida-surface border border-wida-border text-white text-sm focus:outline-none focus:border-wida-primary"
                />
              </div>
            </div>
            {(filterEmployee || filterStartDate || filterEndDate) && (
              <button
                onClick={() => { setFilterEmployee(''); setFilterStartDate(''); setFilterEndDate(''); }}
                className="mt-3 text-xs text-wida-danger hover:underline"
              >
                مسح جميع الفلاتر
              </button>
            )}
          </div>
        )}

        {/* Activities Log */}
        {activities.length === 0 ? (
          <div className="glass-card p-12 text-center border border-wida-border">
            <div className="w-16 h-16 rounded-2xl bg-wida-surface flex items-center justify-center mb-4 border border-wida-border text-wida-primary text-2xl mx-auto">
              📋
            </div>
            <h3 className="text-base font-bold text-white mb-2">لا توجد إنجازات مسجلة بعد</h3>
            <p className="text-xs text-wida-text-muted mb-6 max-w-md mx-auto">
              لا توجد سجلات مضافة حالياً لهذا النطاق.
            </p>
            <Link
              href="/assistant"
              className="inline-flex items-center gap-2 px-5 py-3 rounded-lg bg-wida-primary hover:bg-wida-secondary text-white font-bold text-sm transition-colors"
            >
              <MessageSquare size={16} />
              <span>افتح المساعد الذكي</span>
            </Link>
          </div>
        ) : (
          <div className="space-y-6">
            {sortedDates.map(dateKey => {
              const dayActivities = groupedByDate[dateKey];
              const dayTotal = dayActivities.reduce((s, a) => s + a.quantity, 0);
              
              // Format date for display
              const dateObj = new Date(dateKey + 'T00:00:00');
              const today = new Date();
              today.setHours(0,0,0,0);
              const yesterday = new Date(today);
              yesterday.setDate(yesterday.getDate() - 1);
              
              let dateLabel = dateKey;
              if (dateObj.getTime() === today.getTime()) dateLabel = 'اليوم';
              else if (dateObj.getTime() === yesterday.getTime()) dateLabel = 'أمس';

              return (
                <div key={dateKey}>
                  {/* Date Header */}
                  <div className="flex items-center gap-3 mb-3">
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-wida-primary/15 border border-wida-primary/30">
                      <Calendar size={12} className="text-wida-primary" />
                      <span className="text-xs font-bold text-wida-primary">{dateLabel}</span>
                      {dateLabel !== dateKey && (
                        <span className="text-[10px] text-wida-text-muted">{dateKey}</span>
                      )}
                    </div>
                    <span className="text-[10px] text-wida-text-muted font-medium">{dayTotal} إنجاز • {dayActivities.length} سجل</span>
                    <div className="flex-grow h-px bg-wida-border/40"></div>
                  </div>

                  {/* Activities for this date */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {dayActivities.map(act => (
                      <div key={act.id} className="glass-card p-5 border border-wida-border hover:border-wida-primary/30 transition-all group">
                        <div className="flex justify-between items-start">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-wida-surface flex items-center justify-center text-xs font-bold text-wida-accent border border-wida-border">
                              {act.employee_name?.slice(0, 2) || '??'}
                            </div>
                            <div>
                              <p className="text-sm font-bold text-white">{act.employee_name}</p>
                              <p className="text-[10px] text-wida-text-muted mt-0.5">{act.action_type_name} {act.entity_type_name}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="px-2.5 py-1 rounded-lg bg-wida-primary/15 text-wida-primary text-sm font-bold">
                              {act.unit === 'seconds' ? `${act.quantity} ثانية` : act.unit === 'minutes' ? `${act.quantity} دقيقة` : `x${act.quantity}`}
                            </span>
                            <button
                              onClick={() => handleDelete(act.id)}
                              className="p-1.5 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-wida-danger/15 text-wida-text-muted hover:text-wida-danger transition-all"
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        </div>
                        {act.notes && (
                          <p className="mt-3 text-xs text-wida-text-muted border-t border-wida-border/30 pt-2.5">{act.notes}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}
