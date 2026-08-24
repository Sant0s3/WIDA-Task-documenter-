'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { apiRequest } from '@/lib/api';
import { Lock, User } from 'lucide-react';

export default function LoginPage() {
  const [usernameInput, setUsernameInput] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, isAuthenticated } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isAuthenticated) {
      router.push('/');
    }
  }, [isAuthenticated, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await apiRequest<{ access_token: string; username: string }>(
        '/api/auth/login',
        'POST',
        { username: usernameInput, password }
      );
      login(response.access_token, response.username);
    } catch (err: any) {
      setError(err.message || 'خطأ في تسجيل الدخول. يرجى التحقق من المدخلات.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-wida-bg flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-wida-primary/5 via-transparent to-transparent pointer-events-none"></div>

      <div className="w-full max-w-md glass-card p-8 border border-wida-border relative z-10">
        <div className="text-center mb-8">
          {/* Official WIDA PNG Logo */}
          <img 
            src="/WidaLOGO.png" 
            alt="WIDA Logo" 
            className="h-16 w-auto mx-auto mb-4 object-contain"
          />
          <h2 className="text-2xl font-bold text-wida-text">تسجيل الدخول</h2>
          <p className="text-sm text-wida-text-muted mt-2">بوابة المنسق - مدير القوى العاملة وايدا AI</p>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-lg bg-wida-danger/10 border border-wida-danger/20 text-wida-danger text-sm text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-xs font-semibold text-wida-text-muted mb-2">اسم المستخدم</label>
            <div className="relative">
              <span className="absolute inset-y-0 right-0 pr-3 flex items-center text-wida-text-muted">
                <User size={16} />
              </span>
              <input
                type="text"
                value={usernameInput}
                onChange={(e) => setUsernameInput(e.target.value)}
                required
                className="w-full pr-10 pl-4 py-3 rounded-lg bg-wida-surface border border-wida-border text-wida-text text-sm focus:outline-none focus:border-wida-primary transition-colors"
                placeholder="أدخل اسم المستخدم"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-wida-text-muted mb-2">كلمة المرور</label>
            <div className="relative">
              <span className="absolute inset-y-0 right-0 pr-3 flex items-center text-wida-text-muted">
                <Lock size={16} />
              </span>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full pr-10 pl-4 py-3 rounded-lg bg-wida-surface border border-wida-border text-wida-text text-sm focus:outline-none focus:border-wida-primary transition-colors"
                placeholder="••••••••"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 rounded-lg bg-wida-primary hover:bg-wida-secondary text-white font-bold text-sm transition-colors shadow-lg shadow-wida-primary/20 flex items-center justify-center gap-2"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <span>دخول</span>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
