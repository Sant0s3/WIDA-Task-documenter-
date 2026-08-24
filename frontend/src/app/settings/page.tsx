'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { apiRequest } from '@/lib/api';
import { EntityType, ActionType } from '@/lib/types';
import Header from '@/components/layout/Header';
import { Settings, Lock, Plus, Trash2 } from 'lucide-react';

export default function SettingsPage() {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const router = useRouter();

  const [entities, setEntities] = useState<EntityType[]>([]);
  const [actions, setActions] = useState<ActionType[]>([]);
  const [loading, setLoading] = useState(true);

  // Form states
  const [entityName, setEntityName] = useState('');
  const [entityDisplay, setEntityDisplay] = useState('');
  const [actionName, setActionName] = useState('');
  const [actionDisplay, setActionDisplay] = useState('');

  // Password change states
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [passError, setPassError] = useState('');
  const [passSuccess, setPassSuccess] = useState('');

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, authLoading, router]);

  const fetchData = async () => {
    try {
      const [entitiesData, actionsData] = await Promise.all([
        apiRequest<EntityType[]>('/api/settings/entity-types'),
        apiRequest<ActionType[]>('/api/settings/action-types')
      ]);
      setEntities(entitiesData);
      setActions(actionsData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetchData();
    }
  }, [isAuthenticated]);

  const handleAddEntity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!entityName.trim() || !entityDisplay.trim()) return;

    try {
      await apiRequest('/api/settings/entity-types', 'POST', {
        name: entityName.trim().toLowerCase(),
        display_name: entityDisplay.trim()
      });
      setEntityName('');
      setEntityDisplay('');
      fetchData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleAddAction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!actionName.trim() || !actionDisplay.trim()) return;

    try {
      await apiRequest('/api/settings/action-types', 'POST', {
        name: actionName.trim().toLowerCase(),
        display_name: actionDisplay.trim()
      });
      setActionName('');
      setActionDisplay('');
      fetchData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleDeleteEntity = async (id: number) => {
    if (!confirm('هل أنت متأكد من حذف هذا النوع؟ قد يؤثر ذلك على إحصاءات الأنشطة السابقة.')) return;
    try {
      await apiRequest(`/api/settings/entity-types/${id}`, 'DELETE');
      fetchData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleDeleteAction = async (id: number) => {
    if (!confirm('هل أنت متأكد من حذف هذا الإجراء؟ قد يؤثر ذلك على إحصاءات الأنشطة السابقة.')) return;
    try {
      await apiRequest(`/api/settings/action-types/${id}`, 'DELETE');
      fetchData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPassError('');
    setPassSuccess('');

    try {
      await apiRequest('/api/auth/change-password', 'POST', {
        current_password: currentPassword,
        new_password: newPassword
      });
      setCurrentPassword('');
      setNewPassword('');
      setPassSuccess('تم تغيير كلمة المرور بنجاح.');
    } catch (err: any) {
      setPassError(err.message || 'فشل تغيير كلمة المرور');
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
      <Header title="الإعدادات والنظام" />

      <div className="mt-8 space-y-8">
        {/* Dynamic Entities section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Entity types */}
          <div className="glass-card p-6 flex flex-col justify-between">
            <div>
              <h3 className="text-sm font-bold text-white mb-6">أنواع المخرجات (Entities)</h3>
              
              <div className="space-y-2 max-h-60 overflow-y-auto mb-6 custom-scrollbar">
                {entities.map(e => (
                  <div key={e.id} className="flex justify-between items-center p-3 rounded-lg bg-wida-surface border border-wida-border/40">
                    <div>
                      <span className="text-xs font-bold text-white">{e.display_name}</span>
                      <span className="text-[10px] text-wida-text-muted mr-2">({e.name})</span>
                    </div>
                    <button onClick={() => handleDeleteEntity(e.id)} className="text-wida-text-muted hover:text-wida-danger transition-colors">
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <form onSubmit={handleAddEntity} className="flex gap-2">
              <input
                type="text"
                value={entityDisplay}
                onChange={(e) => setEntityDisplay(e.target.value)}
                placeholder="الاسم بالعربي"
                required
                className="w-1/2 px-4 py-2.5 rounded-lg bg-wida-surface border border-wida-border text-white text-xs focus:outline-none focus:border-wida-primary"
              />
              <input
                type="text"
                value={entityName}
                onChange={(e) => setEntityName(e.target.value)}
                placeholder="الاسم بالإنجليزي"
                required
                className="w-1/2 px-4 py-2.5 rounded-lg bg-wida-surface border border-wida-border text-white text-xs focus:outline-none focus:border-wida-primary"
              />
              <button type="submit" className="p-2.5 rounded-lg bg-wida-primary hover:bg-wida-secondary text-white transition-colors">
                <Plus size={16} />
              </button>
            </form>
          </div>

          {/* Action types */}
          <div className="glass-card p-6 flex flex-col justify-between">
            <div>
              <h3 className="text-sm font-bold text-white mb-6">أنواع الإجراءات (Actions)</h3>
              
              <div className="space-y-2 max-h-60 overflow-y-auto mb-6 custom-scrollbar">
                {actions.map(a => (
                  <div key={a.id} className="flex justify-between items-center p-3 rounded-lg bg-wida-surface border border-wida-border/40">
                    <div>
                      <span className="text-xs font-bold text-white">{a.display_name}</span>
                      <span className="text-[10px] text-wida-text-muted mr-2">({a.name})</span>
                    </div>
                    <button onClick={() => handleDeleteAction(a.id)} className="text-wida-text-muted hover:text-wida-danger transition-colors">
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <form onSubmit={handleAddAction} className="flex gap-2">
              <input
                type="text"
                value={actionDisplay}
                onChange={(e) => setActionDisplay(e.target.value)}
                placeholder="الاسم بالعربي"
                required
                className="w-1/2 px-4 py-2.5 rounded-lg bg-wida-surface border border-wida-border text-white text-xs focus:outline-none focus:border-wida-primary"
              />
              <input
                type="text"
                value={actionName}
                onChange={(e) => setActionName(e.target.value)}
                placeholder="الاسم بالإنجليزي"
                required
                className="w-1/2 px-4 py-2.5 rounded-lg bg-wida-surface border border-wida-border text-white text-xs focus:outline-none focus:border-wida-primary"
              />
              <button type="submit" className="p-2.5 rounded-lg bg-wida-primary hover:bg-wida-secondary text-white transition-colors">
                <Plus size={16} />
              </button>
            </form>
          </div>
        </div>

        {/* Password change security block */}
        <div className="glass-card p-6 border border-wida-border max-w-xl">
          <div className="flex items-center gap-3 mb-6">
            <Lock className="text-wida-primary" size={20} />
            <h3 className="text-sm font-bold text-white">أمان الحساب وتغيير كلمة المرور</h3>
          </div>

          {passError && <p className="text-xs text-wida-danger mb-4">{passError}</p>}
          {passSuccess && <p className="text-xs text-wida-success mb-4">{passSuccess}</p>}

          <form onSubmit={handleChangePassword} className="space-y-4">
            <div>
              <label className="block text-xs text-wida-text-muted mb-2">كلمة المرور الحالية</label>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
                className="w-full px-4 py-2.5 rounded-lg bg-wida-surface border border-wida-border text-white text-xs focus:outline-none focus:border-wida-primary"
              />
            </div>
            <div>
              <label className="block text-xs text-wida-text-muted mb-2">كلمة المرور الجديدة</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                className="w-full px-4 py-2.5 rounded-lg bg-wida-surface border border-wida-border text-white text-xs focus:outline-none focus:border-wida-primary"
              />
            </div>
            <button type="submit" className="px-5 py-2.5 rounded-lg bg-wida-primary hover:bg-wida-secondary text-white text-xs font-bold transition-colors">
              حفظ كلمة المرور الجديدة
            </button>
          </form>
        </div>
      </div>
    </>
  );
}
