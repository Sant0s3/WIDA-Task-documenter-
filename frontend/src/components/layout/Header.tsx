'use client';

import { useAuth } from '@/hooks/useAuth';
import { Bell, Calendar } from 'lucide-react';

export default function Header({ title }: { title: string }) {
  const { username } = useAuth();
  const today = new Date().toLocaleDateString('ar-SA', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <header className="h-16 border-b border-wida-border flex items-center justify-between px-8 bg-wida-bg/50 backdrop-blur-md sticky top-0 z-10">
      <div>
        <h2 className="text-xl font-bold text-wida-text">{title}</h2>
      </div>

      <div className="flex items-center gap-6">
        <div className="hidden md:flex items-center gap-2 text-xs text-wida-text-muted">
          <Calendar size={14} className="text-wida-secondary" />
          <span>{today}</span>
        </div>

        <div className="flex items-center gap-3">
          <button className="p-2 rounded-lg bg-wida-surface hover:bg-wida-surface-hover text-wida-text-muted hover:text-wida-primary transition-colors border border-wida-border">
            <Bell size={16} />
          </button>
        </div>
      </div>
    </header>
  );
}
