import { useState } from 'react'
import { useQuery } from 'react-query'
import { Link } from 'react-router-dom'
import { FileText, Search, Filter } from 'lucide-react'
import { getPapers } from '../utils/api'
import PaperCard from '../components/paper/PaperCard'

const STATUSES = ['', 'ingested', 'scripted', 'done', 'failed']

export default function PaperList() {
  const [q,      setQ]      = useState('')
  const [status, setStatus] = useState('')
  const [offset, setOffset] = useState(0)
  const limit = 20

  const { data: papers = [], isLoading } = useQuery(
    ['papers', q, status, offset],
    () => getPapers({ q: q || undefined, status: status || undefined, limit, offset }),
    { keepPreviousData: true }
  )

  return (
    <div className="p-4 md:p-8 space-y-5 md:space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="font-display font-bold text-xl md:text-2xl text-text-primary">All Papers</h1>
          <p className="text-text-muted text-xs md:text-sm mt-0.5">{papers.length} papers loaded</p>
        </div>
        <Link to="/ingest" className="btn-primary flex items-center gap-2 text-sm shrink-0">
          + Add Paper
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
          <input
            value={q}
            onChange={e => { setQ(e.target.value); setOffset(0) }}
            placeholder="Search titles, abstracts…"
            className="input pl-8 text-sm"
          />
        </div>
        <div className="relative sm:w-44">
          <Filter size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
          <select
            value={status}
            onChange={e => { setStatus(e.target.value); setOffset(0) }}
            className="input pl-8 pr-4 text-sm appearance-none w-full"
          >
            <option value="">All statuses</option>
            {STATUSES.filter(Boolean).map(s => (
              <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
            ))}
          </select>
        </div>
      </div>

      {/* List */}
      {isLoading ? (
        <div className="grid gap-3">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="card p-5 animate-pulse">
              <div className="h-4 bg-bg-hover rounded w-2/3 mb-2" />
              <div className="h-3 bg-bg-hover rounded w-1/3" />
            </div>
          ))}
        </div>
      ) : papers.length === 0 ? (
        <div className="card p-10 md:p-16 text-center space-y-3">
          <FileText size={36} className="text-text-dim mx-auto" />
          <p className="font-display font-semibold text-text-secondary">No papers found</p>
          <p className="text-text-muted text-sm">Try adjusting your filters or add a new paper.</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {papers.map((p, i) => <PaperCard key={p.id} paper={p} index={i} />)}
        </div>
      )}

      {/* Pagination */}
      {papers.length === limit && (
        <div className="flex justify-center gap-3">
          <button
            disabled={offset === 0}
            onClick={() => setOffset(o => Math.max(0, o - limit))}
            className="btn-secondary text-sm disabled:opacity-40"
          >← Previous</button>
          <button
            onClick={() => setOffset(o => o + limit)}
            className="btn-secondary text-sm"
          >Next →</button>
        </div>
      )}
    </div>
  )
}