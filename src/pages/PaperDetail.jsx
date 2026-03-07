import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useQuery } from 'react-query'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowLeft, ExternalLink, FileText, BookOpen,
  Network, Globe, Play, Scroll, Calendar, Users
} from 'lucide-react'
import { getPaper, getScript, getLineage, getWebCtx } from '../utils/api'
import CitationGraph from '../components/graph/CitationGraph'
import ScriptViewer from '../components/paper/ScriptViewer'
import VideoPlayer from '../components/video/VideoPlayer'
import WebContextPanel from '../components/paper/WebContextPanel'

const TABS = [
  { key: 'overview', label: 'Overview',  icon: FileText  },
  { key: 'video',    label: 'Video',     icon: Play      },
  { key: 'script',   label: 'Script',    icon: Scroll    },
  { key: 'graph',    label: 'Citations', icon: Network   },
  { key: 'web',      label: 'Web',       icon: Globe     },
]

export default function PaperDetail() {
  const { id }  = useParams()
  const [tab, setTab] = useState('overview')

  const { data: paper } = useQuery(['paper', id], () => getPaper(id), {
    refetchInterval: paper => ['done', 'failed'].includes(paper?.status) ? false : 5000,
  })
  const { data: script  } = useQuery(['script',  id], () => getScript(id),  { enabled: !!paper?.script })
  const { data: lineage } = useQuery(['lineage', id], () => getLineage(id),  { enabled: tab === 'graph' })
  const { data: webCtx  } = useQuery(['webctx',  id], () => getWebCtx(id),   { enabled: tab === 'web' })

  if (!paper) {
    return (
      <div className="p-8 flex items-center justify-center h-full">
        <div className="text-text-muted font-mono text-sm animate-pulse">Loading paper…</div>
      </div>
    )
  }

  const video = paper.video

  return (
    <div className="flex flex-col h-full">
      {/* Sticky header */}
      <div className="border-b border-bg-border bg-bg-dark/80 backdrop-blur-sm px-4 md:px-8 py-3 md:py-4">
        <Link to="/papers" className="flex items-center gap-1.5 text-xs text-text-muted hover:text-text-primary transition-colors mb-2 w-fit">
          <ArrowLeft size={12} />
          Back
        </Link>
        <div className="flex items-start gap-3">
          <div className="flex-1 min-w-0">
            <h1 className="font-display font-bold text-base md:text-lg text-text-primary leading-snug">
              {paper.title}
            </h1>
            <div className="flex items-center flex-wrap gap-x-3 gap-y-1 mt-1.5">
              {paper.authors?.slice(0, 3).map((a, i) => (
                <span key={i} className="text-xs text-text-muted flex items-center gap-1">
                  <Users size={9} />
                  {a}
                </span>
              ))}
              {paper.year && (
                <span className="text-xs text-text-dim flex items-center gap-1">
                  <Calendar size={9} />
                  {paper.year}
                </span>
              )}
              {paper.venue && (
                <span className="hidden sm:flex text-xs text-text-dim items-center gap-1">
                  <BookOpen size={9} />
                  {paper.venue}
                </span>
              )}
              {paper.arxiv_id && (
                <a
                  href={`https://arxiv.org/abs/${paper.arxiv_id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-accent-blue hover:underline flex items-center gap-1"
                >
                  <ExternalLink size={9} />
                  arXiv:{paper.arxiv_id}
                </a>
              )}
            </div>
          </div>
          <span className={`badge border shrink-0 text-xs ${
            paper.status === 'done'   ? 'bg-teal-500/10   text-accent-teal   border-teal-500/20' :
            paper.status === 'failed' ? 'bg-red-500/10    text-accent-red    border-red-500/20'  :
                                        'bg-blue-500/10   text-accent-blue   border-blue-500/20'
          }`}>
            {paper.status}
          </span>
        </div>

        {/* Tabs — horizontally scrollable on mobile */}
        <div className="flex gap-0.5 mt-3 -mb-px overflow-x-auto scrollbar-none">
          {TABS.map(({ key, label, icon: Icon }) => {
            const disabled = (key === 'video' && !video?.output_path) ||
                             (key === 'script' && !paper.script)
            return (
              <button
                key={key}
                disabled={disabled}
                onClick={() => setTab(key)}
                className={`flex items-center gap-1.5 px-3 md:px-4 py-2 text-xs font-display font-medium border-b-2 transition-all whitespace-nowrap shrink-0
                  ${tab === key
                    ? 'border-accent-blue text-accent-blue'
                    : disabled
                    ? 'border-transparent text-text-dim cursor-not-allowed'
                    : 'border-transparent text-text-muted hover:text-text-secondary'
                  }`}
              >
                <Icon size={12} />
                {label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto p-4 md:p-8">
        <AnimatePresence mode="wait">
          <motion.div
            key={tab}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
          >
            {tab === 'overview' && (
              <div className="space-y-5 max-w-3xl">
                {paper.abstract && (
                  <div className="space-y-2">
                    <p className="section-label">Abstract</p>
                    <p className="text-text-secondary text-sm leading-relaxed font-body">
                      {paper.abstract}
                    </p>
                  </div>
                )}
                <div className="grid grid-cols-3 gap-3">
                  <div className="card p-3 md:p-4 text-center">
                    <p className="text-xl md:text-2xl font-display font-bold text-text-primary">
                      {paper.sections_count || 0}
                    </p>
                    <p className="text-xs text-text-muted mt-1">Sections</p>
                  </div>
                  <div className="card p-3 md:p-4 text-center">
                    <p className="text-xl md:text-2xl font-display font-bold text-text-primary">
                      {paper.references_count || 0}
                    </p>
                    <p className="text-xs text-text-muted mt-1">References</p>
                  </div>
                  <div className="card p-3 md:p-4 text-center">
                    <p className={`text-xl md:text-2xl font-display font-bold ${
                      paper.script?.fact_check_passed ? 'text-accent-teal' : 'text-text-dim'
                    }`}>
                      {paper.script?.fact_check_passed ? '✓' : '–'}
                    </p>
                    <p className="text-xs text-text-muted mt-1">Fact-check</p>
                  </div>
                </div>
              </div>
            )}

            {tab === 'video' && video?.output_path && (
              <div className="max-w-3xl">
                <VideoPlayer videoPath={video.output_path} jobId={video.job_id} duration={video.duration} />
              </div>
            )}

            {tab === 'script' && script && (
              <div className="max-w-3xl">
                <ScriptViewer script={script} />
              </div>
            )}

            {tab === 'graph' && (
              <div className="h-96 md:h-[600px]">
                <CitationGraph data={lineage} paperId={id} />
              </div>
            )}

            {tab === 'web' && (
              <div className="max-w-3xl">
                <WebContextPanel ctx={webCtx} />
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  )
}