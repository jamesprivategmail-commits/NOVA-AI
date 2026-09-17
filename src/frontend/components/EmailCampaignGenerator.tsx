import React, { useState } from 'react';
import { Mail, Sparkles, Copy, Check, Send, RefreshCw, Eye, Image as ImageIcon, Zap, AlertCircle, ArrowLeft } from 'lucide-react';
import { sendMessageToGemini } from '../../api/client';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface EmailCampaignGeneratorProps {
  onClose: () => void;
  onSendToChat?: (campaignText: string) => void;
}

export function EmailCampaignGenerator({ onClose, onSendToChat }: EmailCampaignGeneratorProps) {
  const [productPrompt, setProductPrompt] = useState('');
  const [audience, setAudience] = useState('');
  const [tone, setTone] = useState('High Energy & High Converting');
  const [campaignType, setCampaignType] = useState('Product Launch');
  
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedCampaign, setGeneratedCampaign] = useState<string | null>(null);
  const [copiedSection, setCopiedSection] = useState<string | null>(null);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!productPrompt.trim()) return;

    setIsGenerating(true);
    setGeneratedCampaign('');

    const prompt = `Generate a COMPLETE multi-stage email marketing campaign based on this request:

Product / Offer Details: ${productPrompt}
Target Audience: ${audience || 'General Customers'}
Tone of Voice: ${tone}
Campaign Type: ${campaignType}

Please structure the campaign strictly as follows:

# 🚀 VOID AI EMAIL MARKETING CAMPAIGN: ${campaignType.toUpperCase()}

## 🎯 5 HIGH-CONVERTING SUBJECT LINES
1. [Urgent & Curiosity Driven]
2. [Benefit-Focused]
3. [Short & Punchy]
4. [FOMO / High Open-Rate]
5. [Direct & Bold]

**Preview Text / Preheader:** (1 sentence snappy teaser)

---

## 🎨 CAMPAIGN HERO VISUAL CONCEPT
- **Visual Theme:** [Detailed visual design description]
- **Recommended Hero Banner Prompt:** [Image prompt for hero graphic]

---

## ✉️ PRIMARY EMAIL COPY

**Subject Line:** [Choose the top subject line]
**Preheader:** [Chosen preheader]

### Header Banner Text:
> [BOLD IMPACTFUL HEADING]

### Body Copy:
Dear [First Name],

[Hook - Grab immediate attention]

[Agitation / Problem Statement]

[Solution & Offer Highlights - bullet points]

[Call to Action Button text & link placement]

[Urgency & Scarcity closing]

Best regards,  
[Your Brand / Team]

---

## 🔁 FOLLOW-UP EMAIL SEQUENCE

### Follow-Up Email 1 (24 Hours Later) - Urgency Booster
**Subject Line:** [Follow up subject]
**Body Preview:** Short 2-paragraph reminder focusing on scarcity.

### Follow-Up Email 2 (48 Hours Later) - Final Call
**Subject Line:** [Final call subject]
**Body Preview:** High urgency final call notice.
`;

    try {
      let fullText = '';
      await sendMessageToGemini([{ role: 'user', text: prompt }], 'gemini', '', (chunk) => {
        fullText += chunk;
        setGeneratedCampaign(fullText);
      });
    } catch (err) {
      console.error("Campaign generation error", err);
      alert("Failed to generate email campaign. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSection(label);
    setTimeout(() => setCopiedSection(null), 2000);
  };

  return (
    <div className="fixed inset-0 bg-black/80  z-50 flex items-center justify-center p-4">
      <div className="bg-[#202022] border border-[#38383b] rounded-2xl w-full max-w-5xl h-[90vh] flex flex-col overflow-hidden shadow-2xl ">
        {/* Header */}
        <div className="flex items-center justify-between p-4 md:p-6 border-b border-[#38383b] bg-[#252527]/60">
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="p-2 text-[#8d8d91] hover:text-white hover:bg-[#38383b] rounded-lg transition-colors mr-1"
            >
              <ArrowLeft size={20} />
            </button>
            <div className="p-2 bg-[#3f86ff]/20 border border-[#3f86ff]/30 rounded-xl text-[#3f86ff]">
              <Mail size={22} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white tracking-wide flex items-center gap-2">
                Email Campaign Generator
                <span className="text-[10px] bg-[#3f86ff]/30 border border-[#3f86ff]/40 text-[#8d8d91] px-2 py-0.5 rounded-full font-bold">
                  VOID ENGINE
                </span>
              </h2>
              <p className="text-xs text-[#8d8d91]">Instant subject lines, email copy, visual ideas & follow-up sequences</p>
            </div>
          </div>
          {generatedCampaign && (
            <button
              onClick={() => handleCopy(generatedCampaign, 'all')}
              className="px-4 py-2 bg-[#38383b] hover:bg-[#454547] text-white text-xs font-semibold rounded-lg border border-[#38383b] flex items-center gap-1.5 transition-colors"
            >
              {copiedSection === 'all' ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
              {copiedSection === 'all' ? 'Copied Campaign!' : 'Copy Full Campaign'}
            </button>
          )}
        </div>

        {/* Content Body */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 overflow-hidden">
          {/* Controls Panel */}
          <div className="lg:col-span-4 border-r border-[#38383b] p-5 overflow-y-auto bg-[#252527]/30 space-y-5">
            <form onSubmit={handleGenerate} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-white uppercase tracking-wider mb-1">
                  Product / Offer Prompt *
                </label>
                <textarea
                  rows={4}
                  required
                  value={productPrompt}
                  onChange={(e) => setProductPrompt(e.target.value)}
                  placeholder="e.g. Launching VOID AI Pro Subscription with 30% off for early adopters. Mention speed, email automation, and 24/7 AI brain customization."
                  className="w-full bg-[#252527] border border-[#38383b] rounded-xl p-3 text-sm text-white placeholder-zinc-500 focus:border-[#3f86ff] outline-none transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-white uppercase tracking-wider mb-1">
                  Target Audience
                </label>
                <input
                  type="text"
                  value={audience}
                  onChange={(e) => setAudience(e.target.value)}
                  placeholder="e.g. Digital marketers, agency founders, creators"
                  className="w-full bg-[#252527] border border-[#38383b] rounded-xl p-2.5 text-sm text-white placeholder-zinc-500 focus:border-[#3f86ff] outline-none transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-white uppercase tracking-wider mb-1">
                  Campaign Type
                </label>
                <select
                  value={campaignType}
                  onChange={(e) => setCampaignType(e.target.value)}
                  className="w-full bg-[#252527] border border-[#38383b] rounded-xl p-2.5 text-sm text-white focus:border-[#3f86ff] outline-none"
                >
                  <option value="Product Launch">🚀 Product Launch</option>
                  <option value="Flash Sale / Discount">⚡ Flash Sale / Discount</option>
                  <option value="Welcome Sequence">👋 Welcome Sequence</option>
                  <option value="Re-engagement / Win Back">🔥 Re-engagement / Win Back</option>
                  <option value="Newsletter & Value Brief">📰 Newsletter & Value Brief</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-white uppercase tracking-wider mb-1">
                  Tone of Voice
                </label>
                <select
                  value={tone}
                  onChange={(e) => setTone(e.target.value)}
                  className="w-full bg-[#252527] border border-[#38383b] rounded-xl p-2.5 text-sm text-white focus:border-[#3f86ff] outline-none"
                >
                  <option value="High Energy & High Converting">⚡ High Energy & High Converting</option>
                  <option value="Bold & Dangerous (VOID Style)">🔴 Bold & Dangerous (VOID Style)</option>
                  <option value="Professional & Persuasive">💼 Professional & Persuasive</option>
                  <option value="Urgent & FOMO Heavy">⏳ Urgent & FOMO Heavy</option>
                  <option value="Casual & Conversational">💬 Casual & Conversational</option>
                </select>
              </div>

              <button
                type="submit"
                disabled={isGenerating || !productPrompt.trim()}
                className="w-full py-3 bg-[#3f86ff] hover:opacity-90 text-white font-bold rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg  disabled:opacity-50 mt-2"
              >
                {isGenerating ? (
                  <>
                    <RefreshCw size={18} className="animate-spin" />
                    <span>Generating Campaign...</span>
                  </>
                ) : (
                  <>
                    <Zap size={18} />
                    <span>Generate Campaign</span>
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Generated Result Preview Panel */}
          <div className="lg:col-span-8 p-6 overflow-y-auto bg-[#202022] space-y-4">
            {!generatedCampaign && !isGenerating ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-8 text-[#8d8d91] border border-dashed border-[#38383b] rounded-2xl">
                <div className="w-16 h-16 bg-[#3f86ff]/10 border border-[#3f86ff]/20 rounded-2xl flex items-center justify-center mb-4 text-[#3f86ff]">
                  <Mail size={32} />
                </div>
                <h3 className="text-lg font-bold text-white mb-1">No Campaign Generated Yet</h3>
                <p className="text-sm text-[#8d8d91] max-w-md mb-4">
                  Enter your offer details on the left and click "Generate Campaign" to produce high-converting email sequences.
                </p>
              </div>
            ) : (
              <div className="prose prose-invert max-w-none prose-p:leading-relaxed prose-pre:bg-[#252527] prose-pre:border prose-pre:border-[#38383b] prose-a:text-[#8d8d91]">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {generatedCampaign || ''}
                </ReactMarkdown>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
