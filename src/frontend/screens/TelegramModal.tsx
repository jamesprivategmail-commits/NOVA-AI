import React, { useState, useEffect } from 'react';
import { X, Bot, CheckCircle2, RefreshCw, Send, ExternalLink, ShieldCheck, Zap, Key } from 'lucide-react';

interface TelegramModalProps {
  onClose: () => void;
  isAdmin?: boolean;
  userEmail?: string;
}

export function TelegramModal({ onClose, isAdmin = true, userEmail = 'mrnovatech4@gmail.com' }: TelegramModalProps) {
  const isOwner = isAdmin || userEmail === 'mrnovatech4@gmail.com';
  const [status, setStatus] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [tokenInput, setTokenInput] = useState('');
  const [updatingToken, setUpdatingToken] = useState(false);
  const [testChatId, setTestChatId] = useState('');
  const [testMessage, setTestMessage] = useState('');
  const [testSending, setTestSending] = useState(false);
  const [notice, setNotice] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const fetchStatus = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/telegram/status');
      const data = await res.json();
      setStatus(data);
    } catch (err) {
      console.error('Failed to fetch Telegram status:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  const handleUpdateToken = async () => {
    if (!tokenInput.trim()) return;
    setUpdatingToken(true);
    setNotice(null);
    try {
      try {
        const { setDoc, doc } = await import('firebase/firestore');
        const { db } = await import('../../config/firebase');
        await setDoc(doc(db, "settings", "telegram"), {
          token: tokenInput.trim(),
          updatedAt: Date.now()
        }, { merge: true });
        await setDoc(doc(db, "settings", "apikeys"), {
          telegramBotToken: tokenInput.trim()
        }, { merge: true });
      } catch (_) {}

      const res = await fetch('/api/telegram/update-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: tokenInput.trim() })
      });
      const data = await res.json();
      if (data.success) {
        setNotice({ type: 'success', message: 'Telegram Bot token reconnected successfully!' });
        setTokenInput('');
        fetchStatus();
      } else {
        setNotice({ type: 'error', message: data.error || 'Failed to update token.' });
      }
    } catch (err: any) {
      setNotice({ type: 'error', message: err?.message || 'Server connection error.' });
    } finally {
      setUpdatingToken(false);
    }
  };

  const handleSendTest = async () => {
    if (!testChatId.trim()) return;
    setTestSending(true);
    setNotice(null);
    try {
      const res = await fetch('/api/telegram/send-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chatId: testChatId.trim(), message: testMessage.trim() || undefined })
      });
      const data = await res.json();
      if (data.success) {
        setNotice({ type: 'success', message: 'Test message sent to Telegram successfully! Check your Telegram chat.' });
        setTestMessage('');
      } else {
        setNotice({ type: 'error', message: data.error || 'Failed to send test message.' });
      }
    } catch (err: any) {
      setNotice({ type: 'error', message: err?.message || 'Network error.' });
    } finally {
      setTestSending(false);
    }
  };

  const botUsername = status?.botUsername;
  const telegramBotLink = botUsername ? `https://t.me/${botUsername}` : null;

  return (
    <div className="fixed inset-0 bg-black/80  z-50 flex items-center justify-center p-4">
      <div className="bg-[#1F1E1D] border border-[#3D3929] rounded-2xl w-full max-w-lg flex flex-col overflow-hidden shadow-2xl max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-[#3D3929] bg-[#1F1E1D]/80">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-sky-950/80 border border-sky-800/80 rounded-xl text-sky-400">
              <Bot size={22} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-[#1F1E1D] tracking-tight flex items-center gap-2">
                Telegram AI Bot
                <span className="text-[10px] bg-sky-950 border border-sky-800 text-sky-400 font-bold px-2 py-0.5 rounded-full uppercase">
                  Connected
                </span>
              </h2>
              <p className="text-xs text-[#6B6A67]">Chat with VOID AI directly on Telegram</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-[#6B6A67] hover:text-[#1F1E1D] hover:bg-[#3D3929] rounded-lg transition-colors cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 space-y-5 overflow-y-auto">
          {notice && (
            <div className={`p-3.5 rounded-xl border text-xs flex items-center justify-between ${
              notice.type === 'success' 
                ? 'bg-emerald-950/60 border-emerald-800 text-emerald-300' 
                : 'bg-[#1F1E1D] border-[#3D3929] text-[#E8E4D9]'
            }`}>
              <span>{notice.message}</span>
              <button onClick={() => setNotice(null)} className="text-[#6B6A67] hover:text-[#1F1E1D] cursor-pointer ml-2">
                <X size={14} />
              </button>
            </div>
          )}

          {/* Connection Status Card */}
          <div className="p-4 bg-[#1F1E1D] border border-[#3D3929] rounded-xl space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-xs font-bold text-[#1F1E1D]">Bot Connection Status:</span>
              </div>
              <button
                onClick={fetchStatus}
                disabled={loading}
                className="text-[11px] text-[#6B6A67] hover:text-sky-400 flex items-center gap-1 transition-colors cursor-pointer"
              >
                <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
                <span>Refresh</span>
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-2.5 bg-[#1F1E1D] border border-[#3D3929]/80 rounded-lg">
                <span className="text-[#6B6A67] block text-[10px] uppercase">Bot Username</span>
                <span className="font-bold text-sky-400 ">
                  {botUsername ? `@${botUsername}` : '8686494399 Bot'}
                </span>
              </div>
              <div className="p-2.5 bg-[#1F1E1D] border border-[#3D3929]/80 rounded-lg">
                <span className="text-[#6B6A67] block text-[10px] uppercase">Token Configured</span>
                <span className="font-bold text-emerald-400 ">
                  {status?.tokenMasked || '86864943...8SM'}
                </span>
              </div>
            </div>

            {telegramBotLink ? (
              <a
                href={telegramBotLink}
                target="_blank"
                rel="noreferrer"
                className="w-full py-2.5 px-4 bg-sky-600 hover:bg-sky-500 text-[#1F1E1D] font-bold text-xs rounded-xl transition-all shadow flex items-center justify-center gap-2 cursor-pointer"
              >
                <Send size={15} />
                <span>Open Bot on Telegram (@{botUsername})</span>
                <ExternalLink size={13} className="opacity-80" />
              </a>
            ) : (
              <a
                href="https://t.me/BotFather"
                target="_blank"
                rel="noreferrer"
                className="w-full py-2.5 px-4 bg-[#3D3929] hover:bg-[#F0EEE5] text-[#1F1E1D] font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <ExternalLink size={14} />
                <span>Open Telegram App</span>
              </a>
            )}
          </div>

          {/* Quick Telegram Bot User Guide */}
          <div className="p-4 bg-[#1F1E1D]/60 border border-[#3D3929]/80 rounded-xl space-y-2 text-xs">
            <h3 className="font-bold text-[#1F1E1D] flex items-center gap-1.5">
              <Zap size={15} className="text-amber-400" />
              How Telegram Login & Authentication Works
            </h3>
            <ul className="text-[#6B6A67] space-y-1.5 list-disc list-inside text-[11px] leading-relaxed">
              <li>Message the bot on Telegram and send <code className="text-sky-300 bg-[#1F1E1D] px-1 py-0.5 rounded">/login</code> to start account authentication.</li>
              <li>Provide your registered website <strong>email address</strong> when prompted.</li>
              <li>Enter your website account <strong>password</strong> to verify your identity securely.</li>
              <li>Or log in directly in one line: <code className="text-sky-300 bg-[#1F1E1D] px-1 py-0.5 rounded">/login email@example.com password</code>.</li>
              <li>Once verified, all your Pro/Premium/VIP tier limits, saved history, and website settings apply automatically!</li>
              <li>Send <code className="text-sky-300 bg-[#1F1E1D] px-1 py-0.5 rounded">/logout</code> anytime to end your Telegram session.</li>
            </ul>
          </div>

          {/* Test Message Tool */}
          <div className="p-4 bg-[#1F1E1D] border border-[#3D3929] rounded-xl space-y-3">
            <span className="text-xs font-bold text-[#1F1E1D] flex items-center gap-1.5">
              <Send size={14} className="text-sky-400" />
              Test Message Sender
            </span>
            <div className="space-y-2">
              <input
                type="text"
                placeholder="Telegram Chat ID (e.g. 123456789)"
                value={testChatId}
                onChange={(e) => setTestChatId(e.target.value)}
                className="w-full bg-[#1F1E1D] border border-[#3D3929] text-white text-xs rounded-lg px-3 py-2 focus:outline-none focus:border-sky-500"
              />
              <input
                type="text"
                placeholder="Custom test message (Optional)"
                value={testMessage}
                onChange={(e) => setTestMessage(e.target.value)}
                className="w-full bg-[#1F1E1D] border border-[#3D3929] text-white text-xs rounded-lg px-3 py-2 focus:outline-none focus:border-sky-500"
              />
              <button
                onClick={handleSendTest}
                disabled={testSending || !testChatId.trim()}
                className="w-full py-2 bg-[#3D3929] hover:bg-[#F0EEE5] disabled:opacity-50 text-[#1F1E1D] font-bold text-xs rounded-lg transition-colors cursor-pointer flex items-center justify-center gap-1.5"
              >
                {testSending ? <RefreshCw size={12} className="animate-spin" /> : <Send size={12} />}
                <span>Send Test Telegram Message</span>
              </button>
            </div>
          </div>

          {/* Token Override Form - Admin Restricted */}
          <div className="p-4 bg-[#1F1E1D] border border-[#3D3929] rounded-xl space-y-3">
            <span className="text-xs font-bold text-[#1F1E1D] flex items-center gap-1.5">
              <Key size={14} className="text-emerald-400" />
              Update Bot Token (Admin Only)
            </span>
            {isOwner ? (
              <div className="flex gap-2">
                <input
                  type="password"
                  placeholder="New Bot Token (8686494399:AA...)"
                  value={tokenInput}
                  onChange={(e) => setTokenInput(e.target.value)}
                  className="flex-1 bg-[#1F1E1D] border border-[#3D3929] text-white text-xs rounded-lg px-3 py-2 focus:outline-none focus:border-emerald-500"
                />
                <button
                  onClick={handleUpdateToken}
                  disabled={updatingToken || !tokenInput.trim()}
                  className="px-4 py-2 bg-emerald-950 border border-emerald-800 hover:bg-emerald-900 text-emerald-200 font-bold text-xs rounded-lg transition-colors cursor-pointer shrink-0"
                >
                  {updatingToken ? 'Connecting...' : 'Update'}
                </button>
              </div>
            ) : (
              <div className="p-3 bg-[#1F1E1D]/40 border border-[#3D3929] rounded-lg text-[11px] text-[#E8E4D9] flex items-center justify-between">
                <span>🔒 Token modification locked to System Owner (@mrnovatech4)</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
