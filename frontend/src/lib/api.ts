const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

function getHeaders(): HeadersInit {
  const token = typeof window !== 'undefined' ? localStorage.getItem('wida_token') : null;
  return {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
  };
}

export async function apiRequest<T>(
  endpoint: string,
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET',
  body?: any
): Promise<T> {
  const url = `${BASE_URL}${endpoint}`;
  let response: Response;
  try {
    response = await fetch(url, {
      method,
      headers: getHeaders(),
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch (error: any) {
    console.error(`Network error when calling ${url}:`, error);
    throw new Error('تعذر الاتصال بالسيرفر. يرجى التأكد من تشغيل الباك إند (http://localhost:8000)');
  }

  if (response.status === 401) {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('wida_token');
      localStorage.removeItem('wida_username');
      window.location.href = '/login';
    }
    throw new Error('Authentication expired');
  }

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || 'حدث خطأ ما في الاتصال بالخادم');
  }

  return response.json();
}
