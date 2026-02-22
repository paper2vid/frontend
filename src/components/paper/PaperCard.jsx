import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { FileText, Calendar, BookOpen, CheckCircle2, Loader2, AlertCircle, Clock } from 'lucide-react'

const STATUS_CONFIG = {
  done:       { color: 'text-accent-teal',   bg: 'bg-teal-500/10 border-teal-500/20',  icon: CheckCircle2, label: 'Done' },
  failed:     { color: 'text-accent-red',    bg: 'bg-red-500/10  border-red-500/20',   icon: AlertCircle,  label: 'Failed' },
  scripting:  { color: 'text-accent-blue',   bg: 'bg-blue-500/10 border-blue-500/20',  icon: Loader2,      label: 'Scripting', spin: true },
  assembling: { color: 'text-accent-orange', bg: 'bg-orange-500/10 border-orange-500/20', icon: Loader2,   label: 'Assembling', spin: true },
  ingesting:  { color: 'text-accent-blue',   bg: 'bg-blue-500/10 border-blue-500/20',  icon: Loader2,      label: 'Ingesting', spin: true },
  embedding:  { color: 'text-accent-purple', bg: 'bg-purple-500/10 border-purple-500/20', icon: Loader2,   label: 'Embedding', spin: true },
  pending:    { color: 'text-text-muted',    bg: 'bg-bg-border/30 border-bg-border',   icon: Clock,        label: 'Pending' },
}

export default function PaperCard({ paper, index = 0 }) {
  const navigate = useNavigate()
  const cfg = STATUS_CONFIG[paper.status] || STATUS_CONFIG.pending
  const Icon = cfg.icon

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04 }}
      onClick={() => navigate(`/papers/${paper.id}`)}
      className="card-hover p-5 cursor-pointer group"
    >
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 rounded-lg bg-accent-blue/10 flex items-center justify-center shrink-0 mt-0.5 group-hover:bg-accent-blue/20 transition-colors">
          <FileText size={15} className="text-accent-blue" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-display font-semibold text-sm text-text-primary leading-snug line-clamp-2 group-hover:text-accent-blue transition-colors">
            {paper.title || 'Untitled Paper'}
          </h3>
          <div className="flex items-center gap-3 mt-2">
            {paper.authors?.[0] && (
              <span className="text-xs text-text-muted truncate max-w-[140px]">
                {paper.authors[0]}{paper.authors.length > 1 ? ` +${paper.authors.length - 1}` : ''}
              </span>
            )}
            {paper.year && (
              <span className="flex items-center gap-1 text-xs text-text-dim">
                <Calendar size={10} />
                {paper.year}
              </span>
            )}
            {paper.venue && (
              <span className="flex items-center gap-1 text-xs text-text-dim">
                <BookOpen size={10} />
                {paper.venue}
              </span>
            )}
          </div>
        </div>
        <div className={`badge border ${cfg.bg} ${cfg.color} shrink-0`}>
          <Icon size={10} className={cfg.spin ? 'animate-spin' : ''} />
          {cfg.label}
        </div>
      </div>
    </motion.div>
  )
}
