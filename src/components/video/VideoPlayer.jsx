import { useRef, useState } from 'react'
import { Play, Pause, Volume2, VolumeX, Maximize, Download } from 'lucide-react'
import { motion } from 'framer-motion'

function fmt(secs) {
  const m = Math.floor(secs / 60)
  const s = Math.floor(secs % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

export default function VideoPlayer({ videoPath, jobId, duration }) {
  const videoRef  = useRef(null)
  const [playing, setPlaying]   = useState(false)
  const [muted,   setMuted]     = useState(false)
  const [current, setCurrent]   = useState(0)
  const [ready,   setReady]     = useState(false)

  const total = duration || 0

  const toggle = () => {
    const v = videoRef.current
    if (!v) return
    if (playing) { v.pause(); setPlaying(false) }
    else         { v.play();  setPlaying(true)  }
  }

  const seek = (e) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const pct  = (e.clientX - rect.left) / rect.width
    if (videoRef.current && total) {
      videoRef.current.currentTime = pct * total
    }
  }

  const progress = total ? (current / total) * 100 : 0

  return (
    <div className="card overflow-hidden bg-black group">
      {/* Video element */}
      <div className="relative aspect-video bg-bg-deep">
        <video
          ref={videoRef}
          src={videoPath ? `/videos${videoPath.split('/videos')[1]}` : undefined}
          className="w-full h-full object-contain"
          onTimeUpdate={e => setCurrent(e.target.currentTime)}
          onEnded={() => setPlaying(false)}
          onCanPlay={() => setReady(true)}
          onClick={toggle}
          muted={muted}
        />

        {/* Play overlay */}
        {!playing && ready && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 flex items-center justify-center cursor-pointer"
            onClick={toggle}
          >
            <div className="w-16 h-16 rounded-full bg-black/60 backdrop-blur-sm border border-white/20 flex items-center justify-center hover:bg-black/80 transition-colors">
              <Play size={24} className="text-white ml-1" />
            </div>
          </motion.div>
        )}

        {!ready && !videoPath && (
          <div className="absolute inset-0 flex items-center justify-center">
            <p className="text-text-muted text-sm font-mono">No video available</p>
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="bg-bg-dark px-4 py-3 space-y-2">
        {/* Scrubber */}
        <div
          className="h-1.5 bg-bg-deep rounded-full cursor-pointer overflow-hidden"
          onClick={seek}
        >
          <div
            className="h-full bg-accent-blue rounded-full transition-none"
            style={{ width: `${progress}%` }}
          />
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={toggle} className="text-text-secondary hover:text-text-primary transition-colors">
              {playing ? <Pause size={16} /> : <Play size={16} />}
            </button>
            <button onClick={() => { setMuted(!muted); if (videoRef.current) videoRef.current.muted = !muted }}
              className="text-text-secondary hover:text-text-primary transition-colors">
              {muted ? <VolumeX size={16} /> : <Volume2 size={16} />}
            </button>
            <span className="text-xs font-mono text-text-muted">
              {fmt(current)} / {fmt(total)}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {jobId && (
              <a
                href={`/api/videos/${jobId}/download`}
                download
                className="flex items-center gap-1.5 text-xs text-text-muted hover:text-text-primary transition-colors"
              >
                <Download size={13} />
                Download
              </a>
            )}
            <button
              onClick={() => videoRef.current?.requestFullscreen()}
              className="text-text-muted hover:text-text-primary transition-colors"
            >
              <Maximize size={14} />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
