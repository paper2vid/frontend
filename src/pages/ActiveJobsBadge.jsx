import { useNavigate } from 'react-router-dom'
import { Loader2, X } from 'lucide-react'
import { useAppStore } from '../../store'

export default function ActiveJobsBadge({ onStopTask }) {
  const activeJobs = useAppStore(s => s.activeJobs)
  const jobs = Object.entries(activeJobs)

  if (!jobs.length) return null

  return (
    <div className="card p-3 space-y-2">
      <p className="section-label">Processing</p>
      {jobs.slice(0, 4).map(([taskId, job]) => (
        <div key={taskId} className="space-y-1.5">
          <div className="flex items-center justify-between gap-1">
            <span className="text-xs text-text-secondary truncate max-w-[100px]">
              {job.source || taskId.slice(0, 8)}
            </span>
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-mono text-text-muted">
                {job.progress || 0}%
              </span>
              {onStopTask && (
                <button
                  onClick={() => onStopTask(taskId)}
                  className="text-text-muted hover:text-accent-red transition-colors"
                  title="Cancel this task"
                >
                  <X size={10} />
                </button>
              )}
            </div>
          </div>
          <div className="h-1 bg-bg-deep rounded-full overflow-hidden">
            <div
              className="h-full bg-accent-blue rounded-full transition-all duration-700"
              style={{ width: `${job.progress || 0}%` }}
            />
          </div>
          <p className="text-xs text-text-muted truncate flex items-center gap-1.5">
            <Loader2 size={10} className="animate-spin shrink-0" />
            {job.label || job.status || 'Processing...'}
          </p>
        </div>
      ))}
    </div>
  )
}
