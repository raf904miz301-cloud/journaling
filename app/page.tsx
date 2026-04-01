'use client';

import { useState, useEffect, useCallback } from 'react';

type Step = 1 | 2 | 3 | 4 | 5 | 6;

interface AIResponse {
  acknowledgment: string;
  deepDive: string;
  suggestions: string[];
  inviteText: string;
}

interface SummaryData {
  facts: string;
  firstEmotion: string;
  emotionChange: string;
  encouragement: string;
}

interface StepData {
  aiResponse: AIResponse | null;
  selectedSuggestion: string;
  freeText: string;
}

const STORAGE_KEY = 'journaling_usage_v1';
const MAX_DAILY = 3;
const INSTAGRAM_ID = 'studio_mizuki';

function getTodayJST(): string {
  return new Date().toLocaleDateString('ja-JP', { timeZone: 'Asia/Tokyo' });
}

function getUsageCount(): number {
  if (typeof window === 'undefined') return 0;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return 0;
    const data = JSON.parse(raw);
    return data.date === getTodayJST() ? (data.count || 0) : 0;
  } catch { return 0; }
}

function incrementUsage(): void {
  try {
    const today = getTodayJST();
    const raw = localStorage.getItem(STORAGE_KEY);
    const data = raw ? JSON.parse(raw) : {};
    const count = data.date === today ? (data.count || 0) + 1 : 1;
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ count, date: today }));
  } catch {}
}

function LoadingDots() {
  return (
    <div style={{ display: 'flex', gap: 8, justifyContent: 'center', padding: '16px 0' }}>
      {[0, 1, 2].map(i => (
        <div key={i} style={{
          width: 10, height: 10, borderRadius: '50%',
          background: i === 0 ? '#d4847a' : i === 1 ? '#c9a96e' : '#8ba888',
          animation: 'dotBounce 1.2s ease infinite',
          animationDelay: `${i * 0.2}s`,
        }} />
      ))}
    </div>
  );
}

function AIMessage({ text }: { text: string }) {
  return (
    <div style={{
      background: 'linear-gradient(135deg, #f5e6e0 0%, #fef3ef 100%)',
      borderRadius: 20, padding: '24px 28px', marginBottom: 24,
      border: '1px solid rgba(212,132,122,0.2)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
        <div style={{
          width: 32, height: 32,
          background: 'linear-gradient(135deg, #d4847a, #c9a96e)',
          borderRadius: '50%', display: 'flex', alignItems: 'center',
          justifyContent: 'center', fontSize: '0.9rem',
        }}>🌸</div>
        <span style={{ fontSize: '0.75rem', color: '#b85c52', letterSpacing: '0.1em', fontWeight: 500 }}>
          あなたのガイド
        </span>
      </div>
      <div style={{ fontSize: '0.95rem', lineHeight: 1.9, color: '#2c2520', whiteSpace: 'pre-wrap', fontFamily: "'Shippori Mincho', serif" }}>
        {text}
      </div>
    </div>
  );
}

function SuggestionBtn({ text, selected, onClick }: { text: string; selected: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} style={{
      background: selected ? 'linear-gradient(135deg, #f5e6e0, #fff0eb)' : '#fffef9',
      border: `1.5px solid ${selected ? '#d4847a' : '#e8d5b0'}`,
      borderRadius: 14, padding: '14px 20px',
      fontFamily: "'Shippori Mincho', serif",
      fontSize: '0.95rem', color: selected ? '#b85c52' : '#5a4f4a',
      cursor: 'pointer', textAlign: 'left', width: '100%',
      lineHeight: 1.7, transition: 'all 0.25s ease', marginBottom: 10,
    }}>
      {selected ? '✓ ' : ''}{text}
    </button>
  );
}

function LimitModal({ onClose }: { onClose: () => void }) {
  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, background: 'rgba(44,37,32,0.55)',
      backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center',
      justifyContent: 'center', zIndex: 100, padding: 20,
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        background: '#fffef9', borderRadius: 28, padding: '44px 36px',
        maxWidth: 400, width: '100%', textAlign: 'center',
        boxShadow: '0 20px 60px rgba(44,37,32,0.2)',
      }}>
        <div style={{ fontSize: '2.5rem', marginBottom: 16 }}>🌙</div>
        <h2 style={{ fontFamily: "'Shippori Mincho', serif", fontSize: '1.2rem', color: '#2c2520', marginBottom: 16 }}>
          今日の3回が終わりました
        </h2>
        <p style={{ fontFamily: "'Shippori Mincho', serif", fontSize: '0.95rem', color: '#5a4f4a', lineHeight: 2, marginBottom: 28 }}>
          もっと深堀りしたい方は、<br />
          <strong>スタジオミヅキにDM</strong>ください 🌸<br /><br />
          毎朝0時にリセットされます 🌅
        </p>
        <a href={`https://www.instagram.com/${INSTAGRAM_ID}/`} target="_blank" rel="noopener noreferrer" style={{
          display: 'inline-block',
          background: 'linear-gradient(135deg, #833ab4, #fd1d1d, #fcb045)',
          color: 'white', textDecoration: 'none', borderRadius: 14, padding: '14px 32px',
          fontSize: '0.875rem', marginBottom: 16,
          fontFamily: "'Shippori Mincho', serif",
        }}>📩 スタジオミヅキにDMを送る</a>
        <br />
        <button onClick={onClose} style={{ background: 'transparent', border: 'none', fontSize: '0.8rem', color: '#8a7e79', cursor: 'pointer', marginTop: 8, fontFamily: "'Shippori Mincho', serif" }}>閉じる</button>
      </div>
    </div>
  );
}

const STEP_LABELS: Record<Step, string> = {
  1: '気持ちを書く', 2: '深掘り①', 3: '深掘り②', 4: '深掘り③', 5: '前向きに', 6: 'まとめ',
};

export default function JournalingApp() {
  const [step, setStep] = useState<Step>(1);
  const [feelings, setFeelings] = useState<string[]>(['', '', '', '', '']);
  const [stepData, setStepData] = useState<Record<number, StepData>>({});
  const [loading, setLoading] = useState(false);
  const [waitMessage, setWaitMessage] = useState(false);
  const [summary, setSummary] = useState<SummaryData | null>(null);
  const [usageCount, setUsageCount] = useState(0);
  const [showLimitModal, setShowLimitModal] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const [conversationHistory, setConversationHistory] = useState<{role: string; content: string}[]>([]);

  useEffect(() => { setUsageCount(getUsageCount()); }, []);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [step]);

  const callAI = useCallback(async (userMessage: string, currentStep: number) => {
    setLoading(true);
    setWaitMessage(false);
    const waitTimer = setTimeout(() => setWaitMessage(true), 20000);
    try {
      const newHistory = [...conversationHistory, { role: 'user', content: userMessage }];
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: newHistory, step: currentStep, userInputs: feelings.filter(f => f.trim()) }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setConversationHistory([...newHistory, { role: 'assistant', content: JSON.stringify(data.result) }]);
      return data.result;
    } catch (e) { console.error(e); return null; }
    finally {
      setLoading(false);
      clearTimeout(waitTimer);
      setWaitMessage(false);
    }
  }, [conversationHistory, feelings]);

  const handleStep1Submit = async () => {
    const filled = feelings.filter(f => f.trim());
    if (filled.length < 3) return;
    const current = getUsageCount();
    if (current >= MAX_DAILY) { setShowLimitModal(true); return; }
    incrementUsage();
    setUsageCount(current + 1);
    setHasStarted(true);
    const userMessage = `今日の気持ちや出来事を5つ書きました：\n${feelings.map((f, i) => `${i + 1}. ${f}`).join('\n')}`;
    const result = await callAI(userMessage, 2);
    if (result) {
      setStepData(prev => ({ ...prev, 2: { aiResponse: result, selectedSuggestion: '', freeText: '' } }));
      setStep(2);
    }
  };

  const handleStepSubmit = async (currentStep: 2 | 3 | 4 | 5) => {
    const data = stepData[currentStep];
    if (!data) return;
    const answer = data.freeText.trim() || data.selectedSuggestion;
    if (!answer) return;
    if (currentStep === 5) {
      const result = await callAI(answer + '\n\n以上を踏まえてSTEP6のまとめを生成してください。', 6);
      if (result?.summary) { setSummary(result.summary); setStep(6); }
    } else {
      const nextStep = (currentStep + 1) as Step;
      const result = await callAI(answer, nextStep);
      if (result) {
        setStepData(prev => ({ ...prev, [nextStep]: { aiResponse: result, selectedSuggestion: '', freeText: '' } }));
        setStep(nextStep);
      }
    }
  };

  const updateStepField = (s: number, field: 'selectedSuggestion' | 'freeText', value: string) => {
    setStepData(prev => ({ ...prev, [s]: { ...prev[s], [field]: value } }));
  };

  const restartApp = () => {
    const current = getUsageCount();
    if (current >= MAX_DAILY) { setShowLimitModal(true); return; }
    setStep(1); setFeelings(['', '', '', '', '']); setStepData({});
    setSummary(null); setHasStarted(false); setConversationHistory([]);
    setUsageCount(current);
  };

  const remaining = MAX_DAILY - usageCount;

  const primaryBtn = (enabled: boolean, isLoading?: boolean): React.CSSProperties => ({
    width: '100%',
    background: isLoading
      ? 'linear-gradient(135deg, #c9a96e, #b8924a)'
      : enabled ? 'linear-gradient(135deg, #d4847a, #b85c52)' : '#e8d5b0',
    color: 'white', border: 'none', borderRadius: 16,
    padding: '16px 32px',
    fontFamily: "'Shippori Mincho', serif",
    fontSize: '1rem', letterSpacing: '0.1em',
    cursor: enabled && !isLoading ? 'pointer' : 'not-allowed',
    transition: 'all 0.3s ease',
    boxShadow: enabled ? '0 4px 20px rgba(184,92,82,0.25)' : 'none',
    opacity: isLoading ? 0.85 : 1,
  });

  return (
    <>
      <style>{`
        @keyframes cardIn { from { opacity:0; transform:translateY(16px); } to { opacity:1; transform:translateY(0); } }
        @keyframes dotBounce { 0%,80%,100% { transform:scale(0.7); opacity:0.5; } 40% { transform:scale(1); opacity:1; } }
        * { box-sizing:border-box; margin:0; padding:0; }
        body {
          font-family:'Shippori Mincho', serif;
          background-color:#faf7f2; color:#2c2520; min-height:100vh;
          background-image:
            radial-gradient(ellipse at 20% 50%,rgba(212,132,122,0.06) 0%,transparent 60%),
            radial-gradient(ellipse at 80% 20%,rgba(139,168,136,0.06) 0%,transparent 50%);
          background-attachment:fixed;
        }
        textarea, input { font-family:'Shippori Mincho', serif; }
        textarea:focus, input:focus { outline:none; }
        ::-webkit-scrollbar { width:6px; }
        ::-webkit-scrollbar-thumb { background:#e8d5b0; border-radius:3px; }
        .app-inner { max-width:660px; margin:0 auto; padding:0 20px; min-height:100vh; }
        .app-card { background:#fffef9; border-radius:24px; padding:36px; box-shadow:0 4px 32px rgba(44,37,32,0.07); border:1px solid rgba(255,255,255,0.8); margin-bottom:20px; position:relative; overflow:hidden; animation:cardIn 0.5s ease forwards; }

        /* ①キーボードが出ても上にスクロールできるよう下部に余白 */
        .app-inner { padding-bottom: 200px; }

        @media (max-width: 480px) {
          .app-inner { padding: 0 8px 200px !important; }
          .app-card { padding: 20px 14px !important; border-radius: 16px !important; }
        }
      `}</style>

      {showLimitModal && <LimitModal onClose={() => setShowLimitModal(false)} />}

      <div className="app-inner">
        <header style={{ textAlign: 'center', padding: '52px 0 36px' }}>
          <h1 style={{ fontFamily: "'Shippori Mincho',serif", fontSize: 'clamp(1.4rem,5vw,1.85rem)', color: '#2c2520', letterSpacing: '0.14em', lineHeight: 1.5, fontWeight: 600 }}>
            私を好きになる<br />ジャーナリング
          </h1>
          <p style={{ fontFamily: "'Shippori Mincho',serif", fontSize: '0.75rem', color: '#8a7e79', letterSpacing: '0.2em', marginTop: 10 }}>— 自分の気持ちに、やさしく寄り添う —</p>
          <div style={{ width: 60, height: 1, background: 'linear-gradient(90deg,transparent,#c9a96e,transparent)', margin: '20px auto 0' }} />
        </header>

        {!hasStarted && (
          <div style={{ textAlign: 'center', marginBottom: 28 }}>
            <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginBottom: 8 }}>
              {[...Array(MAX_DAILY)].map((_, i) => (
                <div key={i} style={{ width: 10, height: 10, borderRadius: '50%', background: i < usageCount ? '#d4847a' : '#e8d5b0' }} />
              ))}
            </div>
            <p style={{ fontFamily: "'Shippori Mincho',serif", fontSize: '0.8rem', color: '#8a7e79' }}>
              {remaining > 0 ? `本日あと ${remaining} 回利用できます` : '本日の利用回数に達しました（毎朝0時リセット）'}
            </p>
          </div>
        )}

        {hasStarted && (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 6, marginBottom: 28 }}>
            {([1,2,3,4,5,6] as Step[]).map(s => (
              <div key={s} style={{ width: s===step?28:9, height:9, borderRadius: s===step?5:'50%', background: s<step?'#8ba888':s===step?'#c9a96e':'#e8d5b0', transition:'all 0.4s ease' }} />
            ))}
            <span style={{ fontFamily: "'Shippori Mincho',serif", fontSize: '0.8rem', color: '#8a7e79', marginLeft: 8 }}>{STEP_LABELS[step]}</span>
          </div>
        )}

        {/* STEP 1 */}
        {step === 1 && (
          <div className="app-card">
            <div style={{ position:'absolute', top:0, left:0, right:0, height:3, background:'linear-gradient(90deg,#d4847a,#c9a96e,#8ba888)', opacity:0.6 }} />
            <p style={{ fontFamily: "'Shippori Mincho',serif", fontSize:'1rem', lineHeight:2, color:'#5a4f4a', marginBottom:28 }}>
              今日の気持ち、出来事、もやもやしていること…<br />思いつくままに、5つ書いてみてください。
            </p>
            <div style={{ display:'flex', flexDirection:'column', gap:16, marginBottom:28 }}>
              {feelings.map((f,i) => (
                <div key={i} style={{ display:'flex', alignItems:'flex-start', gap:10 }}>
                  <div style={{ width:28, height:28, borderRadius:'50%', background:'linear-gradient(135deg,#d4847a,#c9a96e)', color:'white', fontSize:'0.75rem', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, fontWeight:500, marginTop:4 }}>{i+1}</div>
                  {/* ③ textareaに変更→自動で折り返し・確認できる */}
                  <textarea
                    value={f}
                    onChange={e => { const next=[...feelings]; next[i]=e.target.value; setFeelings(next); }}
                    placeholder={['例：仕事でミスをして落ち込んでいる','例：なんとなく気力がわかない','例：友人に言われた一言が気になっている','例：最近よく眠れない','例：自分に自信がない'][i]}
                    rows={2}
                    style={{
                      flex:1, background:'#faf7f2', border:'1.5px solid #e8d5b0', borderRadius:12,
                      padding:'12px 14px', fontSize:'1rem', color:'#2c2520',
                      transition:'all 0.3s ease', minWidth:0,
                      fontFamily:"'Shippori Mincho', serif",
                      resize:'none', lineHeight:1.7,
                      overflowY:'hidden',
                    }}
                    onFocus={e => { e.target.style.borderColor='#c9a96e'; e.target.style.background='#fffef9'; e.target.style.boxShadow='0 0 0 3px rgba(201,169,110,0.12)'; }}
                    onBlur={e => { e.target.style.borderColor='#e8d5b0'; e.target.style.background='#faf7f2'; e.target.style.boxShadow='none'; }}
                    onInput={e => {
                      const t = e.target as HTMLTextAreaElement;
                      t.style.height = 'auto';
                      t.style.height = t.scrollHeight + 'px';
                    }}
                  />
                </div>
              ))}
            </div>
            <button onClick={handleStep1Submit}
              disabled={feelings.filter(f=>f.trim()).length<3||loading||remaining<=0}
              style={primaryBtn(feelings.filter(f=>f.trim()).length>=3&&remaining>0, loading)}>
              {loading ? '送信中…' : remaining<=0 ? '本日の利用回数に達しました' : '気持ちを送る →'}
            </button>
            {loading && (
              <div style={{ marginTop: 12 }}>
                <LoadingDots />
                {waitMessage && <p style={{ textAlign:'center', fontSize:'0.85rem', color:'#8a7e79', marginTop:8, fontFamily:"'Shippori Mincho',serif" }}>少々お待ちください、丁寧に考えています… 🌸</p>}
              </div>
            )}
          </div>
        )}

        {/* STEP 2〜5 */}
        {([2,3,4,5] as const).map(s => {
          if (step!==s) return null;
          const data=stepData[s];
          if (!data?.aiResponse) return null;
          const ai=data.aiResponse;
          const canSubmit = !!(data.selectedSuggestion || data.freeText.trim());
          return (
            <div key={s} className="app-card">
              <div style={{ position:'absolute', top:0, left:0, right:0, height:3, background:'linear-gradient(90deg,#d4847a,#c9a96e,#8ba888)', opacity:0.6 }} />
              <AIMessage text={ai.acknowledgment} />
              {ai.deepDive && (
                <div style={{ padding:'16px 20px', marginBottom:24, background:'rgba(201,169,110,0.08)', borderRadius:14, borderLeft:'3px solid #c9a96e' }}>
                  <p style={{ fontFamily:"'Shippori Mincho',serif", fontSize:'0.95rem', lineHeight:1.9, color:'#5a4f4a' }}>{ai.deepDive}</p>
                </div>
              )}
              <div style={{ fontFamily:"'Shippori Mincho',serif", fontSize:'0.75rem', letterSpacing:'0.2em', color:'#8a7e79', marginBottom:16, display:'flex', alignItems:'center', gap:8 }}>
                {s===5?'前向きな気持ちになるために':'次のステップとして、どれが気になりますか？'}
                <div style={{ flex:1, height:1, background:'linear-gradient(90deg,#e8d5b0,transparent)' }} />
              </div>
              <div style={{ marginBottom:20 }}>
                {ai.suggestions.map((sug,i) => <SuggestionBtn key={i} text={sug} selected={data.selectedSuggestion===sug} onClick={()=>updateStepField(s,'selectedSuggestion',sug)} />)}
              </div>
              <p style={{ fontFamily:"'Shippori Mincho',serif", fontSize:'0.85rem', color:'#8a7e79', marginBottom:10 }}>{ai.inviteText||'自由に書いてもOKです'}</p>
              <textarea value={data.freeText} onChange={e=>updateStepField(s,'freeText',e.target.value)}
                placeholder="自由に書いてみてください…" rows={3}
                style={{ width:'100%', background:'#faf7f2', border:'1.5px solid #e8d5b0', borderRadius:16, padding:'16px 20px', fontSize:'1rem', color:'#2c2520', resize:'vertical', lineHeight:1.8, transition:'all 0.3s ease', marginBottom:20, fontFamily:"'Shippori Mincho',serif" }}
                onFocus={e=>{e.target.style.borderColor='#c9a96e';e.target.style.background='#fffef9';e.target.style.boxShadow='0 0 0 3px rgba(201,169,110,0.12)';}}
                onBlur={e=>{e.target.style.borderColor='#e8d5b0';e.target.style.background='#faf7f2';e.target.style.boxShadow='none';}}
              />
              <button onClick={()=>handleStepSubmit(s)} disabled={!canSubmit||loading}
                style={primaryBtn(canSubmit, loading)}>
                {loading ? '考えています…' : s===5?'まとめを見る ✨':'次へ進む →'}
              </button>
              {loading && (
                <div style={{ marginTop: 12 }}>
                  <LoadingDots />
                  {waitMessage && <p style={{ textAlign:'center', fontFamily:"'Shippori Mincho',serif", fontSize:'0.85rem', color:'#8a7e79', marginTop:8 }}>少々お待ちください、丁寧に考えています… 🌸</p>}
                </div>
              )}
            </div>
          );
        })}

        {/* STEP 6 */}
        {step===6&&summary&&(
          <div style={{ animation:'cardIn 0.6s ease forwards' }}>
            <div style={{ background:'linear-gradient(135deg,#fffbf5 0%,#faf7ff 100%)', borderRadius:24, padding:'40px 36px', border:'1px solid #e8d5b0', boxShadow:'0 4px 32px rgba(44,37,32,0.07)', marginBottom:20 }}>
              <h2 style={{ fontFamily:"'Shippori Mincho',serif", fontSize:'1.1rem', color:'#2c2520', letterSpacing:'0.12em', marginBottom:28, textAlign:'center' }}>✨ 本日のまとめ</h2>
              {[{label:'今日の出来事・事実',text:summary.facts,emoji:'📝'},{label:'最初の気持ち',text:summary.firstEmotion,emoji:'💭'},{label:'感情の変化',text:summary.emotionChange,emoji:'🌱'}].map((item,i)=>(
                <div key={i} style={{ marginBottom:24, paddingBottom:24, borderBottom:'1px solid #e8d5b0' }}>
                  <div style={{ fontFamily:"'Shippori Mincho',serif", fontSize:'0.7rem', letterSpacing:'0.28em', color:'#c9a96e', marginBottom:8, fontWeight:500 }}>{item.emoji} {item.label}</div>
                  <p style={{ fontFamily:"'Shippori Mincho',serif", fontSize:'0.95rem', lineHeight:2, color:'#2c2520' }}>{item.text}</p>
                </div>
              ))}
              <div>
                <div style={{ fontFamily:"'Shippori Mincho',serif", fontSize:'0.7rem', letterSpacing:'0.28em', color:'#d4847a', marginBottom:12, fontWeight:500 }}>🌸 あなたへのメッセージ</div>
                <p style={{ fontFamily:"'Shippori Mincho',serif", fontSize:'1rem', lineHeight:2.1, color:'#b85c52', whiteSpace:'pre-wrap' }}>{summary.encouragement}</p>
              </div>
            </div>
            <button onClick={restartApp} style={{ width:'100%', background:'transparent', border:'1.5px solid #e8d5b0', borderRadius:16, padding:'14px 24px', fontFamily:"'Shippori Mincho',serif", fontSize:'0.95rem', color:'#8a7e79', cursor:'pointer', marginBottom:40 }}>
              もう一度はじめる
            </button>
          </div>
        )}

        <footer style={{ textAlign:'center', padding:'20px 0 40px' }}>
          <p style={{ fontFamily:"'Shippori Mincho',serif", fontSize:'0.75rem', color:'#8a7e79', letterSpacing:'0.1em' }}>Studio Mizuki × AI Journaling</p>
        </footer>
      </div>
    </>
  );
}
