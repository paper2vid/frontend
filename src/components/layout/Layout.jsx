import { NavLink } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LayoutDashboard, Upload, Film, Network,
  Activity, Cpu, ChevronRight, List
} from 'lucide-react'
import { useAppStore } from '../../store'
import ActiveJobsBadge from '../pipeline/ActiveJobsBadge'

const NAV = [
  { to: '/',       icon: LayoutDashboard, label: 'Dashboard'          },
  { to: '/papers', icon: List,            label: 'View Papers'        },
  { to: '/ingest', icon: Upload,          label: 'Add Paper'          },
  { to: '/videos', icon: Film,            label: 'Videos'             },
  { to: '/graph',  icon: Network,         label: 'Graph'              },
  { to: '/fields', icon: Network,         label: 'Field Intelligence' },
]

export default function Layout({ children }) {
  const activeJobs = useAppStore(s => s.activeJobs)
  const jobCount   = Object.keys(activeJobs).length

  return (
    <div className="flex min-h-screen bg-bg-deep">
      {/* Sidebar */}
      <aside className="w-60 shrink-0 border-r border-bg-border flex flex-col bg-bg-dark">
        {/* Logo */}
        <div className="px-6 py-5 border-b border-bg-border">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-accent-blue/20 flex items-center justify-center">
              <Cpu size={15} className="text-accent-blue" />
            </div>
            <span className="font-display font-bold text-sm tracking-wide text-text-primary">
              Paper<span className="text-accent-blue">2</span>Video
            </span>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-0.5">
          {NAV.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-body transition-all duration-150 group
                 ${isActive
                   ? 'bg-accent-blue/10 text-accent-blue'
                   : 'text-text-secondary hover:text-text-primary hover:bg-bg-hover'}`
              }
            >
              {({ isActive }) => (
                <>
                  <Icon size={16} className={isActive ? 'text-accent-blue' : 'text-text-muted group-hover:text-text-secondary'} />
                  <span className="flex-1">{label}</span>
                  {isActive && <ChevronRight size={12} className="text-accent-blue/60" />}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Active jobs indicator */}
        {jobCount > 0 && (
          <div className="px-3 pb-4">
            <ActiveJobsBadge />
          </div>
        )}

        {/* Footer */}
        <div className="px-5 py-4 border-t border-bg-border">
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-accent-teal status-dot-active" />
            <span className="text-xs text-text-muted font-mono">System online</span>
          </div>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <header className="h-14 border-b border-bg-border flex items-center px-8 bg-bg-dark/50 backdrop-blur-sm shrink-0">
          <div className="flex-1" />
          {jobCount > 0 && (
            <div className="flex items-center gap-2 text-xs text-text-muted font-mono">
              <Activity size={12} className="text-accent-blue animate-pulse" />
              {jobCount} job{jobCount > 1 ? 's' : ''} processing
            </div>
          )}
        </header>

        {/* Page content */}
        <div className="flex-1 overflow-y-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="h-full"
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
    </div>
  )
}
