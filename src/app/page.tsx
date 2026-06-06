'use client'

export const dynamic = 'force-dynamic'

import { useState, useRef, useEffect } from 'react'
import Navbar from '@/components/Navbar'
import ToneSelector from '@/components/ToneSelector'
import ModeSidebar from '@/components/ModeSidebar'
import VerdictCard from '@/components/VerdictCard'
import DebateCard from '@/components/DebateCard'
import LoadingVerdict from '@/components/LoadingVerdict'
import HistorySidebar from '@/components/HistorySidebar'
import ArgumentSuggestions from '@/components/ArgumentSuggestions'
import { Tone, VerdictResult, HistoryItem, TONES } from '@/lib/types'
import { Mode, DebateResult } from '@/lib/modes'
import { saveVerdict, saveDebate, fetchHistory } from '@/lib/history'
import { getScoreContext } from '@/lib/scoreContext'
import { useAuth } from '@/components/AuthProvider'

export default function Home() {
  const { user } = useAuth()
  const [argument, setArgument]   = useState('')
  const [tone, setTone]           = useState<Tone>('hype')
  const [mode, setMode]           = useState<Mode>('moderate')
  const [useSearch, setUseSearch] = useState(true)
  const [loading, setLoading]     = useState(false)
  const [loadStep, setLoadStep]   = useState(0)
  const [verdict, setVerdict]     = useState<VerdictResult | null>(null)
  const [debate, setDebate]       = useState<DebateResult | null>(null)
  const [error, setError]         = useState<string | null>(null)
  const [rateLimitReset, setRateLimitReset] = useState<number | null>(null)
  const [history, setHistory]     = useState<HistoryItem[]>([])
  const [historyLoading, setHistoryLoading] = useState(true)
  const [sidebarOpen, setSidebarOpen]       = useState(false)
  const resultRef  = useRef<HTMLDivElement>(null)
  const verdictRef = resultRef

  // Countdown timer for rate limit
  useEffect(() => {
    if (!rateLimitReset) return
    if (rateLimitReset <= 0) { setRateLimitReset(null); setError(null); return }
    const timer = setTimeout(() => setRateLimitReset(v => v ? v - 1 : null), 1000)
    return () => clearTimeout(timer)
  }, [rateLimitReset])

  // Load history on mount (and when user changes)
  useEffect(() => {
    setHistoryLoading(true)
    fetchHistory(10, user?.id).then(items => {
      setHistory(items)
      setHistoryLoading(false)
    })
  }, [user?.id])

  const handleJudge = async (argOverride?: string) => {
    const finalArg = argOverride ?? argument
    if (!finalArg.trim() || loading) return
    if (argOverride) setArgument(argOverride)

    setLoading(true)
    setVerdict(null)
    setDebate(null)
    setError(null)
    setLoadStep(0)

    const t1 = setTimeout(() => setLoadStep(1), 1200)
    const t2 = setTimeout(() => setLoadStep(2), 2400)

    try {
      const res  = await fetch('/api/verdict', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ argument: finalArg, tone, useSearch, mode }),
      })
      const data = await res.json()

      if (res.status === 429 || data.rateLimited) {
        setError(data.error ?? 'Too many requests.')
        setRateLimitReset(data.resetIn ?? 60)
      } else if (!res.ok || data.error) {
        setError(data.error ?? 'Something went wrong.')
      } else {
        setRateLimitReset(null)

        if (data.type === 'debate') {
          const d = data.data as DebateResult
          setDebate(d)
          await saveDebate(finalArg, d, user?.id)
        } else {
          const v = data.data as VerdictResult
          setVerdict(v)
          await saveVerdict(finalArg, v, user?.id)
        }
        const updated = await fetchHistory(10, user?.id)
        setHistory(updated)

        setTimeout(() => resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100)
      }
    } catch {
      setError('Network error. Check your connection.')
    } finally {
      clearTimeout(t1)
      clearTimeout(t2)
      setLoading(false)
    }
  }

  const handleRetryTone = (newTone: Tone) => {
    setTone(newTone)
    handleJudge(argument)
  }

  const handleHistorySelect = (item: HistoryItem) => {
    setArgument(item.argument)
    setTone(item.verdict.tone)
    setSidebarOpen(false)

    if (item.verdict.debateTurns) {
      setDebate({
        topic:             item.argument,
        turns:             item.verdict.debateTurns,
        ruling:            item.verdict.ruling,
        score:             item.verdict.score,
        tone:              item.verdict.tone,
        searchedAt:        item.verdict.searchedAt,
        hasResearchPapers: item.verdict.hasResearchPapers,
      })
      setVerdict(null)
    } else {
      setVerdict(item.verdict)
      setDebate(null)
    }

    setTimeout(() => resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100)
  }

  const handleDelete = (id: string) => {
    setHistory(prev => prev.filter(item => item.id !== id))
  }

  const scoreCtx = verdict ? getScoreContext(verdict.score) : null

  // Loading label varies by mode
  const loadingLabel = mode === 'heavy'
    ? ['Searching web…', 'Briefing the debaters…', 'Judge reviewing…'][loadStep]
    : ['Searching web…', 'Analyzing facts…', 'Writing verdict…'][loadStep]

  return (
    <div style={{ position: 'relative', minHeight: '100vh' }}>

      {/* Background blobs */}
      <div className="bg-blob-top" style={{
        position: 'fixed', width: 400, height: 400,
        background: 'rgba(232,37,26,0.07)', borderRadius: '50%',
        filter: 'blur(80px)', top: -100, right: -100,
        pointerEvents: 'none', zIndex: 1,
      }} />
      <div className="bg-blob-bottom" style={{
        position: 'fixed', width: 300, height: 300,
        background: 'rgba(232,37,26,0.04)', borderRadius: '50%',
        filter: 'blur(80px)', bottom: 100, left: -80,
        pointerEvents: 'none', zIndex: 1,
      }} />

      <ModeSidebar selected={mode} onChange={setMode} />
      <div className="main-content" style={{ position: 'relative', zIndex: 5, marginLeft: 72 }}>
        <Navbar onOpenHistory={() => setSidebarOpen(true)} historyCount={history.length} />

        {/* Hero */}
        <div className="hero-section" style={{
          textAlign: 'center', padding: '60px 20px 40px',
          maxWidth: 800, margin: '0 auto',
          animation: 'fadeInUp 0.7s ease both',
        }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            background: 'var(--red-dim)',
            border: '1px solid rgba(232,37,26,0.3)',
            color: 'var(--red-light)',
            fontSize: 12, fontWeight: 600,
            letterSpacing: '1.5px', textTransform: 'uppercase',
            padding: '6px 16px', borderRadius: 100, marginBottom: 28,
          }}>
            <span style={{
              width: 6, height: 6, background: 'var(--red-light)',
              borderRadius: '50%', animation: 'pulse-dot 1.5s infinite',
              display: 'inline-block',
            }} />
            AI-Powered Fact Checker
          </div>

          <h1 className="hero-heading" style={{
            fontFamily: "'Bebas Neue', sans-serif",
            fontSize: 'clamp(64px, 10vw, 110px)',
            lineHeight: 0.92, letterSpacing: 3,
          }}>
            ARE YOU<br />
            <span style={{ color: 'var(--red)' }}>RIGHT?</span>
          </h1>

          <p style={{
            marginTop: 20, fontSize: 17, fontWeight: 300,
            color: 'var(--muted)', lineHeight: 1.6,
            maxWidth: 500, margin: '20px auto 0',
          }}>
            Drop your argument. We search the web, weigh the facts, and deliver the verdict — with zero mercy and maximum personality.
          </p>
        </div>

        {/* Input Card */}
        <div className="input-card-wrapper" style={{
          maxWidth: 780, margin: '0 auto', padding: '0 20px',
          animation: 'fadeInUp 0.7s ease 0.15s both',
        }}>
          <div className="input-card" style={{
            background: 'var(--charcoal-2)',
            border: '1px solid rgba(255,255,255,0.07)',
            borderRadius: 40, padding: 28,
            boxShadow: '0 20px 60px rgba(0,0,0,0.4)',
          }}>

            {/* Input header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
              <span style={{
                fontSize: 11, fontWeight: 600,
                letterSpacing: '2px', textTransform: 'uppercase',
                color: 'var(--muted)',
              }}>Your Argument</span>
              <span style={{
                fontFamily: "'DM Mono', monospace",
                fontSize: 12, color: 'var(--muted)',
              }}>{argument.length} / 400</span>
            </div>

            <textarea
              value={argument}
              onChange={e => setArgument(e.target.value)}
              maxLength={400}
              rows={4}
              placeholder={mode === 'heavy'
                ? `e.g. "Social media is making teenagers more depressed than ever…"`
                : `e.g. "Pineapple absolutely belongs on pizza and anyone who disagrees has no taste…"`
              }
              style={{
                width: '100%', background: 'var(--charcoal-3)',
                border: '1.5px solid rgba(255,255,255,0.06)',
                borderRadius: 28, padding: '18px 20px',
                color: 'var(--white)',
                fontFamily: "'DM Sans', sans-serif",
                fontSize: 16, lineHeight: 1.6,
                resize: 'none', outline: 'none',
                transition: 'border-color 0.2s, box-shadow 0.2s',
              }}
              onFocus={e => {
                e.target.style.borderColor = 'rgba(232,37,26,0.4)'
                e.target.style.boxShadow   = '0 0 0 3px rgba(232,37,26,0.08)'
              }}
              onBlur={e => {
                e.target.style.borderColor = 'rgba(255,255,255,0.06)'
                e.target.style.boxShadow   = 'none'
              }}
            />

            {/* Suggestions */}
            {!argument.trim() && (
              <ArgumentSuggestions onSelect={text => setArgument(text)} />
            )}

            {/* Tone selector */}
            <div style={{ marginTop: 18 }}>
              <ToneSelector selected={tone} onChange={setTone} />
            </div>

            {/* Submit row */}
            <div className="submit-row" style={{
              display: 'flex', alignItems: 'center',
              justifyContent: 'space-between', marginTop: 20, gap: 12,
            }}>
              {/* Search toggle */}
              <div
                onClick={() => setUseSearch(v => !v)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  color: 'var(--muted)', fontSize: 13, fontWeight: 500,
                  cursor: 'pointer', userSelect: 'none',
                }}
              >
                <div style={{
                  width: 36, height: 20,
                  background: useSearch ? 'var(--red)' : 'var(--charcoal-3)',
                  border: '1.5px solid ' + (useSearch ? 'var(--red)' : 'rgba(255,255,255,0.1)'),
                  borderRadius: 100, position: 'relative', transition: 'all 0.2s',
                  boxShadow: useSearch ? '0 0 10px var(--red-glow)' : 'none',
                }}>
                  <div style={{
                    position: 'absolute', top: 2, left: 2,
                    width: 12, height: 12,
                    background: 'white', borderRadius: '50%',
                    transition: 'transform 0.2s',
                    transform: useSearch ? 'translateX(16px)' : 'none',
                  }} />
                </div>
                Live Web Search
              </div>

              <button
                onClick={() => handleJudge()}
                disabled={!argument.trim() || loading || !!rateLimitReset}
                className="judge-btn"
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  background: argument.trim() && !loading && !rateLimitReset ? 'var(--red)' : 'var(--charcoal-3)',
                  color: 'white', border: 'none', borderRadius: 20,
                  padding: '14px 28px',
                  fontFamily: "'Bebas Neue', sans-serif",
                  fontSize: 20, letterSpacing: 2,
                  cursor: argument.trim() && !loading && !rateLimitReset ? 'pointer' : 'not-allowed',
                  transition: 'all 0.2s',
                  boxShadow: argument.trim() && !loading && !rateLimitReset ? '0 6px 24px var(--red-glow)' : 'none',
                }}
              >
                {rateLimitReset
                  ? 'COOLING DOWN...'
                  : mode === 'heavy' ? '⚔️ START DEBATE' : '🔍 JUDGE ME'
                }
              </button>
            </div>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div style={{ maxWidth: 780, margin: '16px auto 0', padding: '0 20px' }}>
            <div style={{
              background: rateLimitReset ? 'rgba(255,152,0,0.1)' : 'rgba(232,37,26,0.1)',
              border: '1px solid ' + (rateLimitReset ? 'rgba(255,152,0,0.3)' : 'rgba(232,37,26,0.3)'),
              borderRadius: 20, padding: '14px 20px',
              color: rateLimitReset ? '#FF9800' : 'var(--red-light)',
              fontSize: 14, display: 'flex', alignItems: 'center',
              justifyContent: 'space-between', gap: 12,
            }}>
              <span>{rateLimitReset ? '⏳' : '⚠️'} {error}</span>
              {rateLimitReset && rateLimitReset > 0 && (
                <span style={{
                  fontFamily: "'DM Mono', monospace",
                  fontSize: 13, fontWeight: 600, color: '#FF9800',
                  background: 'rgba(255,152,0,0.1)',
                  padding: '4px 10px', borderRadius: 8, flexShrink: 0,
                }}>{rateLimitReset}s</span>
              )}
            </div>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="loading-card" style={{ maxWidth: 780, margin: '32px auto 0', padding: '0 20px' }}>
            <LoadingVerdict currentStep={loadStep} />
          </div>
        )}

        {/* Score context + retry tones (verdict only) */}
        {verdict && !loading && scoreCtx && (
          <div className="score-context-wrapper" style={{
            maxWidth: 780, margin: '24px auto 0', padding: '0 20px',
            animation: 'fadeInUp 0.4s ease both',
          }}>
            <div className="score-context-bar" style={{
              background: 'var(--charcoal-2)',
              border: '1px solid ' + scoreCtx.color + '33',
              borderRadius: 20, padding: '14px 20px',
              display: 'flex', alignItems: 'center',
              justifyContent: 'space-between', flexWrap: 'wrap', gap: 8,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{
                  width: 10, height: 10, borderRadius: '50%',
                  background: scoreCtx.color, flexShrink: 0,
                }} />
                <span style={{
                  fontFamily: "'Bebas Neue', sans-serif",
                  fontSize: 16, letterSpacing: 1.5, color: scoreCtx.color,
                }}>{scoreCtx.label}</span>
                <span style={{ fontSize: 13, color: 'var(--muted)' }}>
                  — {scoreCtx.sublabel}
                </span>
              </div>

              <div className="retry-tones" style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                <span style={{
                  fontSize: 11, color: 'var(--muted)',
                  fontWeight: 600, letterSpacing: 1, textTransform: 'uppercase',
                }}>Retry as:</span>
                {TONES.filter(t => t.id !== verdict.tone).map(t => (
                  <button
                    key={t.id}
                    onClick={() => handleRetryTone(t.id)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 4,
                      background: 'var(--charcoal-3)',
                      border: '1px solid rgba(255,255,255,0.08)',
                      borderRadius: 100, padding: '4px 12px',
                      color: 'var(--muted)',
                      fontFamily: "'DM Sans', sans-serif",
                      fontSize: 12, cursor: 'pointer', transition: 'all 0.2s',
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.borderColor = 'rgba(232,37,26,0.4)'
                      e.currentTarget.style.color       = 'var(--white)'
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'
                      e.currentTarget.style.color       = 'var(--muted)'
                    }}
                  >{t.emoji} {t.label}</button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Result — verdict or debate */}
        {!loading && (verdict || debate) && (
          <div ref={resultRef} className="result-wrapper" style={{ maxWidth: 780, margin: '16px auto 0', padding: '0 20px' }}>
            {verdict && <VerdictCard verdict={verdict} argument={argument} />}
            {debate  && <DebateCard  debate={debate}   argument={argument} />}
          </div>
        )}

        <div style={{ height: 80 }} />
      </div>

      {/* History Sidebar */}
      <HistorySidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        items={history}
        loading={historyLoading}
        onSelect={handleHistorySelect}
        onDelete={handleDelete}
        userId={user?.id}
      />
    </div>
  )
}
