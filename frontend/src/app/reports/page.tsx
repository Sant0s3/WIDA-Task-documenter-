'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { apiRequest } from '@/lib/api';
import { ReportSummary, ComparisonReport, DailyActivity } from '@/lib/types';
import { generateWidaPDF } from '@/lib/pdfReport';
import Header from '@/components/layout/Header';
import { FileSpreadsheet, BarChart2, CalendarRange, TrendingUp, TrendingDown, FileText } from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';

export default function ReportsPage() {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const router = useRouter();

  const [period, setPeriod] = useState<'daily' | 'weekly' | 'monthly'>('weekly');
  const [summary, setSummary] = useState<ReportSummary | null>(null);
  const [comparison, setComparison] = useState<ComparisonReport | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, authLoading, router]);

  const fetchReports = async () => {
    setLoading(true);
    try {
      const [sumData, compData] = await Promise.all([
        apiRequest<ReportSummary>(`/api/reports/summary?period=${period}`),
        apiRequest<ComparisonReport>(`/api/reports/comparison?period=${period}`)
      ]);
      setSummary(sumData);
      setComparison(compData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetchReports();
    }
  }, [isAuthenticated, period]);

  const handleExportPDF = async () => {
    try {
      const data = await apiRequest<DailyActivity[]>('/api/activities?limit=200');
      const label = period === 'daily' ? 'تقرير الإنجازات اليومي' : period === 'weekly' ? 'تقرير الإنجازات الأسبوعي' : 'تقرير الإنجازات الشهري';
      generateWidaPDF(data, `${label} — وايدا AI`);
    } catch (err: any) {
      alert(err.message || 'فشل استخراج التقرير');
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-wida-bg flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-wida-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  const COLORS = ['#6e4fdc', '#9168ea', '#e6c8fe', '#a8a0b8', '#22c55e', '#f59e0b', '#ec4899'];

  return (
    <>
      <Header title="التقارير التفصيلية" />

      <div className="mt-8 space-y-8">
        {/* Filters */}
        <div className="glass-card p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-wida-surface text-wida-primary border border-wida-border">
              <CalendarRange size={18} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">تصفية نطاق التقارير</h3>
              <p className="text-[10px] text-wida-text-muted mt-0.5">اختر الفترة الزمنية للتقارير وتصديرها</p>
            </div>
          </div>

          <div className="flex gap-2 items-center flex-wrap">
            {(['daily', 'weekly', 'monthly'] as const).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-4 py-2 rounded-lg text-xs font-semibold transition-colors ${
                  period === p 
                    ? 'bg-wida-primary text-white' 
                    : 'bg-wida-surface border border-wida-border text-wida-text-muted hover:text-white'
                }`}
              >
                {p === 'daily' ? 'اليوم' : p === 'weekly' ? 'هذا الأسبوع' : 'هذا الشهر'}
              </button>
            ))}

            <button
              onClick={handleExportPDF}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-gradient-to-r from-[#6e4fdc] to-[#805ad5] text-white hover:opacity-95 transition-all text-xs font-bold shadow-md cursor-pointer mr-2"
            >
              <FileText size={14} />
              <span>تصدير PDF</span>
            </button>
          </div>
        </div>

        {/* Overview Stats & Comparison */}
        {comparison && summary && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="glass-card p-6 flex items-center justify-between col-span-1">
              <div>
                <span className="text-xs text-wida-text-muted">مجموع المخرجات للفترة</span>
                <h3 className="text-3xl font-bold text-white mt-2">{summary.total_quantity} إنجاز</h3>
              </div>
              <div className="flex flex-col items-end gap-1">
                <span className="text-[10px] text-wida-text-muted">مقارنة بالفترة السابقة</span>
                <div className={`flex items-center gap-1 text-xs font-bold ${
                  comparison.change_percentage >= 0 ? 'text-wida-success' : 'text-wida-danger'
                }`}>
                  {comparison.change_percentage >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                  <span>{Math.abs(comparison.change_percentage)}٪</span>
                </div>
              </div>
            </div>

            <div className="glass-card p-6 col-span-1">
              <span className="text-xs text-wida-text-muted">حالة سير المهام</span>
              <div className="grid grid-cols-3 gap-2 mt-4 text-center">
                <div className="p-2.5 rounded-lg bg-wida-surface border border-wida-border/40">
                  <span className="text-[10px] text-wida-text-muted block">اكتملت</span>
                  <span className="text-base font-bold text-wida-success mt-1 block">{summary.tasks_completed}</span>
                </div>
                <div className="p-2.5 rounded-lg bg-wida-surface border border-wida-border/40">
                  <span className="text-[10px] text-wida-text-muted block">قيد العمل</span>
                  <span className="text-base font-bold text-wida-warning mt-1 block">{summary.tasks_in_progress}</span>
                </div>
                <div className="p-2.5 rounded-lg bg-wida-surface border border-wida-border/40">
                  <span className="text-[10px] text-wida-text-muted block">متأخرة</span>
                  <span className="text-base font-bold text-wida-danger mt-1 block">{summary.tasks_overdue}</span>
                </div>
              </div>
            </div>

            <div className="glass-card p-6 col-span-1 flex items-center justify-between">
              <div>
                <span className="text-xs text-wida-text-muted">إجمالي العمليات المسجلة</span>
                <h3 className="text-3xl font-bold text-white mt-2">{summary.total_activities} عملية</h3>
              </div>
              <div className="p-3.5 rounded-xl bg-wida-surface border border-wida-border text-wida-accent">
                <FileSpreadsheet size={22} />
              </div>
            </div>
          </div>
        )}

        {/* Charts & Breakdown */}
        {summary && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Output by Employee */}
            <div className="glass-card p-6">
              <h3 className="text-sm font-bold text-white mb-6">الإنتاجية حسب الموظف</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={summary.by_employee}>
                    <XAxis dataKey="name" stroke="#a8a0b8" fontSize={10} tickLine={false} />
                    <YAxis stroke="#a8a0b8" fontSize={10} tickLine={false} />
                    <Tooltip contentStyle={{ backgroundColor: '#1a1225', borderColor: '#2d2440', color: '#fff', borderRadius: '8px' }} />
                    <Bar dataKey="quantity" fill="#6e4fdc" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Output by Entity Type */}
            <div className="glass-card p-6">
              <h3 className="text-sm font-bold text-white mb-6">توزيع المخرجات حسب النوع</h3>
              <div className="h-64 flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={summary.by_entity}
                      dataKey="quantity"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      fill="#8884d8"
                      label
                    >
                      {summary.by_entity.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ backgroundColor: '#1a1225', borderColor: '#2d2440', color: '#fff', borderRadius: '8px' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
