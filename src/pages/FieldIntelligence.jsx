/**
 * src/pages/FieldIntelligence.jsx
 *
 * Search a field/topic → triggers arXiv fetch + Claude synthesis
 * Shows: History timeline, Evolution phases, SOTA, Next Steps, Key Papers
 */

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from 'react-query'
import { Search, RefreshCw, BookOpen, TrendingUp, Zap, Compass, Star, Loader2, AlertCircle } from 'lucide-react'
import axios from 'axios'

const api = axios.create({ baseURL: '/api' })

// ── API helpers ──────────────────────────────────────────────────────────────
const startAnalysis = (topic, category, maxPapers) =>
  api.post('/fields/analyse', { topic, category, max_papers: maxPapers }).then(r => r.data)

const getFieldStatus = (category) =>
  api.get(`/fields/${encodeURIComponent(category)}/status`).then(r => r.data)

const getFieldAnalysis = (category) =>
  api.get(`/fields/${encodeURIComponent(category)}`).then(r => r.data)

const getJob = (taskId) =>
  api.get(`/jobs/${taskId}`).then(r => r.data)


// ── Sub-components ────────────────────────────────────────────────────────────

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
          {phase.drivers?.length > 0 && (
            <div className="mt-2">
              <p className="text-xs text-text-muted mb-1.5 uppercase tracking-wide">What drove change</p>
              <ul className="list-disc list-inside space-y-0.5">
                {phase.drivers.map((d, j) => (
                  <li key={j} className="text-xs text-text-secondary">{d}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

function SOTAPanel({ sota }) {
  if (!sota || !sota.summary) return <p className="text-text-muted text-sm">No SOTA data available.</p>
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
          <p className="text-xs text-text-muted mb-2 uppercase tracking-wide">Key Benchmarks</p>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border-subtle">
                  <th className="text-left py-1.5 pr-4 text-text-muted font-normal">Benchmark</th>
                  <th className="text-left py-1.5 pr-4 text-text-muted font-normal">Metric</th>
                  <th className="text-left py-1.5 pr-4 text-text-muted font-normal">Best</th>
                  <th className="text-left py-1.5 text-text-muted font-normal">Paper</th>
                </tr>
              </thead>
              <tbody>
                {sota.benchmarks.map((b, i) => (
                  <tr key={i} className="border-b border-border-subtle/50">
                    <td className="py-1.5 pr-4 text-text-primary font-medium">{b.name}</td>
                    <td className="py-1.5 pr-4 text-text-secondary">{b.metric}</td>
                    <td className="py-1.5 pr-4 text-accent-teal font-mono">{b.current_best}</td>
                    <td className="py-1.5 text-text-muted">{(b.achieved_by || '').slice(0, 30)}{(b.achieved_by || '').length > 30 ? '…' : ''}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {sota.remaining_challenges?.length > 0 && (
        <div>
          <p className="text-xs text-text-muted mb-2 uppercase tracking-wide">Remaining Challenges</p>
          <ul className="space-y-1">
            {sota.remaining_challenges.map((c, i) => (
              <li key={i} className="text-sm text-text-secondary flex gap-2">
                <span className="text-accent-red mt-0.5">•</span>{c}
              </li>
            ))}
          </ul>
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
          {step.promising_directions?.length > 0 && (
            <div>
              <p className="text-xs text-text-muted mb-1 uppercase tracking-wide">Promising Directions</p>
              <ul className="space-y-0.5">
                {step.promising_directions.map((d, j) => (
                  <li key={j} className="text-xs text-text-secondary flex gap-2">
                    <span className="text-accent-teal">→</span>{d}
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
                  ? <a href={`https://arxiv.org/abs/${p.arxiv_id}`} target="_blank" rel="noreferrer"
                       className="hover:text-accent-blue transition-colors">{p.title}</a>
                  : p.title}
              </span>
              <span className="text-xs text-text-muted font-mono shrink-0">{p.year}</span>
            </div>
            <p className="text-xs text-text-muted mt-0.5">{p.why_important}</p>
          </div>
        </div>
      ))}
    </div>
  )
}

function ProgressBar({ label, progress }) {
  return (
    <div className="space-y-2">
      <div className="flex justify-between text-xs text-text-muted">
        <span>{label}</span>
        <span>{progress}%</span>
      </div>
      <div className="h-1.5 bg-bg-deep rounded-full overflow-hidden">
        <div
          className="h-full bg-accent-blue rounded-full transition-all duration-500"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  )
}


// ── Main page ─────────────────────────────────────────────────────────────────

export default function FieldIntelligence() {
  const [topic, setTopic]           = useState('')
  const [category, setCategory]     = useState('')
  const [maxPapers, setMaxPapers]   = useState(500)
  const [activeCategory, setActive] = useState(null)   // currently displayed
  const [taskId, setTaskId]         = useState(null)
  const [taskProgress, setProgress] = useState(null)

  // Poll task status
  const { data: jobData } = useQuery(
    ['field-job', taskId],
    () => getJob(taskId),
    {
      enabled: !!taskId,
      refetchInterval: (data) => {
        if (!data) return 3000
        const done = data?.status === 'SUCCESS' || data?.status === 'FAILURE'
        return done ? false : 3000
      },
      onSuccess: (data) => {
        if (data?.meta) setProgress(data.meta)
        if (data?.status === 'SUCCESS') {
          setTaskId(null)
          setProgress(null)
        }
      },
    }
  )

  // Fetch field analysis
  const { data: analysis, isLoading: analysisLoading, refetch } = useQuery(
    ['field-analysis', activeCategory],
    () => getFieldAnalysis(activeCategory),
    {
      enabled: !!activeCategory,
      retry: false,
      refetchInterval: (data) => {
        // If still analysing, poll every 10s
        if (!data) return false
        if (data?.status === 'analysing' || data?.status === 'pending') return 10000
        return false
      },
    }
  )

  const startMutation = useMutation(
    ({ topic, category, maxPapers }) => startAnalysis(topic, category, maxPapers),
    {
      onSuccess: (data) => {
        setTaskId(data.task_id)
        setActive(data.category || topic.toLowerCase())
      },
    }
  )

  const handleSearch = () => {
    if (!topic.trim()) return
    const cat = category.trim() || topic.toLowerCase().replace(/\s+/g, '_')
    startMutation.mutate({ topic: topic.trim(), category: category.trim(), maxPapers })
    setActive(cat)
  }

  const isRunning = !!taskId || jobData?.status === 'STARTED'
  const stage = taskProgress?.stage || 'idle'
  const progress = taskProgress?.progress || 0
  const progressLabel = taskProgress?.label || 'Processing…'

  return (
    <div className="max-w-5xl mx-auto space-y-6 p-6">
      {/* Header */}
      <div>
        <h1 className="font-display font-bold text-2xl text-text-primary">Field Intelligence</h1>
        <p className="text-text-secondary text-sm mt-1">
          Search any research topic → get history, evolution, SOTA, and next steps synthesised from arXiv papers.
        </p>
      </div>

      {/* Search bar */}
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
            title="arXiv category (optional)"
          />
          <select
            className="px-3 py-2 bg-bg-deep border border-border-subtle rounded-lg
                       text-sm text-text-primary focus:outline-none focus:border-accent-blue"
            value={maxPapers}
            onChange={e => setMaxPapers(Number(e.target.value))}
            title="Max papers to fetch"
          >
            <option value={100}>100 papers</option>
            <option value={300}>300 papers</option>
            <option value={500}>500 papers</option>
            <option value={1000}>1000 papers</option>
            <option value={1500}>1500 papers</option>
          </select>
          <button
            onClick={handleSearch}
            disabled={!topic.trim() || isRunning}
            className="btn-primary flex items-center gap-2 px-4 py-2 disabled:opacity-50"
          >
            {isRunning
              ? <><Loader2 size={14} className="animate-spin" /> Running</>
              : <><Search size={14} /> Analyse</>}
          </button>
        </div>

        {/* Progress */}
        {isRunning && (
          <ProgressBar label={progressLabel} progress={progress} />
        )}

        {startMutation.isError && (
          <div className="flex items-center gap-2 text-accent-red text-sm">
            <AlertCircle size={14} />
            <span>Failed to start analysis. Is the Celery worker running?</span>
          </div>
        )}
      </div>

      {/* Results */}
      {activeCategory && !isRunning && (
        <>
          {analysisLoading && (
            <div className="flex items-center justify-center py-16 text-text-muted gap-3">
              <Loader2 size={20} className="animate-spin" />
              <span>Loading analysis for <strong>{activeCategory}</strong>…</span>
            </div>
          )}

          {analysis?.status === 'ready' && (
            <div className="space-y-5">
              {/* Meta bar */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="badge bg-teal-500/10 text-accent-teal border border-teal-500/20">
                    {analysis.paper_count} papers analysed
                  </span>
                  <span className="text-xs text-text-muted">
                    Last refreshed: {analysis.last_refreshed
                      ? new Date(analysis.last_refreshed).toLocaleDateString()
                      : 'N/A'}
                  </span>
                </div>
                <button
                  onClick={() => {
                    startMutation.mutate({ topic: activeCategory, category: activeCategory, maxPapers })
                  }}
                  className="flex items-center gap-1.5 text-xs text-text-muted hover:text-text-primary transition-colors"
                >
                  <RefreshCw size={12} /> Refresh
                </button>
              </div>

              {/* Sections grid */}
              <div className="grid grid-cols-1 gap-5">
                <SectionCard icon={BookOpen} title="History" color="text-accent-blue bg-blue-500/5">
                  <EraTimeline history={analysis.history} />
                </SectionCard>

                <SectionCard icon={TrendingUp} title="Evolution" color="text-accent-teal bg-teal-500/5">
                  <EvolutionPhases evolution={analysis.evolution} />
                </SectionCard>

                <SectionCard icon={Zap} title="Current SOTA" color="text-yellow-400 bg-yellow-500/5">
                  <SOTAPanel sota={analysis.sota} />
                </SectionCard>

                <SectionCard icon={Compass} title="Next Steps & Open Problems" color="text-accent-red bg-red-500/5">
                  <NextStepsPanel nextSteps={analysis.next_steps} />
                </SectionCard>

                <SectionCard icon={Star} title="Landmark Papers" color="text-purple-400 bg-purple-500/5">
                  <KeyPapersPanel papers={analysis.key_papers} />
                </SectionCard>
              </div>
            </div>
          )}

          {analysis?.status === 'analysing' && (
            <div className="card p-8 text-center space-y-3">
              <Loader2 size={32} className="animate-spin mx-auto text-accent-blue" />
              <p className="text-text-secondary">
                Analysis in progress for <strong>{activeCategory}</strong>…
              </p>
              <p className="text-text-muted text-sm">
                This page will update automatically when ready.
              </p>
            </div>
          )}

          {!analysis && !analysisLoading && (
            <div className="card p-8 text-center text-text-muted">
              <p>No analysis available yet for <strong>{activeCategory}</strong>.</p>
              <p className="text-sm mt-1">Click Analyse to start.</p>
            </div>
          )}
        </>
      )}
    </div>
  )
}
