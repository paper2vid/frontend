/**
 * src/pages/FieldIntelligence.jsx
 *
 * Two tabs:
 *  1. arXiv Live Search — hit arXiv API in real-time, show results with
 *     checkboxes, queue selected papers for parsing
 *  2. Field Analysis — synthesize a full field intelligence report
 */

import { useState, useEffect, useRef, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from 'react-query'
import {
  Search, RefreshCw, BookOpen, TrendingUp, Zap, Compass, Star,
  Loader2, AlertCircle, Plus, CheckSquare, Square, ChevronDown,
  ChevronUp, ExternalLink, Filter, ArrowRight, ListChecks,
} from 'lucide-react'
import axios from 'axios'
import toast from 'react-hot-toast'
import { useAppStore } from '../store'

const api = axios.create({ baseURL: '/api' })

// ── API helpers ──────────────────────────────────────────────────────────────
const searchArxiv = (q, category, maxResults, start) =>
  api.get('/arxiv/search', { params: { q, category: category || undefined, max_results: maxResults, start } }).then(r => r.data)

const startAnalysis = (topic, category, maxPapers) =>
  api.post('/fields/analyse', { topic, category, max_papers: maxPapers }).then(r => r.data)

const getFieldStatus = (category) =>
  api.get(`/fields/${encodeURIComponent(category)}/status`).then(r => r.data)

const getFieldAnalysis = (category) =>
  api.get(`/fields/${encodeURIComponent(category)}`).then(r => r.data)

const getJob = (taskId) =>
  api.get(`/jobs/${taskId}`).then(r => r.data)

const queuePaper = (arxivId) =>
  api.post('/papers/ingest/url', { url: arxivId, source_type: 'arxiv_id' }).then(r => r.data)


// ── ArXiv Search Tab ──────────────────────────────────────────────────────────

function ArxivSearchTab() {
  const [query, setQuery]           = useState('')
  const [category, setCategory]     = useState('')
  const [maxResults, setMaxResults] = useState(50)
  const [results, setResults]       = useState([])
  const [total, setTotal]           = useState(0)
  const [loading, setLoading]       = useState(false)
  const [error, setError]           = useState(null)
  const [selected, setSelected]     = useState(new Set())
  const [expanded, setExpanded]     = useState(new Set())
  const [queuing, setQueuing]       = useState(false)
  const [page, setPage]             = useState(0)
  const { addJob } = useAppStore()
  const debounceRef = useRef(null)

  const doSearch = useCallback(async (q, cat, max, start = 0) => {
    if (!q.trim()) return
    setLoading(true)
    setError(null)
    try {
      const data = await searchArxiv(q, cat, max, start)
      if (start === 0) {
        setResults(data.papers || [])
      } else {
        setResults(prev => [...prev, ...(data.papers || [])])
      }
      setTotal(data.total || 0)
    } catch (e) {
      setError(e.message || 'Search failed')
    } finally {
      setLoading(false)
    }
  }, [])

  // Trigger search on input change (debounced)
  useEffect(() => {
    if (!query.trim()) { setResults([]); setTotal(0); return }
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      setPage(0)
      setSelected(new Set())
      doSearch(query, category, maxResults, 0)
    }, 600)
    return () => clearTimeout(debounceRef.current)
  }, [query, category, maxResults])

  const loadMore = () => {
    const nextStart = results.length
    setPage(p => p + 1)
    doSearch(query, category, 25, nextStart)
  }

  const toggleSelect = (arxivId) => {
    setSelected(prev => {
      const next = new Set(prev)
      next.has(arxivId) ? next.delete(arxivId) : next.add(arxivId)
      return next
    })
  }

  const toggleAll = () => {
    if (selected.size === results.length) {
      setSelected(new Set())
    } else {
      setSelected(new Set(results.map(p => p.arxiv_id)))
    }
  }

  const toggleExpand = (arxivId) => {
    setExpanded(prev => {
      const next = new Set(prev)
      next.has(arxivId) ? next.delete(arxivId) : next.add(arxivId)
      return next
    })
  }

  const queueSelected = async () => {
    if (!selected.size) return
    setQueuing(true)
    let success = 0, fail = 0
    for (const arxivId of selected) {
      try {
        const data = await queuePaper(arxivId)
        addJob(data.task_id, { source: arxivId, status: 'queued' })
        success++
      } catch (e) {
        fail++
      }
    }
    setQueuing(false)
    if (success) toast.success(`${success} paper${success > 1 ? 's' : ''} queued for processing!`)
    if (fail) toast.error(`${fail} failed to queue`)
    setSelected(new Set())
  }

  return (
    <div className="space-y-4">
      {/* Search bar */}
      <div className="card p-4 space-y-3">
        <div className="flex gap-3">
          <div className="relative flex-1">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
            <input
              className="w-full pl-9 pr-4 py-2.5 bg-bg-deep border border-border-subtle rounded-lg
                         text-sm text-text-primary placeholder-text-muted focus:outline-none
                         focus:border-accent-blue transition-colors"
              placeholder="Search arXiv — results appear as you type…"
              value={query}
              onChange={e => setQuery(e.target.value)}
            />
          </div>
          <input
            className="w-28 px-3 py-2.5 bg-bg-deep border border-border-subtle rounded-lg
                       text-sm text-text-primary placeholder-text-muted focus:outline-none
                       focus:border-accent-blue transition-colors"
            placeholder="cs.CV"
            value={category}
            onChange={e => setCategory(e.target.value)}
            title="arXiv category (optional)"
          />
          <select
            className="px-3 py-2.5 bg-bg-deep border border-border-subtle rounded-lg
                       text-sm text-text-primary focus:outline-none focus:border-accent-blue"
            value={maxResults}
            onChange={e => setMaxResults(Number(e.target.value))}
          >
            <option value={25}>25</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
            <option value={200}>200</option>
          </select>
        </div>

        {/* Floating action bar when papers selected */}
        {selected.size > 0 && (
          <div className="flex items-center justify-between p-3 rounded-lg bg-accent-blue/10 border border-accent-blue/30">
            <div className="flex items-center gap-2">
              <ListChecks size={15} className="text-accent-blue" />
              <span className="text-sm text-accent-blue font-medium">
                {selected.size} paper{selected.size > 1 ? 's' : ''} selected
              </span>
            </div>
            <button
              onClick={queueSelected}
              disabled={queuing}
              className="btn-primary flex items-center gap-2 py-1.5 px-4 text-sm"
            >
              {queuing
                ? <><Loader2 size={13} className="animate-spin" /> Queuing…</>
                : <><Plus size={13} /> Add to Parse Queue</>
              }
            </button>
          </div>
        )}
      </div>

      {/* Status row */}
      {(results.length > 0 || loading) && (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {loading && <Loader2 size={14} className="animate-spin text-accent-blue" />}
            {results.length > 0 && !loading && (
              <span className="text-sm text-text-muted">
                Showing <span className="text-text-primary font-medium">{results.length}</span>
                {total > results.length && <span> of ~{total.toLocaleString()}</span>} results
              </span>
            )}
          </div>
          {results.length > 0 && (
            <button
              onClick={toggleAll}
              className="flex items-center gap-1.5 text-xs text-text-muted hover:text-accent-blue transition-colors"
            >
              {selected.size === results.length
                ? <><CheckSquare size={13} /> Deselect all</>
                : <><Square size={13} /> Select all</>
              }
            </button>
          )}
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 text-accent-red text-sm p-3 rounded-lg bg-red-500/10 border border-red-500/20">
          <AlertCircle size={14} />
          {error}
        </div>
      )}

      {/* Results */}
      {results.length > 0 && (
        <div className="space-y-2">
          {results.map(paper => {
            const isSelected = selected.has(paper.arxiv_id)
            const isExpanded = expanded.has(paper.arxiv_id)
            return (
              <div
                key={paper.arxiv_id}
                className={`card transition-all duration-200 ${
                  isSelected
                    ? 'border-accent-blue/50 bg-accent-blue/5'
                    : 'hover:border-border-active'
                }`}
              >
                <div className="p-3 flex items-start gap-3">
                  {/* Checkbox */}
                  <button
                    onClick={() => toggleSelect(paper.arxiv_id)}
                    className="mt-0.5 shrink-0 text-text-muted hover:text-accent-blue transition-colors"
                  >
                    {isSelected
                      ? <CheckSquare size={16} className="text-accent-blue" />
                      : <Square size={16} />
                    }
                  </button>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="text-sm font-medium text-text-primary leading-snug">
                        {paper.title}
                      </h3>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {paper.year && (
                          <span className="text-xs font-mono text-accent-teal bg-teal-500/10 px-1.5 py-0.5 rounded">
                            {paper.year}
                          </span>
                        )}
                        {paper.category && (
                          <span className="text-xs font-mono text-text-muted bg-bg-deep px-1.5 py-0.5 rounded border border-border-subtle">
                            {paper.category}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Authors */}
                    {paper.authors?.length > 0 && (
                      <p className="text-xs text-text-muted mt-0.5">
                        {paper.authors.slice(0, 3).join(', ')}
                        {paper.authors.length > 3 && ` +${paper.authors.length - 3} more`}
                      </p>
                    )}

                    {/* Abstract (expandable) */}
                    {paper.abstract && (
                      <div className="mt-2">
                        {isExpanded ? (
                          <p className="text-xs text-text-secondary leading-relaxed">
                            {paper.abstract}
                          </p>
                        ) : (
                          <p className="text-xs text-text-muted line-clamp-2">
                            {paper.abstract}
                          </p>
                        )}
                        <button
                          onClick={() => toggleExpand(paper.arxiv_id)}
                          className="text-xs text-accent-blue hover:underline mt-1 flex items-center gap-1"
                        >
                          {isExpanded
                            ? <><ChevronUp size={11} /> Show less</>
                            : <><ChevronDown size={11} /> Read abstract</>
                          }
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Link */}
                  {paper.abs_url && (
                    <a
                      href={paper.abs_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="shrink-0 text-text-muted hover:text-accent-blue transition-colors mt-0.5"
                      title="Open on arXiv"
                    >
                      <ExternalLink size={13} />
                    </a>
                  )}
                </div>
              </div>
            )
          })}

          {/* Load more */}
          {results.length < total && (
            <button
              onClick={loadMore}
              disabled={loading}
              className="w-full py-2.5 text-sm text-text-muted hover:text-accent-blue border border-border-subtle rounded-lg hover:border-accent-blue/40 transition-all flex items-center justify-center gap-2"
            >
              {loading
                ? <><Loader2 size={13} className="animate-spin" /> Loading…</>
                : <>Load more ({total - results.length} remaining)</>
              }
            </button>
          )}
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && results.length === 0 && query && (
        <div className="text-center py-12 text-text-muted">
          <Search size={32} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm">No results found for "{query}"</p>
        </div>
      )}

      {!query && (
        <div className="text-center py-16 text-text-muted">
          <Search size={40} className="mx-auto mb-4 opacity-20" />
          <p className="text-sm font-medium text-text-secondary mb-2">Search arXiv in real-time</p>
          <p className="text-xs max-w-sm mx-auto">
            Type a topic or keyword — results appear instantly from arXiv.
            Check the papers you want, then click "Add to Parse Queue".
          </p>
        </div>
      )}
    </div>
  )
}


// ── Field Analysis Tab ────────────────────────────────────────────────────────

function SectionCard({ icon: Icon, title, color, children }) {
  return (
    <div className="bg-bg-card border border-border-subtle rounded-xl overflow-hidden">
      <div className={`flex items-center gap-2 px-5 py-3 border-b border-border-subtle ${color}`}>
        <Icon size={16} />
        <h3 className="font-display font-semibold text-sm">{title}</h3>
      </div>
      <div className="p-5">{children}</div>
    </div>
  )
}

function EraTimeline({ history }) {
  if (!history?.length) return <p className="text-text-muted text-sm">No history data available.</p>
  return (
    <div className="relative">
      <div className="absolute left-4 top-0 bottom-0 w-px bg-border-subtle" />
      <div className="space-y-6">
        {history.map((era, i) => (
          <div key={i} className="relative pl-10">
            <div className="absolute left-[10px] top-1.5 w-3 h-3 rounded-full bg-accent-blue border-2 border-bg-card" />
            <div className="text-xs font-mono text-accent-blue mb-1">{era.years}</div>
            <h4 className="font-semibold text-sm text-text-primary mb-1">{era.era}</h4>
            <p className="text-sm text-text-secondary">{era.summary}</p>
            {era.key_papers?.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {era.key_papers.map((p, j) => (
                  <span key={j} className="text-xs px-2 py-0.5 rounded-full bg-bg-deep text-text-muted border border-border-subtle">
                    {p.title?.length > 40 ? p.title.slice(0, 40) + '…' : p.title}
                  </span>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

function EvolutionPhases({ evolution }) {
  if (!evolution?.length) return <p className="text-text-muted text-sm">No evolution data available.</p>
  return (
    <div className="space-y-4">
      {evolution.map((phase, i) => (
        <div key={i} className="p-4 rounded-lg bg-bg-deep border border-border-subtle">
          <div className="flex items-center justify-between mb-2">
            <h4 className="font-semibold text-sm text-text-primary">{phase.phase}</h4>
            <span className="text-xs font-mono text-accent-teal">{phase.years}</span>
          </div>
          <p className="text-sm text-text-secondary mb-3">{phase.description}</p>
          {phase.techniques?.length > 0 && (
            <div>
              <p className="text-xs text-text-muted mb-1.5 uppercase tracking-wide">Techniques</p>
              <div className="flex flex-wrap gap-1.5">
                {phase.techniques.map((t, j) => (
                  <span key={j} className="text-xs px-2 py-0.5 rounded-full bg-blue-500/10 text-accent-blue border border-blue-500/20">{t}</span>
                ))}
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

function SOTAPanel({ sota }) {
  if (!sota?.summary) return <p className="text-text-muted text-sm">No SOTA data available.</p>
  return (
    <div className="space-y-4">
      <p className="text-sm text-text-secondary">{sota.summary}</p>
      {sota.leading_approaches?.length > 0 && (
        <div>
          <p className="text-xs text-text-muted mb-2 uppercase tracking-wide">Leading Approaches</p>
          <div className="flex flex-wrap gap-2">
            {sota.leading_approaches.map((a, i) => (
              <span key={i} className="text-xs px-2.5 py-1 rounded-full bg-teal-500/10 text-accent-teal border border-teal-500/20">{a}</span>
            ))}
          </div>
        </div>
      )}
      {sota.benchmarks?.length > 0 && (
        <div>
          <p className="text-xs text-text-muted mb-2 uppercase tracking-wide">Benchmarks</p>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border-subtle">
                  <th className="text-left pb-2 text-text-muted font-medium">Benchmark</th>
                  <th className="text-left pb-2 text-text-muted font-medium">Metric</th>
                  <th className="text-left pb-2 text-text-muted font-medium">Best</th>
                  <th className="text-left pb-2 text-text-muted font-medium">Paper</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-subtle">
                {sota.benchmarks.map((b, i) => (
                  <tr key={i}>
                    <td className="py-2 text-text-primary">{b.name}</td>
                    <td className="py-2 text-text-muted">{b.metric}</td>
                    <td className="py-2 font-mono text-accent-teal">{b.best_value || b.value}</td>
                    <td className="py-2 text-text-muted truncate max-w-[200px]">{b.paper_title || b.paper || '…'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

function NextStepsPanel({ nextSteps }) {
  if (!nextSteps?.length) return <p className="text-text-muted text-sm">No next steps data available.</p>
  return (
    <div className="space-y-4">
      {nextSteps.map((step, i) => (
        <div key={i} className="p-4 rounded-lg bg-bg-deep border border-border-subtle">
          <h4 className="font-semibold text-sm text-accent-blue mb-2">{step.area}</h4>
          <p className="text-sm text-text-secondary mb-3">{step.description}</p>
          {step.open_problems?.length > 0 && (
            <div className="mb-2">
              <p className="text-xs text-text-muted mb-1 uppercase tracking-wide">Open Problems</p>
              <ul className="space-y-0.5">
                {step.open_problems.map((p, j) => (
                  <li key={j} className="text-xs text-text-secondary flex gap-2">
                    <span className="text-accent-red">?</span>{p}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

function KeyPapersPanel({ papers }) {
  if (!papers?.length) return <p className="text-text-muted text-sm">No key papers identified.</p>
  return (
    <div className="space-y-3">
      {papers.map((p, i) => (
        <div key={i} className="flex gap-3">
          <span className="text-text-muted text-xs font-mono w-5 mt-0.5 shrink-0">{i + 1}.</span>
          <div>
            <div className="flex items-start gap-2 flex-wrap">
              <span className="text-sm font-medium text-text-primary">
                {p.arxiv_id
                  ? <a href={`https://arxiv.org/abs/${p.arxiv_id}`} target="_blank" rel="noopener noreferrer"
                       className="hover:text-accent-blue transition-colors">{p.title}</a>
                  : p.title}
              </span>
              {p.year && <span className="text-xs font-mono text-accent-teal">{p.year}</span>}
            </div>
            {p.why_important && <p className="text-xs text-text-muted mt-0.5">{p.why_important}</p>}
          </div>
        </div>
      ))}
    </div>
  )
}

function FieldAnalysisTab() {
  const [topic, setTopic]         = useState('')
  const [category, setCategory]   = useState('')
  const [maxPapers, setMaxPapers] = useState(300)
  const [taskId, setTaskId]       = useState(null)
  const [analysisKey, setAnalysisKey] = useState(null) // category slug used to fetch
  const [taskProgress, setTaskProgress] = useState(null)
  const [activeTab, setActiveTab] = useState('history')
  const qc = useQueryClient()

  // Poll job progress
  const { data: jobData } = useQuery(
    ['job', taskId],
    () => getJob(taskId),
    {
      enabled: !!taskId,
      refetchInterval: d => d?.status === 'SUCCESS' || d?.status === 'FAILURE' ? false : 2000,
      onSuccess: d => {
        setTaskProgress(d?.result)
        if (d?.status === 'SUCCESS' && analysisKey) {
          qc.invalidateQueries(['field-analysis', analysisKey])
        }
      },
    }
  )

  // Fetch analysis result
  const { data: analysis, isLoading: analysisLoading } = useQuery(
    ['field-analysis', analysisKey],
    () => getFieldAnalysis(analysisKey),
    { enabled: !!analysisKey, retry: false }
  )

  const handleSearch = async () => {
    if (!topic.trim()) return
    const slug = (category || topic).trim()
    try {
      const data = await startAnalysis(topic, category, maxPapers)
      setTaskId(data.task_id)
      setAnalysisKey(slug)
    } catch (e) {
      toast.error('Failed to start analysis')
    }
  }

  const isRunning = taskId && !['SUCCESS', 'FAILURE'].includes(jobData?.status)
  const stage = taskProgress?.stage || 'idle'
  const progress = taskProgress?.progress || 0
  const progressLabel = taskProgress?.label || 'Processing…'

  const TABS = [
    { key: 'history',   label: 'History',   icon: BookOpen   },
    { key: 'evolution', label: 'Evolution',  icon: TrendingUp },
    { key: 'sota',      label: 'SOTA',       icon: Zap        },
    { key: 'next',      label: 'Next Steps', icon: Compass    },
    { key: 'papers',    label: 'Key Papers', icon: Star       },
  ]

  return (
    <div className="space-y-6">
      <div className="card p-4 space-y-3">
        <div className="flex gap-3">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
            <input
              className="w-full pl-9 pr-4 py-2 bg-bg-deep border border-border-subtle rounded-lg
                         text-sm text-text-primary placeholder-text-muted focus:outline-none
                         focus:border-accent-blue transition-colors"
              placeholder="e.g. OCR, optical character recognition, vision transformers…"
              value={topic}
              onChange={e => setTopic(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSearch()}
            />
          </div>
          <input
            className="w-32 px-3 py-2 bg-bg-deep border border-border-subtle rounded-lg
                       text-sm text-text-primary placeholder-text-muted focus:outline-none
                       focus:border-accent-blue transition-colors"
            placeholder="cs.CV"
            value={category}
            onChange={e => setCategory(e.target.value)}
          />
          <select
            className="px-3 py-2 bg-bg-deep border border-border-subtle rounded-lg
                       text-sm text-text-primary focus:outline-none focus:border-accent-blue"
            value={maxPapers}
            onChange={e => setMaxPapers(Number(e.target.value))}
          >
            {[100, 300, 500, 1000, 1500].map(n => (
              <option key={n} value={n}>{n} papers</option>
            ))}
          </select>
          <button
            onClick={handleSearch}
            disabled={!topic.trim() || isRunning}
            className="btn-primary flex items-center gap-2 px-4 py-2 disabled:opacity-50"
          >
            {isRunning
              ? <><Loader2 size={14} className="animate-spin" /> Analysing…</>
              : <><Zap size={14} /> Analyse Field</>
            }
          </button>
        </div>

        {isRunning && (
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs text-text-muted font-mono">
              <span>{progressLabel}</span>
              <span>{progress}%</span>
            </div>
            <div className="h-1.5 bg-bg-deep rounded-full overflow-hidden">
              <div
                className="h-full bg-accent-blue rounded-full transition-all duration-700"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {analysisLoading && (
        <div className="flex items-center justify-center gap-2 py-12 text-text-muted">
          <Loader2 size={20} className="animate-spin text-accent-blue" />
          <span className="text-sm">Loading analysis…</span>
        </div>
      )}

      {analysis && !analysisLoading && (
        <>
          {/* Sub-tabs */}
          <div className="flex gap-1 p-1 bg-bg-dark rounded-xl border border-bg-border">
            {TABS.map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => setActiveTab(key)}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-medium transition-all
                  ${activeTab === key
                    ? 'bg-accent-blue/10 text-accent-blue border border-accent-blue/20'
                    : 'text-text-muted hover:text-text-secondary'
                  }`}
              >
                <Icon size={13} />
                {label}
              </button>
            ))}
          </div>

          <div>
            {activeTab === 'history'   && <SectionCard icon={BookOpen} title="Historical Evolution" color="text-accent-blue bg-blue-500/5"><EraTimeline history={analysis.history} /></SectionCard>}
            {activeTab === 'evolution' && <SectionCard icon={TrendingUp} title="Phase Transitions" color="text-accent-purple bg-purple-500/5"><EvolutionPhases evolution={analysis.evolution} /></SectionCard>}
            {activeTab === 'sota'      && <SectionCard icon={Zap} title="State of the Art" color="text-accent-teal bg-teal-500/5"><SOTAPanel sota={analysis.sota} /></SectionCard>}
            {activeTab === 'next'      && <SectionCard icon={Compass} title="Next Steps & Open Problems" color="text-accent-orange bg-orange-500/5"><NextStepsPanel nextSteps={analysis.next_steps} /></SectionCard>}
            {activeTab === 'papers'    && <SectionCard icon={Star} title="Landmark Papers" color="text-accent-yellow bg-yellow-500/5"><KeyPapersPanel papers={analysis.key_papers} /></SectionCard>}
          </div>
        </>
      )}
    </div>
  )
}


// ── Main Page ─────────────────────────────────────────────────────────────────

export default function FieldIntelligence() {
  const [tab, setTab] = useState('search')

  return (
    <div className="max-w-5xl mx-auto space-y-6 p-6">
      <div>
        <h1 className="font-display font-bold text-2xl text-text-primary">Field Intelligence</h1>
        <p className="text-text-secondary text-sm mt-1">
          Search arXiv in real-time and queue papers, or synthesize a full field intelligence report.
        </p>
      </div>

      {/* Tab switcher */}
      <div className="flex gap-1 p-1 bg-bg-dark rounded-xl border border-bg-border w-fit">
        <button
          onClick={() => setTab('search')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all
            ${tab === 'search'
              ? 'bg-accent-blue text-white shadow-lg shadow-blue-500/20'
              : 'text-text-muted hover:text-text-secondary'
            }`}
        >
          <Search size={14} />
          arXiv Search
        </button>
        <button
          onClick={() => setTab('analysis')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all
            ${tab === 'analysis'
              ? 'bg-accent-blue text-white shadow-lg shadow-blue-500/20'
              : 'text-text-muted hover:text-text-secondary'
            }`}
        >
          <Zap size={14} />
          Field Analysis
        </button>
      </div>

      {tab === 'search'   && <ArxivSearchTab />}
      {tab === 'analysis' && <FieldAnalysisTab />}
    </div>
  )
}
