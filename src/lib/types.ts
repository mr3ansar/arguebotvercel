export type Tone =
  | 'hype'
  | 'professor'
  | 'judge'
  | 'petty'
  | 'commentator'

export interface ToneConfig {
  id: Tone
  label: string
  emoji: string
  description: string
}

export const TONES: ToneConfig[] = [
  { id: 'hype',        label: 'Hype Man',           emoji: '🔥', description: 'Celebrates you either way, then drops the truth' },
  { id: 'professor',   label: 'Disappointed Prof',  emoji: '😤', description: 'Sighs heavily and explains where you went wrong' },
  { id: 'judge',       label: 'Cold Judge',         emoji: '⚖️', description: 'Formal, dramatic, zero emotion' },
  { id: 'petty',       label: 'Petty Friend',       emoji: '💅', description: 'Oh sweetie… no.' },
  { id: 'commentator', label: 'Sports Commentator', emoji: '🎙️', description: 'Play-by-play of your argument like it\'s a game' },
]

export type Ruling = 'CORRECT' | 'MOSTLY RIGHT' | 'PARTIALLY RIGHT' | 'MOSTLY WRONG' | 'WRONG'

export type EvidenceType = 'web' | 'paper'

export interface EvidenceItem {
  text: string
  source?: string
  type?: EvidenceType   // 'web' or 'paper'
  url?: string          // link to paper or source
  authors?: string      // for papers: "Smith et al."
  year?: string         // for papers: "2023"
}

export interface DebateTurn {
  role:    'advocate' | 'skeptic' | 'judge'
  label:   string
  emoji:   string
  content: string
}

export interface VerdictResult {
  ruling: Ruling
  score: number
  summary: string
  evidence: EvidenceItem[]
  twist: string
  tone: Tone
  searchedAt: string
  hasResearchPapers?: boolean
  debateTurns?: DebateTurn[]
}

export interface HistoryItem {
  id: string
  argument: string
  verdict: VerdictResult
  createdAt: string
  userId?: string
}

export interface AuthUser {
  id: string
  email: string | undefined
  name: string | undefined
  avatar: string | undefined
}
