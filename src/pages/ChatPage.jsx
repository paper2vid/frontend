import { useState, useRef, useEffect, useCallback } from 'react'
import { useQuery, useQueryClient } from 'react-query'
import {
  MessageSquare, Plus, Search, Send, Loader2, Trash2,
  X, BookOpen, Sparkles, ChevronRight, RotateCcw,
  Bot, User, ChevronDown, ChevronUp,
  ExternalLink, Database, Globe, Clock,
  CheckSquare,
} from 'lucide-react'
import axios from 'axios'
import toast from 'react-hot-toast'
import { getPapers, ingestURL, getJob } from '../utils/api'
import { useAppStore } from '../store'

const api = axios.create({ baseURL: '/api' })

// API helpers
const listSessions  = () => api.get('/chat/sessions').then(r => r.data)
const createSession = (paper_ids, name) => api.post('/chat/sessions', { paper_ids, name }).then(r => r.data)
const getSession    = (id) => api.get(`/chat/sessions/${id}`).then(r => r.data)
const deleteSession = (id) => api.delete(`/chat/sessions/${id}`).then(r => r.data)
const sendMessage   = (sessionId, message) =>
  api.post(`/chat/sessions/${sessionId}/messages`, { paper_ids: [], message }).then(r => r.data)
const clearHistory  = (id) => api.delete(`/chat/sessions/${id}/messages`).then(r => r.data)
const searchArxiv   = (q, cat) =>
  api.get('/arxiv/search', { params: { q, category: cat || undefined, max_results: 50 } }).then(r => r.data)


// ── Paper Picker Modal ────────────────────────────────────────────────────────

function PaperPickerModal({ onConfirm, onClose }) {
  const [tab, setTab]           = useState('library')
  // basket: [{ id?, arxiv_id, title, year, source: 'library'|'arxiv' }]
  const [basket, setBasket]     = useState([])

  // Library
  const [libQ, setLibQ]         = useState('')

  // arXiv
  const [arxivQ, setArxivQ]     = useState('')
  const [arxivCat, setArxivCat] = useState('')
  const [arxivResults, setArxivResults] = useState([])
  const [arxivLoading, setArxivLoading] = useState(false)
  const [expanded, setExpanded] = useState(new Set())
  const debounceRef             = useRef(null)

  const { data: papers = [], isLoading: libLoading } = useQuery(
    ['papers-picker', libQ],
    () => getPapers({ q: libQ || undefined, limit: 100 }),
    { keepPreviousData: true }
  )

  const parsedPapers = papers.filter(p =>
    ['done', 'scripted', 'embedded', 'ingested', 'correlated', 'embedding'].includes(p.status)
  )

  // arXiv debounced search
  useEffect(() => {
    if (!arxivQ.trim()) { setArxivResults([]); return }
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(async () => {
      setArxivLoading(true)
      try {
        const data = await searchArxiv(arxivQ, arxivCat)
        setArxivResults(data.papers || [])
      } catch { setArxivResults([]) }
      finally   { setArxivLoading(false) }
    }, 600)
    return () => clearTimeout(debounceRef.current)
  }, [arxivQ, arxivCat])

  const basketKeys = new Set(basket.map(b => b.arxiv_id || b.id))

  const toggle = (item) => {
    const key = item.arxiv_id || item.id
    if (basketKeys.has(key)) {
      setBasket(prev => prev.filter(b => (b.arxiv_id || b.id) !== key))
    } else {
      setBasket(prev => [...prev, item])
    }
  }

  const inBasket = (item) => basketKeys.has(item.arxiv_id || item.id)

  const toggleExpand = (id) => {
    setExpanded(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })
  }

  const arxivCount  = basket.filter(b => b.source === 'arxiv').length
  const totalCount  = basket.length

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-3xl bg-bg-card border border-bg-border rounded-2xl shadow-2xl flex flex-col"
           style={{ maxHeight: '88vh' }}>

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-bg-border shrink-0">
          <div>
            <h2 className="font-display font-bold text-lg text-text-primary">Select Papers for Chat</h2>
            <p className="text-xs text-text-muted mt-0.5">
              Combine papers from your library and arXiv — selections persist across tabs
            </p>
          </div>
          <button onClick={onClose} className="text-text-muted hover:text-text-primary">
            <X size={18} />
          </button>
        </div>

        {/* Tab switcher */}
        <div className="flex gap-1 p-2 mx-4 mt-3 bg-bg-deep rounded-xl border border-bg-border shrink-0">
          {[
            { key: 'library', label: 'My Library', icon: Database, count: basket.filter(b => b.source === 'library').length },
            { key: 'arxiv',   label: 'Search arXiv', icon: Globe,  count: arxivCount },
          ].map(({ key, label, icon: Icon, count }) => (
            <button key={key} onClick={() => setTab(key)}
              className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-all
                ${tab === key
                  ? 'bg-accent-blue text-white shadow-lg shadow-blue-500/20'
                  : 'text-text-muted hover:text-text-secondary'}`}
            >
              <Icon size={13} />
              {label}
              {count > 0 && (
                <span className={`text-xs px-1.5 py-0.5 rounded-full font-mono ${
                  tab === key ? 'bg-white/20 text-white' : 'bg-accent-blue/20 text-accent-blue'
                }`}>{count}</span>
              )}
            </button>
          ))}
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2 min-h-0">

          {/* ── Library Tab ── */}
          {tab === 'library' && (
            <>
              <div className="relative sticky top-0 bg-bg-card pb-2 z-10">
                <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
                <input value={libQ} onChange={e => setLibQ(e.target.value)}
                  placeholder="Search your parsed papers…" className="input pl-8 text-sm" />
              </div>

              {libLoading ? (
                <div className="flex justify-center py-8"><Loader2 size={18} className="animate-spin text-accent-blue" /></div>
              ) : parsedPapers.length === 0 ? (
                <div className="text-center py-12 text-text-muted">
                  <BookOpen size={28} className="mx-auto mb-3 opacity-30" />
                  <p className="text-sm">No parsed papers yet</p>
                  <p className="text-xs mt-1">Switch to arXiv tab to find and queue papers</p>
                </div>
              ) : parsedPapers.map(p => {
                const sel = inBasket(p)
                return (
                  <div key={p.id}
                    className={`flex items-center gap-3 p-3 rounded-xl border transition-all cursor-pointer ${
                      sel ? 'bg-accent-blue/8 border-accent-blue/40' : 'bg-bg-deep border-bg-border hover:border-bg-border-active'
                    }`}
                    onClick={() => toggle({ id: p.id, arxiv_id: p.arxiv_id, title: p.title, year: p.year, source: 'library' })}
                  >
                    <div className={`shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
                      sel ? 'bg-accent-blue border-accent-blue' : 'border-text-muted'
                    }`}>
                      {sel && <div className="w-2.5 h-2.5 bg-white rounded-sm" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-text-primary truncate">{p.title}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        {p.year && <span className="text-xs text-text-muted">{p.year}</span>}
                        {p.arxiv_id && <span className="text-xs font-mono text-text-muted">{p.arxiv_id}</span>}
                        <span className={`text-xs px-1.5 py-0.5 rounded font-mono ${
                          p.status === 'done' ? 'bg-teal-500/10 text-accent-teal' : 'bg-blue-500/10 text-accent-blue'
                        }`}>{p.status}</span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </>
          )}

          {/* ── arXiv Tab ── */}
          {tab === 'arxiv' && (
            <>
              <div className="sticky top-0 bg-bg-card pb-2 z-10 flex gap-2">
                <div className="relative flex-1">
                  <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
                  <input value={arxivQ} onChange={e => setArxivQ(e.target.value)}
                    placeholder="Search arXiv — results appear as you type…" className="input pl-8 text-sm" />
                </div>
                <input value={arxivCat} onChange={e => setArxivCat(e.target.value)}
                  placeholder="cs, cs.CV…" className="input w-28 text-sm" title="Category (optional)" />
              </div>

              {arxivLoading && <div className="flex justify-center py-6"><Loader2 size={18} className="animate-spin text-accent-blue" /></div>}

              {!arxivQ && !arxivLoading && (
                <div className="text-center py-10 text-text-muted">
                  <Globe size={28} className="mx-auto mb-3 opacity-30" />
                  <p className="text-sm">Type to search arXiv papers</p>
                  <p className="text-xs mt-1 max-w-xs mx-auto">Selected papers will be automatically queued for parsing before chat starts</p>
                </div>
              )}

              {arxivResults.map(p => {
                const sel   = inBasket(p)
                const isExp = expanded.has(p.arxiv_id)
                return (
                  <div key={p.arxiv_id}
                    className={`rounded-xl border transition-all ${sel ? 'bg-accent-blue/8 border-accent-blue/40' : 'bg-bg-deep border-bg-border'}`}
                  >
                    <div className="flex items-start gap-3 p-3">
                      <button onClick={() => toggle({ arxiv_id: p.arxiv_id, title: p.title, year: p.year, source: 'arxiv' })}
                        className={`shrink-0 mt-0.5 w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
                          sel ? 'bg-accent-blue border-accent-blue' : 'border-text-muted hover:border-accent-blue'
                        }`}>
                        {sel && <div className="w-2.5 h-2.5 bg-white rounded-sm" />}
                      </button>
                      <div className="flex-1 min-w-0 cursor-pointer"
                           onClick={() => toggle({ arxiv_id: p.arxiv_id, title: p.title, year: p.year, source: 'arxiv' })}>
                        <p className="text-sm font-medium text-text-primary leading-snug">{p.title}</p>
                        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                          {p.year && <span className="text-xs font-mono text-accent-teal">{p.year}</span>}
                          {p.category && <span className="text-xs font-mono text-text-muted bg-bg-card px-1.5 py-0.5 rounded border border-bg-border">{p.category}</span>}
                          {p.authors?.[0] && <span className="text-xs text-text-muted">{p.authors[0]}{p.authors.length > 1 ? ' et al.' : ''}</span>}
                        </div>
                        {p.abstract && (
                          <div className="mt-1.5" onClick={e => e.stopPropagation()}>
                            <p className={`text-xs text-text-muted leading-relaxed ${isExp ? '' : 'line-clamp-2'}`}>{p.abstract}</p>
                            <button onClick={() => toggleExpand(p.arxiv_id)}
                              className="text-xs text-accent-blue/70 hover:text-accent-blue mt-0.5 flex items-center gap-1">
                              {isExp ? <><ChevronUp size={10}/> less</> : <><ChevronDown size={10}/> abstract</>}
                            </button>
                          </div>
                        )}
                      </div>
                      <a href={p.abs_url} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()}
                         className="shrink-0 text-text-muted hover:text-accent-blue transition-colors mt-0.5">
                        <ExternalLink size={12} />
                      </a>
                    </div>
                  </div>
                )
              })}
            </>
          )}
        </div>

        {/* Basket summary + footer */}
        <div className="border-t border-bg-border shrink-0">
          {totalCount > 0 && (
            <div className="px-4 pt-3 pb-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs text-text-muted">{totalCount} paper{totalCount !== 1 ? 's' : ''} selected:</span>
                {basket.map(item => {
                  const key = item.arxiv_id || item.id
                  return (
                    <span key={key}
                      className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border ${
                        item.source === 'arxiv'
                          ? 'bg-orange-500/10 border-orange-500/30 text-accent-orange'
                          : 'bg-accent-blue/10 border-accent-blue/30 text-accent-blue'
                      }`}
                    >
                      {item.source === 'arxiv' ? <Globe size={9}/> : <Database size={9}/>}
                      <span className="max-w-[120px] truncate">{item.title}</span>
                      <button onClick={() => toggle(item)} className="hover:opacity-70 ml-0.5"><X size={9}/></button>
                    </span>
                  )
                })}
              </div>
              {arxivCount > 0 && (
                <p className="text-xs text-accent-orange mt-1.5 flex items-center gap-1">
                  <Clock size={10} />
                  {arxivCount} arXiv paper{arxivCount !== 1 ? 's' : ''} will be queued for parsing — chat starts once ready
                </p>
              )}
            </div>
          )}

          <div className="px-4 py-3 flex items-center justify-between">
            <span className="text-xs text-text-muted">
              {totalCount === 0 ? 'Select papers above' : `${totalCount} paper${totalCount !== 1 ? 's' : ''} ready`}
            </span>
            <button onClick={() => totalCount > 0 && onConfirm(basket)}
              disabled={totalCount === 0}
              className="btn-primary flex items-center gap-2 text-sm disabled:opacity-40">
              <MessageSquare size={13} />
              Start Chat
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}


// ── Queue-and-wait hook ───────────────────────────────────────────────────────

function useQueueAndWait() {
  const { addJob } = useAppStore()

  return useCallback(async (basket, onProgress) => {
    const libraryItems = basket.filter(b => b.source === 'library' && b.id)
    const arxivItems   = basket.filter(b => b.source === 'arxiv'   && b.arxiv_id)
    const resolvedIds  = libraryItems.map(b => b.id)

    if (arxivItems.length === 0) return resolvedIds

    // Queue all arXiv papers
    const queued = []
    for (const item of arxivItems) {
      try {
        const data = await ingestURL({ url: item.arxiv_id, source_type: 'arxiv_id' })
        addJob(data.task_id, { source: item.arxiv_id, status: 'queued' })
        queued.push({ item, task_id: data.task_id })
      } catch {
        toast.error(`Failed to queue ${item.arxiv_id}`)
      }
    }

    if (!queued.length) return resolvedIds
    onProgress?.(`Parsing ${queued.length} arXiv paper(s)…`)

    const POLL = 3000
    const MAX  = 6 * 60 * 1000
    const t0   = Date.now()
    const pending = new Map(queued.map(q => [q.task_id, q.item]))

    while (pending.size > 0 && Date.now() - t0 < MAX) {
      await new Promise(r => setTimeout(r, POLL))
      for (const [taskId, item] of [...pending]) {
        try {
          const job = await getJob(taskId)
          if (job.status === 'SUCCESS') {
            if (job.result?.paper_id) resolvedIds.push(job.result.paper_id)
            pending.delete(taskId)
          } else if (job.status === 'FAILURE') {
            pending.delete(taskId)
            toast.error(`Failed to parse ${item.arxiv_id}`)
          }
        } catch {}
      }
      if (pending.size > 0) onProgress?.(`Still parsing ${pending.size} paper(s)…`)
    }

    // Timeout fallback — look up by arxiv_id
    for (const [, item] of pending) {
      try {
        const res = await api.get('/papers/', { params: { q: item.arxiv_id, limit: 1 } }).then(r => r.data)
        if (res[0]?.id) resolvedIds.push(res[0].id)
      } catch {}
    }
    if (pending.size > 0) toast.error(`${pending.size} paper(s) timed out — starting chat with available papers`)

    return resolvedIds
  }, [addJob])
}


// ── Message bubble ────────────────────────────────────────────────────────────

function MessageBubble({ msg }) {
  const isUser = msg.role === 'user'
  return (
    <div className={`flex gap-3 ${isUser ? 'flex-row-reverse' : ''}`}>
      <div className={`shrink-0 w-7 h-7 rounded-full flex items-center justify-center ${
        isUser ? 'bg-accent-blue/20 text-accent-blue' : 'bg-accent-teal/20 text-accent-teal'
      }`}>
        {isUser ? <User size={13} /> : <Bot size={13} />}
      </div>
      <div className={`max-w-[78%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
        isUser
          ? 'bg-accent-blue/15 text-text-primary rounded-tr-sm'
          : 'bg-bg-card border border-bg-border text-text-primary rounded-tl-sm'
      }`}>
        <div className="space-y-1.5">
          {msg.content.split('\n').map((line, i) =>
            line.startsWith('- ') || line.startsWith('• ')
              ? <p key={i} className="flex gap-2"><span className="text-accent-blue mt-0.5">•</span>{line.slice(2)}</p>
              : <p key={i}>{line || <br />}</p>
          )}
        </div>
        <div className={`text-xs mt-2 ${isUser ? 'text-accent-blue/50 text-right' : 'text-text-muted'}`}>
          {msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
        </div>
      </div>
    </div>
  )
}


// ── Chat Window ───────────────────────────────────────────────────────────────

function ChatWindow({ sessionId, onDelete }) {
  const [input, setInput]       = useState('')
  const [sending, setSending]   = useState(false)
  const [localMsgs, setLocalMsgs] = useState(null)
  const bottomRef = useRef(null)
  const inputRef  = useRef(null)
  const qc = useQueryClient()

  const { data: session, isLoading } = useQuery(
    ['chat-session', sessionId],
    () => getSession(sessionId),
    { refetchInterval: false }
  )

  const messages = localMsgs ?? session?.messages ?? []

  useEffect(() => { if (session) setLocalMsgs(session.messages) }, [session?.messages?.length])
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages.length, sending])

  const send = async () => {
    const text = input.trim()
    if (!text || sending) return
    setInput('')
    setSending(true)
    const tmp = { id: 'tmp', role: 'user', content: text, timestamp: new Date().toISOString() }
    setLocalMsgs(prev => [...(prev || []), tmp])
    try {
      const data = await sendMessage(sessionId, text)
      setLocalMsgs(prev => [...prev.filter(m => m.id !== 'tmp'), tmp, data.message])
      qc.invalidateQueries(['chat-session', sessionId])
    } catch {
      setLocalMsgs(prev => prev.filter(m => m.id !== 'tmp'))
      toast.error('Failed to send message')
      setInput(text)
    } finally {
      setSending(false)
      inputRef.current?.focus()
    }
  }

  if (isLoading) return <div className="flex-1 flex items-center justify-center"><Loader2 size={24} className="animate-spin text-accent-blue" /></div>
  if (!session)  return null

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      <div className="px-6 py-4 border-b border-bg-border flex items-center justify-between shrink-0">
        <div>
          <h2 className="font-display font-semibold text-base text-text-primary">{session.name}</h2>
          <p className="text-xs text-text-muted mt-0.5">
            {session.papers?.length} paper{session.papers?.length !== 1 ? 's' : ''} · {messages.length} message{messages.length !== 1 ? 's' : ''}
          </p>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="hidden md:flex items-center gap-1 mr-2">
            {(session.papers || []).slice(0, 2).map((p, i) => (
              <span key={i} className="text-xs px-2 py-0.5 rounded-full bg-bg-deep border border-bg-border text-text-muted truncate max-w-[110px]">
                {p.title?.slice(0, 20)}…
              </span>
            ))}
            {(session.papers?.length || 0) > 2 && <span className="text-xs text-text-muted">+{session.papers.length - 2}</span>}
          </div>
          <button onClick={async () => { if(!confirm('Clear history?')) return; await clearHistory(sessionId); setLocalMsgs([]); qc.invalidateQueries(['chat-session', sessionId]) }}
            className="p-2 rounded-lg text-text-muted hover:text-text-primary hover:bg-bg-hover transition-all">
            <RotateCcw size={13} />
          </button>
          <button onClick={() => onDelete(sessionId)}
            className="p-2 rounded-lg text-text-muted hover:text-accent-red hover:bg-red-500/10 transition-all">
            <Trash2 size={13} />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center gap-4 py-16">
            <div className="w-14 h-14 rounded-2xl bg-accent-blue/10 flex items-center justify-center">
              <Sparkles size={22} className="text-accent-blue" />
            </div>
            <div>
              <p className="font-display font-semibold text-text-primary mb-1">Ask anything about the papers</p>
              <p className="text-sm text-text-muted max-w-md">Answers are grounded in the actual paper content using RAG.</p>
            </div>
            <div className="flex flex-wrap justify-center gap-2 max-w-lg">
              {['What are the main contributions?','Compare the methods','What datasets were used?','Key limitations?','Summarize findings'].map(s => (
                <button key={s} onClick={() => { setInput(s); inputRef.current?.focus() }}
                  className="text-xs px-3 py-1.5 rounded-full border border-bg-border text-text-muted hover:border-accent-blue/40 hover:text-accent-blue transition-all">
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : messages.map(msg => <MessageBubble key={msg.id} msg={msg} />)}

        {sending && (
          <div className="flex gap-3">
            <div className="shrink-0 w-7 h-7 rounded-full bg-accent-teal/20 flex items-center justify-center">
              <Bot size={13} className="text-accent-teal" />
            </div>
            <div className="bg-bg-card border border-bg-border rounded-2xl rounded-tl-sm px-4 py-3">
              <div className="flex gap-1.5">
                {[0,150,300].map(d => <div key={d} className="w-2 h-2 bg-accent-teal rounded-full animate-bounce" style={{animationDelay:`${d}ms`}}/>)}
              </div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div className="px-6 py-4 border-t border-bg-border shrink-0">
        <div className="flex gap-3 items-end">
          <textarea ref={inputRef} value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }}
            placeholder="Ask a question… (Enter to send, Shift+Enter for newline)"
            rows={1} className="input flex-1 resize-none text-sm py-3 leading-relaxed"
            style={{ minHeight:'44px', maxHeight:'120px' }}
          />
          <button onClick={send} disabled={!input.trim() || sending}
            className="btn-primary p-3 flex items-center justify-center disabled:opacity-40">
            {sending ? <Loader2 size={16} className="animate-spin"/> : <Send size={16}/>}
          </button>
        </div>
      </div>
    </div>
  )
}


// ── Main Page ─────────────────────────────────────────────────────────────────

export default function ChatPage() {
  const [showPicker, setShowPicker]       = useState(false)
  const [activeSession, setActiveSession] = useState(null)
  const [queuing, setQueuing]             = useState(false)
  const [queueMsg, setQueueMsg]           = useState('')
  const qc = useQueryClient()
  const queueAndWait = useQueueAndWait()

  const { data: sessionsData, isLoading } = useQuery('chat-sessions', listSessions, { refetchInterval: 8000 })
  const sessions = sessionsData?.sessions || []

  const handleStartChat = async (basket) => {
    setShowPicker(false)
    const hasArxiv = basket.some(b => b.source === 'arxiv')
    if (hasArxiv) { setQueuing(true); setQueueMsg(`Queuing ${basket.filter(b => b.source === 'arxiv').length} arXiv paper(s)…`) }

    try {
      const paperIds = await queueAndWait(basket, setQueueMsg)
      if (!paperIds.length) { toast.error('No papers could be prepared'); return }

      const name = basket.slice(0, 2).map(b => (b.title || '').slice(0, 25)).join(' + ')
        + (basket.length > 2 ? ` +${basket.length - 2} more` : '')

      const session = await createSession(paperIds, name)
      qc.invalidateQueries('chat-sessions')
      setActiveSession(session.id)
      toast.success('Chat session ready!')
    } catch { toast.error('Failed to create session') }
    finally   { setQueuing(false); setQueueMsg('') }
  }

  const handleDelete = async (id) => {
    if (!confirm('Delete session?')) return
    try { await deleteSession(id); qc.invalidateQueries('chat-sessions'); if (activeSession === id) setActiveSession(null) }
    catch { toast.error('Failed to delete') }
  }

  return (
    <div className="flex h-[calc(100vh-56px)] overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 shrink-0 border-r border-bg-border flex flex-col bg-bg-dark/30">
        <div className="px-4 py-4 border-b border-bg-border">
          <button onClick={() => setShowPicker(true)}
            className="btn-primary w-full flex items-center justify-center gap-2 text-sm py-2.5">
            <Plus size={14}/> New Chat
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-3 space-y-1">
          {isLoading ? <div className="flex justify-center py-8"><Loader2 size={16} className="animate-spin text-accent-blue"/></div>
          : sessions.length === 0 ? (
            <div className="text-center py-12 text-text-muted">
              <MessageSquare size={24} className="mx-auto mb-2 opacity-30"/>
              <p className="text-xs">No sessions yet</p>
              <p className="text-xs mt-1 opacity-60">Click "New Chat" to begin</p>
            </div>
          ) : sessions.map(s => (
            <button key={s.id} onClick={() => setActiveSession(s.id)}
              className={`w-full text-left px-3 py-2.5 rounded-lg text-sm transition-all ${
                activeSession === s.id
                  ? 'bg-accent-blue/10 text-accent-blue border border-accent-blue/20'
                  : 'text-text-secondary hover:text-text-primary hover:bg-bg-hover'
              }`}>
              <div className="flex items-start justify-between gap-1">
                <p className="font-medium leading-snug truncate flex-1">{s.name}</p>
                {activeSession === s.id && <ChevronRight size={12} className="shrink-0 mt-0.5"/>}
              </div>
              <p className="text-xs text-text-muted mt-0.5 truncate">
                {s.papers?.length} paper{s.papers?.length !== 1 ? 's' : ''} · {s.messages?.length || 0} msgs
              </p>
            </button>
          ))}
        </div>
        <div className="p-4 border-t border-bg-border">
          <p className="text-xs text-text-muted">RAG over paper embeddings + Claude</p>
        </div>
      </aside>

      {/* Main */}
      {queuing ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-5 text-center p-8">
          <div className="w-16 h-16 rounded-2xl bg-accent-orange/10 flex items-center justify-center">
            <Clock size={26} className="text-accent-orange animate-pulse"/>
          </div>
          <div>
            <p className="font-display font-semibold text-text-primary mb-2">Preparing papers…</p>
            <p className="text-sm text-text-muted max-w-sm">{queueMsg}</p>
          </div>
          <div className="flex items-center gap-2 text-xs text-text-muted">
            <Loader2 size={13} className="animate-spin"/> arXiv papers are being parsed — this takes a minute
          </div>
        </div>
      ) : activeSession ? (
        <ChatWindow key={activeSession} sessionId={activeSession} onDelete={handleDelete}/>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center gap-6 text-center p-8">
          <div className="w-16 h-16 rounded-2xl bg-accent-blue/10 flex items-center justify-center">
            <MessageSquare size={26} className="text-accent-blue"/>
          </div>
          <div>
            <h2 className="font-display font-bold text-xl text-text-primary mb-2">Chat with your papers</h2>
            <p className="text-sm text-text-muted max-w-sm">
              Pick from your library or search arXiv — arXiv papers are automatically parsed before the chat starts.
            </p>
          </div>
          <button onClick={() => setShowPicker(true)} className="btn-primary flex items-center gap-2">
            <Plus size={15}/> New Chat
          </button>
        </div>
      )}

      {showPicker && <PaperPickerModal onConfirm={handleStartChat} onClose={() => setShowPicker(false)}/>}
    </div>
  )
}