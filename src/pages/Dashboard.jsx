import { useQuery } from 'react-query'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { FileText, Film, Network, Plus, ArrowRight, TrendingUp } from 'lucide-react'
import { getPapers, getVideos } from '../utils/api'
import PaperCard from '../components/paper/PaperCard'

function StatCard({ label, value, icon: Icon, color, to }) {
  return (
    <Link to={to}>
      <motion.div
        whileHover={{ y: -2 }}
        className="card-hover p-5 flex items-center gap-4"
      >
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color}`}>
          <Icon size={18} className="text-white" />
        </div>
        <div>
          <p className="text-2xl font-display font-bold text-text-primary">{value}</p>
          <p className="text-xs text-text-muted mt-0.5">{label}</p>
        </div>
      </motion.div>
    </Link>
  )
}

export default function Dashboard() {
  const { data: papers = [] } = useQuery('papers', () => getPapers({ limit: 20 }), {
    refetchInterval: 8000,
  })
  const { data: videos = [] } = useQuery('videos', getVideos)

  const done    = papers.filter(p => p.status === 'done').length
  const active  = papers.filter(p => !['done', 'failed', 'pending'].includes(p.status)).length
  const recent  = papers.slice(0, 6)

  return (
    <div className="p-8 space-y-8">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-2xl bg-bg-card border border-bg-border p-8">
        <div className="absolute inset-0 bg-hero-gradient pointer-events-none" />
        <div className="absolute inset-0 bg-grid-pattern bg-grid opacity-100 pointer-events-none" />
        <div className="relative">
          <h1 className="font-display font-bold text-3xl text-text-primary">
            Paper<span className="text-accent-blue">2</span>Video
          </h1>
          <p className="text-text-secondary mt-2 max-w-lg font-body">
            Convert academic papers into narrated YouTube videos with citation graphs,
            community context, and AI-generated story arcs.
          </p>
          <div className="flex gap-3 mt-6">
            <Link to="/ingest" className="btn-primary flex items-center gap-2">
              <Plus size={15} />
              Add Paper
            </Link>
            <Link to="/graph" className="btn-secondary flex items-center gap-2">
              <Network size={15} />
              Explore Graph
            </Link>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <StatCard label="Total Papers"    value={papers.length} icon={FileText}   color="bg-accent-blue"   to="/" />
        <StatCard label="Videos Ready"    value={videos.length} icon={Film}       color="bg-accent-teal"   to="/videos" />
        <StatCard label="Processing"      value={active}        icon={TrendingUp} color="bg-accent-orange" to="/" />
      </div>

      {/* Recent papers */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display font-semibold text-text-primary">Recent Papers</h2>
          <Link to="/papers" className="flex items-center gap-1 text-xs text-accent-blue hover:underline">
            View all <ArrowRight size={11} />
          </Link>
        </div>
        {recent.length === 0 ? (
          <div className="card p-12 text-center space-y-4">
            <FileText size={32} className="text-text-dim mx-auto" />
            <div>
              <p className="text-text-secondary font-display font-medium">No papers yet</p>
              <p className="text-text-muted text-sm mt-1">Add an arXiv ID or URL to get started</p>
            </div>
            <Link to="/ingest" className="btn-primary inline-flex items-center gap-2">
              <Plus size={14} /> Add your first paper
            </Link>
          </div>
        ) : (
          <div className="grid gap-3">
            {recent.map((p, i) => <PaperCard key={p.id} paper={p} index={i} />)}
          </div>
        )}
      </div>
    </div>
  )
}
