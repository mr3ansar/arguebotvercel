import { getSupabase } from './supabase'
import { VerdictResult, HistoryItem } from './types'
import type { DebateResult } from './modes'

export async function saveVerdict(argument: string, verdict: VerdictResult, userId?: string): Promise<void> {
  const { error } = await getSupabase().from('verdicts').insert({
    argument,
    ruling:               verdict.ruling,
    score:                verdict.score,
    summary:              verdict.summary,
    evidence:             verdict.evidence,
    twist:                verdict.twist ?? '',
    tone:                 verdict.tone,
    has_research_papers:  verdict.hasResearchPapers ?? false,
    searched_at:          verdict.searchedAt,
    user_id:              userId ?? null,
  })

  if (error) console.error('Failed to save verdict:', error)
}

export async function saveDebate(argument: string, debate: DebateResult, userId?: string): Promise<void> {
  const judgeTurn = debate.turns.find(t => t.role === 'judge')
  const { error } = await getSupabase().from('verdicts').insert({
    argument,
    ruling:               debate.ruling,
    score:                debate.score,
    summary:              judgeTurn?.content ?? '',
    evidence:             debate.turns as unknown as any[],
    twist:                '',
    tone:                 debate.tone,
    has_research_papers:  debate.hasResearchPapers ?? false,
    searched_at:          debate.searchedAt,
    user_id:              userId ?? null,
  })

  if (error) console.error('Failed to save debate:', error)
}

export async function deleteVerdict(id: string, userId?: string): Promise<boolean> {
  let query = getSupabase()
    .from('verdicts')
    .delete()
    .eq('id', id)

  if (userId) {
    query = query.eq('user_id', userId)
  }

  const { error } = await query

  if (error) {
    console.error('Failed to delete verdict:', error)
    return false
  }
  return true
}

export async function fetchHistory(limit = 10, userId?: string): Promise<HistoryItem[]> {
  // Privacy: anonymous users can't see any history
  if (!userId) return []

  const query = getSupabase()
    .from('verdicts')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit)

  const { data, error } = await query

  if (error) {
    console.error('Failed to fetch history:', error)
    return []
  }

  return (data ?? []).map(row => {
    const isDebate = Array.isArray(row.evidence) && row.evidence.length > 0 && 'role' in row.evidence[0]

    return {
      id:        row.id,
      argument:  row.argument,
      createdAt: row.created_at,
      userId:    row.user_id,
      verdict: {
        ruling:             row.ruling,
        score:              row.score,
        summary:            row.summary,
        evidence:           isDebate ? [] : (row.evidence ?? []),
        twist:              isDebate ? '' : (row.twist ?? ''),
        tone:               row.tone,
        hasResearchPapers:  row.has_research_papers,
        searchedAt:         row.searched_at,
        debateTurns:        isDebate ? (row.evidence as any[]) : undefined,
      },
    }
  })
}
