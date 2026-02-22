import { useQuery } from 'react-query'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Film, Play, Download, Clock, ExternalLink } from 'lucide-react'
import { getVideos } from '../utils/api'

function VideoCard({ video, index }) {
  const mins = Math.floor((video.duration_seconds || 0) / 60)
  const secs = Math.floor((video.duration_seconds || 0) % 60)

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className="card-hover overflow-hidden group"
    >
      {/* Thumbnail placeholder */}
      <div className="aspect-video bg-bg-deep flex items-center justify-center relative overflow-hidden">
        <div className="absolute inset-0 bg-grid-pattern bg-grid opacity-50" />
        <div className="relative z-10 w-14 h-14 rounded-full bg-accent-blue/10 border border-accent-blue/30 flex items-center justify-center group-hover:bg-accent-blue/20 transition-colors">
          <Play size={22} className="text-accent-blue ml-1" />
        </div>
        <div className="absolute bottom-2 right-2 flex items-center gap-1 bg-black/60 px-2 py-0.5 rounded text-xs font-mono text-text-secondary">
          <Clock size={9} />
          {mins}:{secs.toString().padStart(2, '0')}
        </div>
      </div>

      <div className="p-4 space-y-3">
        <h3 className="font-display font-semibold text-sm text-text-primary line-clamp-2 group-hover:text-accent-blue transition-colors">
          {video.title || 'Untitled'}
        </h3>

        <div className="flex items-center gap-2">
          {video.arxiv_id && (
            <span className="text-xs font-mono text-text-dim">arXiv:{video.arxiv_id}</span>
          )}
          {video.completed_at && (
            <span className="text-xs text-text-dim ml-auto">
              {new Date(video.completed_at).toLocaleDateString()}
            </span>
          )}
        </div>

        <div className="flex gap-2">
          <Link
            to={`/papers/${video.paper_id}`}
            className="flex-1 btn-secondary text-xs flex items-center justify-center gap-1.5"
          >
            <ExternalLink size={11} />
            Details
          </Link>
          <a
            href={`/api/videos/${video.job_id}/download`}
            download
            className="flex-1 btn-primary text-xs flex items-center justify-center gap-1.5"
          >
            <Download size={11} />
            Download
          </a>
        </div>
      </div>
    </motion.div>
  )
}

export default function VideoLibrary() {
  const { data: videos = [], isLoading } = useQuery('videos', getVideos)

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display font-bold text-2xl text-text-primary">Video Library</h1>
          <p className="text-text-muted text-sm mt-1">{videos.length} videos ready</p>
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-3 gap-5">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="card animate-pulse">
              <div className="aspect-video bg-bg-hover" />
              <div className="p-4 space-y-2">
                <div className="h-4 bg-bg-hover rounded w-3/4" />
                <div className="h-3 bg-bg-hover rounded w-1/2" />
              </div>
            </div>
          ))}
        </div>
      ) : videos.length === 0 ? (
        <div className="card p-16 text-center space-y-4">
          <Film size={40} className="text-text-dim mx-auto" />
          <div>
            <p className="font-display font-semibold text-text-secondary">No videos yet</p>
            <p className="text-text-muted text-sm mt-1">Add a paper and run the full pipeline to generate your first video.</p>
          </div>
          <Link to="/ingest" className="btn-primary inline-flex">Add Paper</Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {videos.map((v, i) => <VideoCard key={v.job_id} video={v} index={i} />)}
        </div>
      )}
    </div>
  )
}
