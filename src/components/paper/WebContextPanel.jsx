import { useState } from 'react'
import { Globe, Youtube, Github, MessageSquare, AlertTriangle, TrendingUp } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

const TABS = [
  { key: 'reactions',  label: 'Community',   icon: MessageSquare },
  { key: 'explainers', label: 'Explainers',  icon: Globe         },
  { key: 'criticism',  label: 'Criticism',   icon: AlertTriangle },
  { key: 'videos',     label: 'Talks',       icon: Youtube       },
  { key: 'code',       label: 'Code',        icon: Github        },
  { key: 'followup',   label: 'Follow-up',   icon: TrendingUp    },
]

function ItemCard({ item }) {
  return (
    <a
      href={item.url}
      target="_blank"
      rel="noopener noreferrer"
      className="card-hover p-4 block space-y-2 group"
    >
      <p className="text-sm font-display font-medium text-text-primary group-hover:text-accent-blue transition-colors line-clamp-2">
        {item.title || item.url}
      </p>
      {item.snippet && (
        <p className="text-xs text-text-secondary leading-relaxed line-clamp-3">
          {item.snippet}
        </p>
      )}
      {item.transcript && (
        <p className="text-xs text-text-muted font-mono leading-relaxed line-clamp-2 border-l-2 border-accent-orange/40 pl-2">
          {item.transcript.slice(0, 200)}…
        </p>
      )}
      {item.url && (
        <p className="text-xs text-text-dim font-mono truncate">{item.url}</p>
      )}
    </a>
  )
}

function RepoCard({ repo }) {
  return (
    <a href={repo.url} target="_blank" rel="noopener noreferrer"
      className="card-hover p-4 flex items-center gap-4 group">
      <Github size={18} className="text-text-muted shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-display font-medium text-text-primary group-hover:text-accent-blue transition-colors truncate">
          {repo.url?.replace('https://github.com/', '')}
        </p>
        <div className="flex items-center gap-3 mt-1">
          {repo.framework && <span className="text-xs text-text-muted">{repo.framework}</span>}
          {repo.is_official && <span className="badge bg-teal-500/10 text-accent-teal border border-teal-500/20">Official</span>}
        </div>
      </div>
      {repo.stars != null && (
        <span className="text-xs font-mono text-accent-orange">★ {repo.stars.toLocaleString()}</span>
      )}
    </a>
  )
}

export default function WebContextPanel({ ctx }) {
  const [tab, setTab] = useState('reactions')
  if (!ctx) return null

  const data = {
    reactions:  ctx.community_reactions  || [],
    explainers: ctx.existing_explainers  || [],
    criticism:  ctx.criticisms           || [],
    videos:     ctx.video_transcripts    || [],
    code:       ctx.code_repos           || [],
    followup:   ctx.followup_work        || [],
  }

  const counts = Object.fromEntries(Object.entries(data).map(([k, v]) => [k, v.length]))
  const items  = data[tab] || []

  return (
    <div className="space-y-4">
      {/* Tabs */}
      <div className="flex gap-1 flex-wrap">
        {TABS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-display font-medium transition-all
              ${tab === key
                ? 'bg-accent-blue/10 text-accent-blue border border-accent-blue/30'
                : 'text-text-muted hover:text-text-secondary border border-transparent hover:border-bg-border'
              }`}
          >
            <Icon size={11} />
            {label}
            {counts[key] > 0 && (
              <span className={`ml-0.5 w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-mono
                ${tab === key ? 'bg-accent-blue/20 text-accent-blue' : 'bg-bg-border text-text-dim'}`}>
                {counts[key]}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={tab}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="space-y-2"
        >
          {items.length === 0 ? (
            <div className="card p-8 text-center">
              <p className="text-text-dim text-sm">No data found for this category.</p>
            </div>
          ) : tab === 'code' ? (
            items.map((r, i) => <RepoCard key={i} repo={r} />)
          ) : (
            items.map((item, i) => <ItemCard key={i} item={item} />)
          )}
        </motion.div>
      </AnimatePresence>

      {/* PWC tasks if available */}
      {ctx.pwc_data?.tasks?.length > 0 && (
        <div className="card p-4">
          <p className="section-label mb-2">Tasks (Papers With Code)</p>
          <div className="flex flex-wrap gap-2">
            {ctx.pwc_data.tasks.map((t, i) => (
              <span key={i} className="badge bg-purple-500/10 text-accent-purple border border-purple-500/20">
                {t.name || t}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
