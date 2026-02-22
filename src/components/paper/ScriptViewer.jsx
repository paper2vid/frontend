import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown, ChevronRight, Copy, CheckCheck } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import toast from 'react-hot-toast'

const SEGMENT_META = {
  hook:              { label: 'Hook',              color: 'text-accent-orange', border: 'border-accent-orange/30', order: 1 },
  background:        { label: 'Background',        color: 'text-accent-blue',   border: 'border-accent-blue/30',   order: 2 },
  problem_statement: { label: 'Problem',           color: 'text-accent-teal',   border: 'border-accent-teal/30',   order: 3 },
  prior_work:        { label: 'Prior Work',        color: 'text-text-secondary',border: 'border-bg-border',        order: 4 },
  approach:          { label: 'Approach',          color: 'text-accent-blue',   border: 'border-accent-blue/30',   order: 5 },
  key_results:       { label: 'Key Results',       color: 'text-accent-teal',   border: 'border-accent-teal/30',   order: 6 },
  limitations:       { label: 'Limitations',       color: 'text-accent-orange', border: 'border-accent-orange/30', order: 7 },
  significance:      { label: 'Significance',      color: 'text-accent-purple', border: 'border-bg-border',        order: 8 },
  field_context:     { label: 'Field Context',     color: 'text-text-secondary',border: 'border-bg-border',        order: 9 },
  outro:             { label: 'Outro',             color: 'text-text-muted',    border: 'border-bg-border',        order: 10 },
}

function SegmentBlock({ segKey, text }) {
  const [expanded, setExpanded] = useState(segKey === 'hook')
  const [copied, setCopied]     = useState(false)
  const meta = SEGMENT_META[segKey] || { label: segKey, color: 'text-text-secondary', border: 'border-bg-border' }

  const copy = (e) => {
    e.stopPropagation()
    navigator.clipboard.writeText(text)
    setCopied(true)
    toast.success('Copied to clipboard')
    setTimeout(() => setCopied(false), 2000)
  }

  const wordCount = text.split(/\s+/).length
  const readMins  = Math.ceil(wordCount / 130) // ~130 wpm narration

  return (
    <div className={`border rounded-xl overflow-hidden ${meta.border} bg-bg-card`}>
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-3 px-5 py-3.5 hover:bg-bg-hover transition-colors text-left"
      >
        <span className={`section-label ${meta.color}`}>{meta.label}</span>
        <span className="text-xs text-text-dim font-mono ml-auto">
          ~{readMins}m · {wordCount}w
        </span>
        {expanded
          ? <ChevronDown size={14} className="text-text-muted shrink-0" />
          : <ChevronRight size={14} className="text-text-muted shrink-0" />
        }
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <div className="px-5 pb-5 pt-1 relative">
              <button
                onClick={copy}
                className="absolute top-2 right-5 p-1.5 rounded-md hover:bg-bg-hover text-text-dim hover:text-text-secondary transition-colors"
              >
                {copied ? <CheckCheck size={13} className="text-accent-teal" /> : <Copy size={13} />}
              </button>
              <div className="prose prose-sm prose-invert max-w-none text-text-secondary leading-relaxed font-body text-sm pr-8">
                <ReactMarkdown>{text}</ReactMarkdown>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default function ScriptViewer({ script }) {
  const [showFull, setShowFull] = useState(false)
  if (!script) return null

  const segments = script.segments || {}
  const sorted   = Object.entries(segments)
    .filter(([, v]) => v)
    .sort(([a], [b]) => (SEGMENT_META[a]?.order || 99) - (SEGMENT_META[b]?.order || 99))

  const totalWords = Object.values(segments).join(' ').split(/\s+/).length
  const totalMins  = Math.ceil(totalWords / 130)

  return (
    <div className="space-y-3">
      {/* Meta bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4 text-xs font-mono text-text-muted">
          <span>~{totalMins} min video</span>
          <span>{totalWords.toLocaleString()} words</span>
          {script.fact_check_passed !== undefined && (
            <span className={script.fact_check_passed ? 'text-accent-teal' : 'text-accent-orange'}>
              {script.fact_check_passed ? '✓ Fact-checked' : '⚠ Review needed'}
            </span>
          )}
          <span className="text-text-dim">{script.model_used}</span>
        </div>
        <button
          onClick={() => setShowFull(!showFull)}
          className="text-xs text-accent-blue hover:underline"
        >
          {showFull ? 'Segment view' : 'Full script'}
        </button>
      </div>

      {showFull ? (
        <div className="card p-5">
          <pre className="whitespace-pre-wrap font-body text-sm text-text-secondary leading-relaxed">
            {script.full_script}
          </pre>
        </div>
      ) : (
        <div className="space-y-2">
          {sorted.map(([key, text]) => (
            <SegmentBlock key={key} segKey={key} text={text} />
          ))}
        </div>
      )}
    </div>
  )
}
