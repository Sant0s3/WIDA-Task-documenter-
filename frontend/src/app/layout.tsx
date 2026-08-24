'use client';

import { AuthProvider, useAuth } from '@/hooks/useAuth';
import Sidebar from '@/components/layout/Sidebar';
import { usePathname } from 'next/navigation';
import '@/app/globals.css';

function MainLayout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, loading } = useAuth();
  const pathname = usePathname();

  const isLoginPage = pathname === '/login';

  if (loading) {
    return (
      <div className="min-h-screen bg-wida-bg flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-wida-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (isLoginPage) {
    return <>{children}</>;
  }

  if (!isAuthenticated) {
    // If not authenticated, let the login page router push or trigger client side redirect
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-wida-bg text-wida-text flex">
      <Sidebar />
      <div className="flex-1 ml-64 min-h-screen flex flex-col">
        <main className="flex-grow p-8">
          {children}
        </main>
      </div>
    </div>
  );
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ar" dir="rtl">
      <head>
        <title>WIDA</title>
        <meta name="description" content="وايدا AI - نظام تسجيل الإنجازات والإنتاجية اليومية" />
        <link rel="icon" href="/WidaLOGO.png" sizes="any" />
        <link rel="shortcut icon" href="/WidaLOGO.png" />
        <link rel="apple-touch-icon" href="/WidaLOGO.png" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Alexandria:wght@300;400;500;600;700;800&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Readex+Pro:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
      </head>
      <body>
        <AuthProvider>
          <MainLayout>{children}</MainLayout>
        </AuthProvider>
      </body>
    </html>
  );
}
