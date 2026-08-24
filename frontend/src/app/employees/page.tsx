'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { apiRequest } from '@/lib/api';
import { Employee, EmployeeWithStats } from '@/lib/types';
import Header from '@/components/layout/Header';
import { UserPlus, ToggleLeft, ToggleRight, Trash2 } from 'lucide-react';

export default function EmployeesPage() {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const router = useRouter();

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Form states
  const [name, setName] = useState('');
  const [role, setRole] = useState<'designer' | 'animator'>('designer');
  const [error, setError] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, authLoading, router]);

  const fetchEmployees = async () => {
    try {
      const data = await apiRequest<Employee[]>('/api/employees?active_only=false');
      setEmployees(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetchEmployees();
    }
  }, [isAuthenticated]);

  const handleAddEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!name.trim()) return;

    try {
      await apiRequest('/api/employees', 'POST', { name: name.trim(), role });
      setName('');
      setShowAddForm(false);
      fetchEmployees();
    } catch (err: any) {
      setError(err.message || 'فشل إضافة الموظف');
    }
  };

  const toggleStatus = async (emp: Employee) => {
    try {
      await apiRequest(`/api/employees/${emp.id}`, 'PUT', { active: !emp.active });
      fetchEmployees();
    } catch (err) {
      console.error(err);
    }
  };

  const deleteEmployee = async (id: number) => {
    if (!confirm('هل أنت متأكد من حذف هذا الموظف؟')) return;
    try {
      await apiRequest(`/api/employees/${id}`, 'DELETE');
      fetchEmployees();
    } catch (err) {
      console.error(err);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-wida-bg flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-wida-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <>
      <Header title="إدارة الموظفين" />

      <div className="mt-8 space-y-6">
        <div className="flex justify-between items-center">
          <h3 className="text-base font-bold text-white">فريق العمل (المصممين والمحركين)</h3>
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-wida-primary hover:bg-wida-secondary text-white font-semibold text-sm transition-colors"
          >
            <UserPlus size={16} />
            <span>إضافة موظف جديد</span>
          </button>
        </div>

        {/* Add Employee Form Drawer/Card */}
        {showAddForm && (
          <div className="glass-card p-6 border border-wida-border max-w-lg">
            <h4 className="text-sm font-bold text-white mb-4">بيانات الموظف الجديد</h4>
            {error && <p className="text-xs text-wida-danger mb-4">{error}</p>}
            <form onSubmit={handleAddEmployee} className="space-y-4">
              <div>
                <label className="block text-xs text-wida-text-muted mb-2">اسم الموظف الثنائي/الثلاثي</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  placeholder="الاسم"
                  className="w-full px-4 py-2.5 rounded-lg bg-wida-surface border border-wida-border text-white text-sm focus:outline-none focus:border-wida-primary"
                />
              </div>

              <div>
                <label className="block text-xs text-wida-text-muted mb-2">الدور الوظيفي</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as any)}
                  className="w-full px-4 py-2.5 rounded-lg bg-[#170b24] border border-wida-border text-white text-sm focus:outline-none focus:border-wida-primary"
                >
                  <option value="designer" className="bg-[#170b24] text-white">مصمم (Designer)</option>
                  <option value="animator" className="bg-[#170b24] text-white">محرك (Animator)</option>
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="px-4 py-2.5 rounded-lg bg-wida-surface border border-wida-border text-wida-text-muted text-xs hover:text-white"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-lg bg-wida-primary hover:bg-wida-secondary text-white text-xs font-bold"
                >
                  حفظ الموظف
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Employees List */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {employees.length === 0 ? (
            <div className="col-span-full glass-card p-12 text-center text-wida-text-muted">
              لا يوجد موظفون مضافون حالياً. ابدأ بإضافة موظف من الزر أعلاه.
            </div>
          ) : (
            employees.map((emp) => (
              <div key={emp.id} className={`glass-card p-6 flex flex-col justify-between border ${emp.active ? 'border-wida-border' : 'border-wida-danger/20 opacity-60'}`}>
                <div>
                  <div className="flex justify-between items-start">
                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                      emp.role === 'designer' ? 'bg-wida-primary/20 text-wida-accent' : 'bg-wida-warning/20 text-wida-warning'
                    }`}>
                      {emp.role === 'designer' ? 'مصمم' : 'محرك رسوم'}
                    </span>
                    <span className={`text-[10px] font-bold ${emp.active ? 'text-wida-success' : 'text-wida-danger'}`}>
                      {emp.active ? 'نشط' : 'غير نشط'}
                    </span>
                  </div>
                  <h4 className="text-base font-bold text-white mt-4">{emp.name}</h4>
                  <p className="text-[10px] text-wida-text-muted mt-1">تاريخ الإضافة: {new Date(emp.created_at).toLocaleDateString('ar-SA')}</p>
                </div>

                <div className="flex justify-between items-center mt-6 pt-4 border-t border-wida-border/40">
                  <button
                    onClick={() => toggleStatus(emp)}
                    className="flex items-center gap-1 text-xs text-wida-text-muted hover:text-white transition-colors"
                  >
                    {emp.active ? (
                      <>
                        <ToggleRight size={18} className="text-wida-success" />
                        <span>تعطيل</span>
                      </>
                    ) : (
                      <>
                        <ToggleLeft size={18} />
                        <span>تنشيط</span>
                      </>
                    )}
                  </button>

                  <button
                    onClick={() => deleteEmployee(emp.id)}
                    className="p-2 rounded-lg bg-wida-surface hover:bg-wida-danger/25 text-wida-text-muted hover:text-wida-danger transition-colors border border-wida-border/50"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </>
  );
}
