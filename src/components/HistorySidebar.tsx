'use client'

import { useEffect, useRef, useState } from 'react'
import { HistoryItem, Ruling, TONES } from '@/lib/types'
import { deleteVerdict } from '@/lib/history'

const RULING_COLORS: Record<Ruling, string> = {
  'CORRECT':        '#4CAF50',
  'MOSTLY RIGHT':   '#8BC34A',
  'PARTIALLY RIGHT':'#FF9800',
  'MOSTLY WRONG':   '#FF5722',
  'WRONG':          '#E8251A',
}

interface Props {
  open: boolean
  onClose: () => void
  items: HistoryItem[]
  loading: boolean
  onSelect: (item: HistoryItem) => void
  onDelete: (id: string) => void
}

export default function HistorySidebar({ open, onClose, items, loading, onSelect, onDelete, userId }: Props & { userId?: string }) {
  const sidebarRef                        = useRef<HTMLDivElement>(null)
  const [deletingId, setDeletingId]       = useState<string | null>(null)
  const [confirmId, setConfirmId]         = useState<string | null>(null)
  const confirmTimerRef                   = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (open && sidebarRef.current && !sidebarRef.current.contains(e.target as Node)) {
        onClose()
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open, onClose])

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (confirmId) setConfirmId(null)
        else onClose()
      }
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onClose, confirmId])

  // Lock body scroll when open; clean up confirm timer on unmount
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
      if (confirmTimerRef.current) clearTimeout(confirmTimerRef.current)
    }
  }, [open])

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation() // don't trigger onSelect

    // First click — show confirm state
    if (confirmId !== id) {
      setConfirmId(id)
      // Auto-cancel confirm after 3s
      if (confirmTimerRef.current) clearTimeout(confirmTimerRef.current)
      confirmTimerRef.current = setTimeout(() => {
        setConfirmId(prev => prev === id ? null : prev)
        confirmTimerRef.current = null
      }, 3000)
      return
    }

    // Second click — actually delete
    setDeletingId(id)
    setConfirmId(null)
    const success = await deleteVerdict(id, userId)
    setDeletingId(null)
    if (success) onDelete(id)
  }

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0,
          background: 'rgba(0,0,0,0.6)',
          backdropFilter: 'blur(4px)',
          zIndex: 40,
          opacity: open ? 1 : 0,
          pointerEvents: open ? 'all' : 'none',
          transition: 'opacity 0.3s ease',
        }}
      />

      {/* Sidebar panel */}
      <div
        ref={sidebarRef}
        className="history-sidebar"
        style={{
          position: 'fixed', top: 0, left: 0,
          height: '100vh', width: 380,
          background: 'var(--charcoal-2)',
          borderRight: '1px solid rgba(255,255,255,0.07)',
          zIndex: 50,
          transform: open ? 'translateX(0)' : 'translateX(-100%)',
          transition: 'transform 0.35s cubic-bezier(0.4, 0, 0.2, 1)',
          display: 'flex', flexDirection: 'column',
          boxShadow: open ? '4px 0 40px rgba(0,0,0,0.5)' : 'none',
        }}
      >
        {/* Header */}
        <div style={{
          padding: '24px 24px 20px',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          flexShrink: 0,
        }}>
          <div>
            <div style={{
              fontFamily: "'Bebas Neue', sans-serif",
              fontSize: 26, letterSpacing: 2, color: 'var(--white)',
              display: 'flex', alignItems: 'center', gap: 10,
            }}>
              ⚖️ VERDICT HISTORY
            </div>
            <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 3 }}>
              {items.length} ruling{items.length !== 1 ? 's' : ''} on record
            </div>
          </div>

          <button
            onClick={onClose}
            style={{
              width: 36, height: 36,
              background: 'var(--charcoal-3)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 10,
              color: 'var(--muted)', fontSize: 18,
              cursor: 'pointer', display: 'flex',
              alignItems: 'center', justifyContent: 'center',
              transition: 'all 0.2s', flexShrink: 0,
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background  = 'var(--red)'
              e.currentTarget.style.color       = 'white'
              e.currentTarget.style.borderColor = 'var(--red)'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background  = 'var(--charcoal-3)'
              e.currentTarget.style.color       = 'var(--muted)'
              e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'
            }}
          >✕</button>
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 16px 24px' }}>
          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 8 }}>
              {[1, 2, 3].map(i => (
                <div key={i} style={{
                  background: 'var(--charcoal-3)', borderRadius: 16,
                  height: 90, opacity: 0.4,
                }} />
              ))}
            </div>
          ) : items.length === 0 && !userId ? (
            <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--muted)' }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>🔒</div>
              <div style={{
                fontFamily: "'Bebas Neue', sans-serif",
                fontSize: 20, letterSpacing: 2,
                color: 'var(--white)', marginBottom: 6,
              }}>SIGN IN TO SAVE HISTORY</div>
              <div style={{ fontSize: 13, lineHeight: 1.5, marginBottom: 16 }}>
                Create a free account to save your<br />verdicts and get 2x rate limits.
              </div>
              <a href="/signup" style={{
                display: 'inline-block', padding: '10px 24px',
                background: 'var(--red)', color: 'white',
                borderRadius: 16, textDecoration: 'none',
                fontFamily: "'Bebas Neue', sans-serif",
                fontSize: 16, letterSpacing: 1.5,
                boxShadow: '0 4px 14px var(--red-glow)',
              }}>SIGN UP FREE</a>
            </div>
          ) : items.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--muted)' }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>⚖️</div>
              <div style={{
                fontFamily: "'Bebas Neue', sans-serif",
                fontSize: 20, letterSpacing: 2,
                color: 'var(--white)', marginBottom: 6,
              }}>NO VERDICTS YET</div>
              <div style={{ fontSize: 13, lineHeight: 1.5 }}>
                Submit your first argument<br />and the record will appear here.
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {items.map((item, idx) => {
                const tone        = TONES.find(t => t.id === item.verdict.tone)
                const rulingColor = RULING_COLORS[item.verdict.ruling as Ruling] ?? 'var(--muted)'
                const date        = new Date(item.createdAt).toLocaleDateString('en-US', {
                  month: 'short', day: 'numeric', year: 'numeric',
                })
                const isDeleting  = deletingId === item.id
                const isConfirm   = confirmId  === item.id

                return (
                    <div
                      key={item.id}
                      onClick={() => onSelect(item)}
                      style={{
                      background: 'var(--charcoal-3)',
                      border: `1px solid ${isConfirm ? 'rgba(232,37,26,0.5)' : 'rgba(255,255,255,0.05)'}`,
                      borderRadius: 18, padding: '14px 16px',
                      cursor: 'pointer', transition: 'all 0.2s',
                      opacity: isDeleting ? 0.4 : 1,
                      animation: `fadeInUp 0.4s ease ${idx * 0.04}s both`,
                      position: 'relative',
                    }}
                    onMouseEnter={e => {
                      if (isDeleting) return
                      const el = e.currentTarget as HTMLElement
                      el.style.borderColor = isConfirm ? 'rgba(232,37,26,0.5)' : 'rgba(232,37,26,0.35)'
                      el.style.background  = '#333'
                      el.style.transform   = 'translateX(3px)'
                    }}
                    onMouseLeave={e => {
                      const el = e.currentTarget as HTMLElement
                      el.style.borderColor = isConfirm ? 'rgba(232,37,26,0.5)' : 'rgba(255,255,255,0.05)'
                      el.style.background  = 'var(--charcoal-3)'
                      el.style.transform   = 'none'
                    }}
                  >
                    {/* Top row — ruling + score + delete */}
                    <div style={{
                      display: 'flex', alignItems: 'center',
                      justifyContent: 'space-between', marginBottom: 8,
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                        <div style={{
                          width: 8, height: 8, borderRadius: '50%',
                          background: rulingColor, flexShrink: 0,
                        }} />
                        <span style={{
                          fontFamily: "'Bebas Neue', sans-serif",
                          fontSize: 14, letterSpacing: 1.5, color: rulingColor,
                        }}>{item.verdict.ruling}</span>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{
                          fontFamily: "'DM Mono', monospace",
                          fontSize: 13, fontWeight: 600, color: rulingColor,
                        }}>{item.verdict.score}%</span>

                        <span style={{ fontSize: 14 }}>{tone?.emoji}</span>

                        {/* Delete button */}
                        <button
                          onClick={e => handleDelete(e, item.id)}
                          disabled={isDeleting}
                          title={isConfirm ? 'Click again to confirm delete' : 'Delete verdict'}
                          style={{
                            width: 26, height: 26,
                            background: isConfirm ? 'rgba(232,37,26,0.2)' : 'rgba(255,255,255,0.05)',
                            border: `1px solid ${isConfirm ? 'rgba(232,37,26,0.5)' : 'rgba(255,255,255,0.08)'}`,
                            borderRadius: 8,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            cursor: isDeleting ? 'wait' : 'pointer',
                            transition: 'all 0.2s',
                            flexShrink: 0,
                            padding: 0,
                          }}
                          onMouseEnter={e => {
                            e.stopPropagation()
                            if (isDeleting) return
                            e.currentTarget.style.background  = 'rgba(232,37,26,0.25)'
                            e.currentTarget.style.borderColor = 'rgba(232,37,26,0.6)'
                          }}
                          onMouseLeave={e => {
                            e.stopPropagation()
                            if (!isConfirm) {
                              e.currentTarget.style.background  = 'rgba(255,255,255,0.05)'
                              e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'
                            }
                          }}
                        >
                          {isDeleting ? (
                            <div style={{
                              width: 10, height: 10,
                              border: '1.5px solid rgba(232,37,26,0.4)',
                              borderTopColor: 'var(--red)',
                              borderRadius: '50%',
                              animation: 'spin 0.7s linear infinite',
                            }} />
                          ) : isConfirm ? (
                            <span style={{ fontSize: 11, color: 'var(--red)', fontWeight: 700 }}>?</span>
                          ) : (
                            // Trash icon
                            <svg width="11" height="12" viewBox="0 0 11 12" fill="none">
                              <path d="M1 3h9M4 3V2h3v1M2 3l.7 7.5a.5.5 0 00.5.5h4.6a.5.5 0 00.5-.5L9 3" stroke="rgba(255,255,255,0.35)" strokeWidth="1.2" strokeLinecap="round"/>
                              <path d="M4.5 5.5v3M6.5 5.5v3" stroke="rgba(255,255,255,0.35)" strokeWidth="1.2" strokeLinecap="round"/>
                            </svg>
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Confirm hint */}
                    {isConfirm && (
                      <div style={{
                        fontSize: 11, color: 'var(--red)',
                        marginBottom: 6, fontWeight: 500,
                      }}>
                        Click 🗑 again to confirm delete
                      </div>
                    )}

                    {/* Argument preview */}
                    <div style={{
                      fontSize: 13, color: 'rgba(255,255,255,0.75)',
                      lineHeight: 1.5, marginBottom: 10,
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                    }}>
                      "{item.argument}"
                    </div>

                    {/* Bottom row */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{
                        fontSize: 11, color: 'rgba(255,255,255,0.2)',
                        fontFamily: "'DM Mono', monospace",
                      }}>{date}</span>
                      <div style={{ display: 'flex', gap: 5 }}>
                        {item.verdict.hasResearchPapers && (
                          <span style={{
                            fontSize: 10, fontWeight: 700,
                            color: 'var(--red)', background: 'var(--red-dim)',
                            border: '1px solid rgba(232,37,26,0.2)',
                            padding: '2px 7px', borderRadius: 6,
                          }}>🎓 Research</span>
                        )}
                        <span style={{
                          fontSize: 10, color: 'rgba(255,255,255,0.3)',
                          background: 'rgba(255,255,255,0.05)',
                          padding: '2px 7px', borderRadius: 6,
                        }}>{tone?.label}</span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{
          padding: '16px 20px',
          borderTop: '1px solid rgba(255,255,255,0.06)',
          flexShrink: 0,
        }}>
          <div style={{
            fontSize: 11, color: 'rgba(255,255,255,0.2)',
            textAlign: 'center', fontFamily: "'DM Mono', monospace",
          }}>
            arguebot · all verdicts are final
          </div>
        </div>
      </div>
    </>
  )
}
