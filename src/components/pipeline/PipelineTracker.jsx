import { motion } from 'framer-motion'
import { CheckCircle2, Circle, Loader2, AlertCircle, ExternalLink } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAppStore } from '../../store'
import { useJobPoller } from '../../hooks/useJobPoller'

const STAGES = [
  { key: 'ingesting',   label: 'Parse Paper',           desc: 'PDF / HTML / LaTeX extraction' },
  { key: 'embedding',   label: 'Embed & Correlate',     desc: 'SPECTER2 + Qdrant indexing'     },
  { key: 'correlating', label: 'Knowledge Graph',        desc: 'Neo4j citation linking'         },
  { key: 'scripting',   label: 'Generate Script',        desc: 'Claude multi-pass synthesis'    },
  { key: 'tts',         label: 'Narration',              desc: 'ElevenLabs audio generation'    },
  { key: 'assembling',  label: 'Assemble Video',         desc: 'FFmpeg slide + audio merge'     },
  { key: 'done',        label: 'Complete',               desc: 'Video ready'                    },
]

const STAGE_ORDER = STAGES.map(s => s.key)

function stageIndex(status) {
  const idx = STAGE_ORDER.indexOf(status)
  return idx === -1 ? 0 : idx
}

export default function PipelineTracker({ taskId }) {
  useJobPoller(taskId)
  const job      = useAppStore(s => s.activeJobs[taskId])
  const navigate = useNavigate()

  if (!job) return null

  const currentIdx = stageIndex(job.stage)
  const isFailed   = job.status === 'FAILURE' || job.stage === 'failed'
  const isDone     = job.stage === 'done'

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="card p-5 space-y-5"
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="font-display font-semibold text-sm text-text-primary">
            {job.source || 'Processing paper'}
          </h3>
          <p className="text-xs text-text-muted mt-0.5 font-mono">
            Task: {taskId.slice(0, 16)}…
          </p>
        </div>
        <span className={`badge ${
          isFailed ? 'bg-red-500/10 text-accent-red border border-red-500/20' :
          isDone   ? 'bg-teal-500/10 text-accent-teal border border-teal-500/20' :
                     'bg-blue-500/10 text-accent-blue border border-blue-500/20'
        }`}>
          {isFailed ? 'Failed' : isDone ? 'Done' : 'Running'}
        </span>
      </div>

      {/* Progress bar */}
      <div className="space-y-1.5">
        <div className="flex justify-between text-xs font-mono text-text-muted">
          <span>{job.label || 'Processing...'}</span>
          <span>{job.progress || 0}%</span>
        </div>
        <div className="h-1.5 bg-bg-deep rounded-full overflow-hidden">
          <motion.div
            className={`h-full rounded-full ${isFailed ? 'bg-accent-red' : 'bg-accent-blue'}`}
            animate={{ width: `${job.progress || 0}%` }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
          />
        </div>
      </div>

      {/* Stages */}
      <div className="space-y-2">
        {STAGES.map((stage, idx) => {
          const done    = idx < currentIdx || isDone
          const active  = idx === currentIdx && !isDone && !isFailed
          const failed  = isFailed && idx === currentIdx
          const pending = idx > currentIdx && !isDone

          return (
            <div key={stage.key} className={`flex items-center gap-3 py-1.5 px-2 rounded-lg transition-colors
              ${active ? 'bg-accent-blue/5' : ''}`}>
              <div className="shrink-0 w-5 h-5 flex items-center justify-center">
                {done    && <CheckCircle2 size={16} className="text-accent-teal" />}
                {active  && <Loader2 size={16} className="text-accent-blue animate-spin" />}
                {failed  && <AlertCircle size={16} className="text-accent-red" />}
                {pending && <Circle size={16} className="text-text-dim" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className={`text-xs font-display font-medium ${
                  done    ? 'text-text-secondary' :
                  active  ? 'text-text-primary'   :
                  failed  ? 'text-accent-red'      :
                            'text-text-dim'
                }`}>{stage.label}</p>
                {active && (
                  <p className="text-xs text-text-muted">{stage.desc}</p>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Logs (last 3) */}
      {job.logs?.length > 0 && (
        <div className="bg-bg-deep rounded-lg p-3 space-y-1 font-mono text-xs max-h-24 overflow-y-auto">
          {job.logs.slice(-5).map((log, i) => (
            <div key={i} className={`flex gap-2 ${log.type === 'error' ? 'text-accent-red' : 'text-text-muted'}`}>
              <span className="text-text-dim shrink-0">{log.time}</span>
              <span>{log.message}</span>
            </div>
          ))}
        </div>
      )}

      {/* Actions */}
      {isDone && job.paper_id && (
        <button
          onClick={() => navigate(`/papers/${job.paper_id}`)}
          className="btn-primary w-full flex items-center justify-center gap-2 text-sm"
        >
          <ExternalLink size={14} />
          View Paper & Video
        </button>
      )}
    </motion.div>
  )
}
