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
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-lg flex flex-col overflow-hidden shadow-2xl max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-zinc-800 bg-zinc-950/80">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-sky-950/80 border border-sky-800/80 rounded-xl text-sky-400">
              <Bot size={22} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-zinc-100 tracking-tight flex items-center gap-2">
                Telegram AI Bot
                <span className="text-[10px] bg-sky-950 border border-sky-800 text-sky-400 font-mono font-bold px-2 py-0.5 rounded-full uppercase">
                  Connected
                </span>
              </h2>
              <p className="text-xs text-zinc-400">Chat with VOID AI directly on Telegram</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 rounded-lg transition-colors cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 space-y-5 overflow-y-auto">
          {notice && (
            <div className={`p-3.5 rounded-xl border text-xs flex items-center justify-between font-mono ${
              notice.type === 'success' 
                ? 'bg-emerald-950/60 border-emerald-800 text-emerald-300' 
                : 'bg-red-950/60 border-red-800 text-red-300'
            }`}>
              <span>{notice.message}</span>
              <button onClick={() => setNotice(null)} className="text-zinc-400 hover:text-white cursor-pointer ml-2">
                <X size={14} />
              </button>
            </div>
          )}

          {/* Connection Status Card */}
          <div className="p-4 bg-zinc-950 border border-zinc-800 rounded-xl space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-xs font-bold text-zinc-200">Bot Connection Status:</span>
              </div>
              <button
                onClick={fetchStatus}
                disabled={loading}
                className="text-[11px] text-zinc-400 hover:text-sky-400 flex items-center gap-1 transition-colors cursor-pointer"
              >
                <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
                <span>Refresh</span>
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-2.5 bg-zinc-900 border border-zinc-800/80 rounded-lg">
                <span className="text-zinc-500 block text-[10px] font-mono uppercase">Bot Username</span>
                <span className="font-bold text-sky-400 font-mono">
                  {botUsername ? `@${botUsername}` : '8686494399 Bot'}
                </span>
              </div>
              <div className="p-2.5 bg-zinc-900 border border-zinc-800/80 rounded-lg">
                <span className="text-zinc-500 block text-[10px] font-mono uppercase">Token Configured</span>
                <span className="font-bold text-emerald-400 font-mono">
                  {status?.tokenMasked || '86864943...8SM'}
                </span>
              </div>
            </div>

            {telegramBotLink ? (
              <a
                href={telegramBotLink}
                target="_blank"
                rel="noreferrer"
                className="w-full py-2.5 px-4 bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs rounded-xl transition-all shadow flex items-center justify-center gap-2 cursor-pointer"
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
                className="w-full py-2.5 px-4 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <ExternalLink size={14} />
                <span>Open Telegram App</span>
              </a>
            )}
          </div>

          {/* Quick Telegram Bot User Guide */}
          <div className="p-4 bg-zinc-950/60 border border-zinc-800/80 rounded-xl space-y-2 text-xs">
            <h3 className="font-bold text-zinc-200 flex items-center gap-1.5">
              <Zap size={15} className="text-amber-400" />
              How Telegram Login & Authentication Works
            </h3>
            <ul className="text-zinc-400 space-y-1.5 list-disc list-inside text-[11px] leading-relaxed">
              <li>Message the bot on Telegram and send <code className="text-sky-300 font-mono bg-zinc-900 px-1 py-0.5 rounded">/login</code> to start account authentication.</li>
              <li>Provide your registered website <strong>email address</strong> when prompted.</li>
              <li>Enter your website account <strong>password</strong> to verify your identity securely.</li>
              <li>Or log in directly in one line: <code className="text-sky-300 font-mono bg-zinc-900 px-1 py-0.5 rounded">/login email@example.com password</code>.</li>
              <li>Once verified, all your Pro/Premium/VIP tier limits, saved history, and website settings apply automatically!</li>
              <li>Send <code className="text-sky-300 font-mono bg-zinc-900 px-1 py-0.5 rounded">/logout</code> anytime to end your Telegram session.</li>
            </ul>
          </div>

          {/* Test Message Tool */}
          <div className="p-4 bg-zinc-950 border border-zinc-800 rounded-xl space-y-3">
            <span className="text-xs font-bold text-zinc-200 flex items-center gap-1.5">
              <Send size={14} className="text-sky-400" />
              Test Message Sender
            </span>
            <div className="space-y-2">
              <input
                type="text"
                placeholder="Telegram Chat ID (e.g. 123456789)"
                value={testChatId}
                onChange={(e) => setTestChatId(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-800 text-zinc-200 text-xs rounded-lg px-3 py-2 font-mono focus:outline-none focus:border-sky-500"
              />
              <input
                type="text"
                placeholder="Custom test message (Optional)"
                value={testMessage}
                onChange={(e) => setTestMessage(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-800 text-zinc-200 text-xs rounded-lg px-3 py-2 focus:outline-none focus:border-sky-500"
              />
              <button
                onClick={handleSendTest}
                disabled={testSending || !testChatId.trim()}
                className="w-full py-2 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 text-zinc-200 font-bold text-xs rounded-lg transition-colors cursor-pointer flex items-center justify-center gap-1.5"
              >
                {testSending ? <RefreshCw size={12} className="animate-spin" /> : <Send size={12} />}
                <span>Send Test Telegram Message</span>
              </button>
            </div>
          </div>

          {/* Token Override Form - Admin Restricted */}
          <div className="p-4 bg-zinc-950 border border-zinc-800 rounded-xl space-y-3">
            <span className="text-xs font-bold text-zinc-200 flex items-center gap-1.5">
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
                  className="flex-1 bg-zinc-900 border border-zinc-800 text-zinc-200 text-xs rounded-lg px-3 py-2 font-mono focus:outline-none focus:border-emerald-500"
                />
                <button
                  onClick={handleUpdateToken}
                  disabled={updatingToken || !tokenInput.trim()}
                  className="px-4 py-2 bg-emerald-950 border border-emerald-800 hover:bg-emerald-900 text-emerald-200 font-mono font-bold text-xs rounded-lg transition-colors cursor-pointer shrink-0"
                >
                  {updatingToken ? 'Connecting...' : 'Update'}
                </button>
              </div>
            ) : (
              <div className="p-3 bg-red-950/40 border border-red-900/60 rounded-lg text-[11px] text-red-300 font-mono flex items-center justify-between">
                <span>🔒 Token modification locked to System Owner (@mrnovatech4)</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
