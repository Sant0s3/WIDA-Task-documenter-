'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { apiRequest } from '@/lib/api';
import { AIParseResponse, DailyActivity } from '@/lib/types';
import { generateWidaPDF } from '@/lib/pdfReport';
import Header from '@/components/layout/Header';
import { 
  Send, 
  Mic, 
  MicOff, 
  Check, 
  X, 
  AlertCircle, 
  Trash2, 
  Sparkles, 
  User as UserIcon, 
  Smile,
  MessageCircle,
  FileCheck2,
  Sparkle,
  CheckCircle2,
  FileText
} from 'lucide-react';

export default function AssistantPage() {
  const { isAuthenticated, loading: authLoading, username } = useAuth();
  const router = useRouter();

  const [input, setInput] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('wida_chat_draft_input') || '';
    }
    return '';
  });

  const [messages, setMessages] = useState<{ role: 'user' | 'assistant'; text: string; parsed?: AIParseResponse }[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('wida_chat_messages');
      if (saved) {
        try { return JSON.parse(saved); } catch (e) { return []; }
      }
    }
    return [];
  });
  const [parsing, setParsing] = useState(false);
  const [recording, setRecording] = useState(false);
  
  // Pending confirmation state for AI extraction
  const [pendingConfirm, setPendingConfirm] = useState<AIParseResponse | null>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('wida_chat_pending_confirm');
      if (saved) {
        try { return JSON.parse(saved); } catch (e) { return null; }
      }
    }
    return null;
  });
  const [pendingSourceText, setPendingSourceText] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('wida_chat_pending_source_text') || '';
    }
    return '';
  });

  // Web Speech API
  const recognitionRef = useRef<any>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('wida_chat_messages', JSON.stringify(messages));
    }
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, parsing]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('wida_chat_draft_input', input);
    }
  }, [input]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      if (pendingConfirm) {
        localStorage.setItem('wida_chat_pending_confirm', JSON.stringify(pendingConfirm));
        localStorage.setItem('wida_chat_pending_source_text', pendingSourceText);
      } else {
        localStorage.removeItem('wida_chat_pending_confirm');
        localStorage.removeItem('wida_chat_pending_source_text');
      }
    }
  }, [pendingConfirm, pendingSourceText]);

  const clearChat = () => {
    setMessages([]);
    setPendingConfirm(null);
    setPendingSourceText('');
    setInput('');
    if (typeof window !== 'undefined') {
      localStorage.removeItem('wida_chat_messages');
      localStorage.removeItem('wida_chat_draft_input');
      localStorage.removeItem('wida_chat_pending_confirm');
      localStorage.removeItem('wida_chat_pending_source_text');
    }
  };

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, authLoading, router]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        const rec = new SpeechRecognition();
        rec.continuous = false;
        rec.lang = 'ar-SA';
        rec.interimResults = false;

        rec.onstart = () => setRecording(true);
        rec.onend = () => setRecording(false);
        rec.onresult = (event: any) => {
          const transcript = event.results[0][0].transcript;
          setInput(transcript);
        };
        recognitionRef.current = rec;
      }
    }
  }, []);

  const toggleRecording = () => {
    if (!recognitionRef.current) {
      alert('ميزة التعرف على الصوت غير مدعومة في متصفحك حالياً. يرجى استخدام متصفح Chrome.');
      return;
    }

    if (recording) {
      recognitionRef.current.stop();
    } else {
      recognitionRef.current.start();
    }
  };

  const submitText = async (textToSend: string) => {
    if (!textToSend.trim() || parsing) return;

    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: textToSend }]);
    setParsing(true);

    try {
      const parseResponse = await apiRequest<AIParseResponse>('/api/ai/parse', 'POST', { text: textToSend });
      if (parseResponse.activities && parseResponse.activities.length > 0) {
        setPendingConfirm(parseResponse);
        setPendingSourceText(textToSend);
      }
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        text: parseResponse.confirmation_message || 'أهلاً بك! أنا هنا لمساعدتك والتسجيل لك في أي وقت.',
        parsed: parseResponse
      }]);
    } catch (err: any) {
      setMessages(prev => [...prev, { role: 'assistant', text: err.message || 'معذرةً، حدث خطأ أثناء قراءة النص.' }]);
    } finally {
      setParsing(false);
    }
  };

  const handleSendText = (e: React.FormEvent) => {
    e.preventDefault();
    submitText(input);
  };

  const handleConfirmSave = async () => {
    if (!pendingConfirm) return;

    try {
      const activitiesToSave = pendingConfirm.activities.map(act => ({
        employee_id: act.employee_id,
        employee_name: act.employee_name,
        entity_type_id: act.entity_id,
        action_type_id: act.action_id,
        quantity: act.quantity,
        unit: act.unit || 'items',
        source_text: pendingSourceText
      }));

      await apiRequest('/api/activities/bulk', 'POST', { activities: activitiesToSave });
      setMessages(prev => [...prev, { role: 'assistant', text: 'تمت إضافتها بنجاح إلى سجل إنجازات الموظفين ولوحة التحكم! 👏' }]);
      setPendingConfirm(null);
      setPendingSourceText('');
    } catch (err: any) {
      alert(err.message || 'فشل حفظ الأنشطة');
    }
  };



  const handleExportPDF = async () => {
    try {
      const todayStr = new Date().toISOString().split('T')[0];
      const data = await apiRequest<DailyActivity[]>(`/api/activities?start_date=${todayStr}&limit=200`);
      generateWidaPDF(data, 'تقرير الإنجازات اليومي الرسمي — وايدا AI');
    } catch (err: any) {
      alert(err.message || 'فشل استخراج التقرير اليومي');
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-wida-bg flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-wida-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <>
      <Header title="مساعد توثيق الأعمال" />

      <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-11rem)] font-sans">
        {/* Soothing Light Mode Chat Container */}
        <div className="lg:col-span-2 flex flex-col justify-between overflow-hidden h-full bg-[#fcfbfe] rounded-3xl border border-[#e8dfef] shadow-xl shadow-purple-950/5 relative">
          
          {/* Light Warm Header */}
          <div className="px-6 py-4 border-b border-[#ece4f2] flex justify-between items-center bg-white/90 backdrop-blur-md">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#6e4fdc] to-[#9168ea] flex items-center justify-center text-white shadow-md shadow-purple-500/20">
                <Sparkles size={20} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-[#1f1235] flex items-center gap-2">
                  <span>مساعد توثيق الإنجازات</span>
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                </h3>
                <p className="text-[11px] text-[#716187] mt-0.5">صديقك اليومي لتسجيل أعمال الفريق بأسلوب مريح للعين</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleExportPDF}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-[#6e4fdc] to-[#805ad5] text-white hover:opacity-95 transition-all text-xs font-semibold shadow-sm cursor-pointer"
                title="تصدير تقرير اليوم بملف PDF"
              >
                <FileText size={13} />
                <span>تقرير اليوم (PDF)</span>
              </button>

              {messages.length > 0 && (
                <button
                  onClick={clearChat}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#f2ecf7] hover:bg-rose-50 border border-[#e2d7ed] text-[#6b5b82] hover:text-rose-600 transition-all text-xs font-medium cursor-pointer"
                >
                  <Trash2 size={13} />
                  <span>محادثة جديدة</span>
                </button>
              )}
            </div>
          </div>

          {/* Soothing Light Messages Stream */}
          <div className="p-6 overflow-y-auto space-y-6 flex-grow custom-scrollbar bg-[#faf9fd]">
            {messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-6 my-auto">
                <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-[#6e4fdc]/10 to-[#9168ea]/20 border border-[#6e4fdc]/20 flex items-center justify-center text-[#6e4fdc] shadow-lg shadow-purple-500/5">
                  <Smile size={32} />
                </div>

                <div className="space-y-2">
                  <h3 className="text-lg font-bold text-[#1f1235]">أهلاً بك، {username || 'أستاذ المنسق'} 👋</h3>
                  <p className="text-xs text-[#6e5d87] leading-relaxed max-w-md mx-auto">
                    اكتب إنجازات الفريق وسأقوم بتوثيقها فوراً في السجل.
                  </p>
                </div>
              </div>
            ) : (
              messages.map((msg, index) => (
                <div 
                  key={index} 
                  className={`flex items-start gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
                >
                  {/* Avatar Badge */}
                  <div className={`w-8 h-8 rounded-2xl flex items-center justify-center flex-shrink-0 text-xs font-bold shadow-md ${
                    msg.role === 'user' 
                      ? 'bg-gradient-to-tr from-[#6e4fdc] to-[#9168ea] text-white' 
                      : 'bg-white border border-[#e2d6ed] text-[#6e4fdc]'
                  }`}>
                    {msg.role === 'user' ? <UserIcon size={15} /> : <Sparkle size={15} />}
                  </div>

                  {/* Bubble */}
                  <div className={`max-w-xl p-4 rounded-2xl text-xs leading-relaxed shadow-sm ${
                    msg.role === 'user'
                      ? 'bg-gradient-to-r from-[#6e4fdc] to-[#805ad5] text-white rounded-tr-none font-medium shadow-purple-500/10'
                      : 'bg-white border border-[#e8dfef] text-[#2b1847] rounded-tl-none font-normal shadow-purple-950/5'
                  }`}>
                    <p className="whitespace-pre-line">{msg.text}</p>
                  </div>
                </div>
              ))
            )}

            {/* Parsing Loader */}
            {parsing && (
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-2xl bg-white border border-[#e2d6ed] text-[#6e4fdc] flex items-center justify-center flex-shrink-0">
                  <Sparkles size={15} className="animate-spin text-[#6e4fdc]" />
                </div>
                <div className="px-4 py-3 rounded-2xl bg-white border border-[#e8dfef] text-xs text-[#6e5d87] flex items-center gap-2 rounded-tl-none shadow-sm">
                  <span className="w-2 h-2 rounded-full bg-[#6e4fdc] animate-ping"></span>
                  <span className="mr-1 text-[#6e5d87] font-medium">جاري ترتيب الإنجازات والتعرف على الأسماء...</span>
                </div>
              </div>
            )}

            <div ref={chatEndRef} />
          </div>

          {/* Light Soothing Input Bar */}
          <div className="p-4 border-t border-[#ece4f2] bg-white backdrop-blur-md">
            <form onSubmit={handleSendText} className="relative flex items-center gap-2">
              <button
                type="button"
                onClick={toggleRecording}
                className={`p-3 rounded-2xl border transition-all ${
                  recording
                    ? 'bg-rose-50 border-rose-400 text-rose-600 animate-pulse'
                    : 'bg-[#f6f2fb] hover:bg-[#eee6f7] border-[#e2d7ed] text-[#63527a] hover:text-[#1f1235]'
                }`}
                title={recording ? 'إيقاف التسجيل' : 'التحدث صوتاً'}
              >
                {recording ? <MicOff size={16} /> : <Mic size={16} />}
              </button>
              
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                disabled={parsing}
                placeholder={recording ? 'جاري الاستماع إليك...' : 'اكتب إنجازات الفريق هنا...'}
                className="flex-grow px-4 py-3.5 rounded-2xl bg-[#faf8fd] border border-[#ded4eb] text-[#1f1235] text-xs placeholder:text-[#9080a8] focus:outline-none focus:border-[#6e4fdc] focus:ring-2 focus:ring-[#6e4fdc]/15 transition-all disabled:opacity-50 font-sans"
              />

              <button
                type="submit"
                disabled={parsing || !input.trim()}
                className="p-3.5 rounded-2xl bg-gradient-to-r from-[#6e4fdc] to-[#805ad5] hover:from-[#5d3ec9] hover:to-[#6f48c4] text-white shadow-md shadow-purple-500/20 transition-all disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
              >
                <Send size={16} className="transform rotate-180" />
              </button>
            </form>
          </div>
        </div>

        {/* Soothing Light Confirmation Side Panel */}
        <div className="glass-card p-6 flex flex-col justify-between h-full border border-[#e8dfef] bg-white rounded-3xl shadow-xl shadow-purple-950/5">
          <div>
            <div className="flex items-center justify-between mb-5 pb-4 border-b border-[#ece4f2]">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-gradient-to-r from-[#6e4fdc] to-[#805ad5] text-white shadow-sm">
                <FileCheck2 size={16} className="text-white" />
                <h3 className="text-xs font-bold text-white">بطاقة التثبيت في سجل الفريق</h3>
              </div>
              {pendingConfirm && (
                <span className="px-2.5 py-0.5 rounded-full bg-[#f2ebf9] border border-[#e2d5ee] text-[#6e4fdc] text-[10px] font-bold">
                  {pendingConfirm.activities.length} إنجازات
                </span>
              )}
            </div>

            {pendingConfirm ? (
              <div className="space-y-4 font-sans">
                {/* Source Input Box */}
                <div className="p-3.5 rounded-2xl bg-[#f8f5fc] border border-[#e8dfef]">
                  <span className="text-[10px] text-[#7d6c99] block font-medium">نص الإدخال:</span>
                  <p className="text-xs text-[#2b1847] mt-1 font-medium italic">"{pendingSourceText}"</p>
                </div>

                {/* Extracted Items */}
                <div className="space-y-2.5">
                  <span className="text-[11px] text-[#1f1235] font-bold block">العناصر الجاهزة للحفظ:</span>
                  {pendingConfirm.activities.map((act, idx) => {
                    const isFullyMapped = act.employee_id && act.entity_id && act.action_id;
                    return (
                      <div key={idx} className={`p-3.5 rounded-2xl border text-xs flex justify-between items-center transition-all shadow-sm ${
                        isFullyMapped 
                          ? 'bg-[#f0fdf4] border-emerald-300 text-[#166534]' 
                          : 'bg-[#fffbeb] border-amber-300 text-[#92400e]'
                      }`}>
                        <div>
                          <p className="font-bold text-[#1f1235] flex items-center gap-1.5">
                            <span>{act.employee_name}</span>
                            {!act.employee_id && <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-800 font-medium">اسم جديد</span>}
                          </p>
                          <p className="text-[#5e4e78] mt-1 text-[11px]">
                            {act.action} ← {act.entity}
                          </p>
                        </div>
                        <span className="font-extrabold text-[#6e4fdc] text-xs px-2.5 py-1 rounded-xl bg-[#f3ecfa] border border-[#e3d7ed]">
                          {act.unit === 'seconds' ? `${act.quantity} ثانية` : act.unit === 'minutes' ? `${act.quantity} دقيقة` : `x${act.quantity}`}
                        </span>
                      </div>
                    );
                  })}
                </div>

                {pendingConfirm.needs_confirmation && (
                  <div className="p-3.5 rounded-2xl bg-[#fffbeb] border border-amber-300 flex gap-2 text-xs text-[#92400e] items-start shadow-sm">
                    <AlertCircle size={15} className="mt-0.5 flex-shrink-0 text-amber-600" />
                    <p className="leading-relaxed font-medium">{pendingConfirm.confirmation_message}</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="py-14 text-center text-[#7a6b94] space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-[#f6f2fb] border border-[#e5daef] flex items-center justify-center mx-auto text-[#6e4fdc]">
                  <CheckCircle2 size={22} />
                </div>
                <p className="text-xs leading-relaxed max-w-xs mx-auto font-medium text-[#6e5d87]">
                  اكتب إنجازات الفريق في المحادثة وسيتم ترتيبها وتجهيزها هنا لتأكيد التوثيق.
                </p>
              </div>
            )}
          </div>

          {/* Action Footer */}
          {pendingConfirm && (
            <div className="grid grid-cols-2 gap-3 pt-4 border-t border-[#ece4f2]">
              <button
                onClick={() => { setPendingConfirm(null); setPendingSourceText(''); }}
                className="flex items-center justify-center gap-1.5 py-3 rounded-2xl bg-[#f3edf8] hover:bg-[#e9def2] border border-[#e2d5ee] text-[#5e4e78] hover:text-[#1f1235] text-xs font-semibold transition-all cursor-pointer"
              >
                <X size={14} />
                <span>إلغاء</span>
              </button>
              <button
                onClick={handleConfirmSave}
                disabled={pendingConfirm.needs_confirmation}
                className="flex items-center justify-center gap-1.5 py-3 rounded-2xl bg-gradient-to-r from-[#6e4fdc] to-[#805ad5] hover:from-[#5d3ec9] hover:to-[#6f48c4] text-white font-bold text-xs shadow-md shadow-purple-500/20 transition-all disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
              >
                <Check size={14} />
                <span>تأكيد وحفظ 👏</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
