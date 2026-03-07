import { useState } from 'react'
import { NavLink } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LayoutDashboard, Upload, Film, Network,
  Activity, Cpu, ChevronRight, List, Menu, X
} from 'lucide-react'
import { useAppStore } from '../../store'
import ActiveJobsBadge from '../pipeline/ActiveJobsBadge'

const NAV = [
  { to: '/',       icon: LayoutDashboard, label: 'Dashboard'          },
  { to: '/papers', icon: List,            label: 'Papers'             },
  { to: '/ingest', icon: Upload,          label: 'Add Paper'          },
  { to: '/videos', icon: Film,            label: 'Videos'             },
  { to: '/graph',  icon: Network,         label: 'Graph'              },
  { to: '/fields', icon: Network,         label: 'Field Intel'        },
]

export default function Layout({ children }) {
  const activeJobs = useAppStore(s => s.activeJobs)
  const jobCount   = Object.keys(activeJobs).length
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  return (
    <div className="flex min-h-screen bg-bg-deep">
      {/* ── Desktop Sidebar ── */}
      <aside className="hidden md:flex w-60 shrink-0 border-r border-bg-border flex-col bg-bg-dark">
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

        {jobCount > 0 && (
          <div className="px-3 pb-4">
            <ActiveJobsBadge />
          </div>
        )}

        <div className="px-5 py-4 border-t border-bg-border">
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-accent-teal status-dot-active" />
            <span className="text-xs text-text-muted font-mono">System online</span>
          </div>
        </div>
      </aside>

      {/* ── Main content area ── */}
      <main className="flex-1 flex flex-col overflow-hidden min-w-0">
        {/* Top bar */}
        <header className="h-14 border-b border-bg-border flex items-center px-4 md:px-8 bg-bg-dark/50 backdrop-blur-sm shrink-0">
          {/* Mobile: logo + hamburger */}
          <div className="flex items-center gap-2.5 md:hidden">
            <div className="w-7 h-7 rounded-lg bg-accent-blue/20 flex items-center justify-center">
              <Cpu size={15} className="text-accent-blue" />
            </div>
            <span className="font-display font-bold text-sm tracking-wide text-text-primary">
              Paper<span className="text-accent-blue">2</span>Video
            </span>
          </div>

          <div className="flex-1" />

          {jobCount > 0 && (
            <div className="flex items-center gap-2 text-xs text-text-muted font-mono mr-3">
              <Activity size={12} className="text-accent-blue animate-pulse" />
              <span className="hidden sm:inline">{jobCount} job{jobCount > 1 ? 's' : ''} processing</span>
              <span className="sm:hidden">{jobCount}</span>
            </div>
          )}

          {/* Hamburger — mobile only */}
          <button
            className="md:hidden p-2 rounded-lg text-text-muted hover:text-text-primary hover:bg-bg-hover transition-colors"
            onClick={() => setMobileMenuOpen(true)}
          >
            <Menu size={18} />
          </button>
        </header>

        {/* Page content */}
        <div className="flex-1 overflow-y-auto pb-16 md:pb-0">
          <AnimatePresence mode="wait">
            <motion.div
              key={typeof window !== 'undefined' ? window.location.pathname : ''}
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

      {/* ── Mobile bottom nav ── */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-bg-dark border-t border-bg-border flex items-stretch">
        {NAV.slice(0, 5).map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `flex-1 flex flex-col items-center justify-center py-2 gap-0.5 text-[10px] font-body transition-colors
               ${isActive ? 'text-accent-blue' : 'text-text-muted'}`
            }
          >
            {({ isActive }) => (
              <>
                <Icon size={18} className={isActive ? 'text-accent-blue' : 'text-text-muted'} />
                <span className="leading-none">{label}</span>
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* ── Mobile slide-out drawer ── */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <>
            <motion.div
              key="backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="md:hidden fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
              onClick={() => setMobileMenuOpen(false)}
            />
            <motion.aside
              key="drawer"
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 280 }}
              className="md:hidden fixed right-0 top-0 bottom-0 z-50 w-72 bg-bg-dark border-l border-bg-border flex flex-col"
            >
              <div className="flex items-center justify-between px-5 py-4 border-b border-bg-border">
                <span className="font-display font-bold text-sm text-text-primary">
                  Paper<span className="text-accent-blue">2</span>Video
                </span>
                <button
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-bg-hover"
                >
                  <X size={16} />
                </button>
              </div>

              <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
                {NAV.map(({ to, icon: Icon, label }) => (
                  <NavLink
                    key={to}
                    to={to}
                    end={to === '/'}
                    onClick={() => setMobileMenuOpen(false)}
                    className={({ isActive }) =>
                      `flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-body transition-all duration-150
                       ${isActive
                         ? 'bg-accent-blue/10 text-accent-blue'
                         : 'text-text-secondary hover:text-text-primary hover:bg-bg-hover'}`
                    }
                  >
                    {({ isActive }) => (
                      <>
                        <Icon size={16} className={isActive ? 'text-accent-blue' : 'text-text-muted'} />
                        <span className="flex-1">{label}</span>
                        {isActive && <ChevronRight size={12} className="text-accent-blue/60" />}
                      </>
                    )}
                  </NavLink>
                ))}
              </nav>

              {jobCount > 0 && (
                <div className="px-3 pb-4">
                  <ActiveJobsBadge />
                </div>
              )}

              <div className="px-5 py-4 border-t border-bg-border">
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-accent-teal status-dot-active" />
                  <span className="text-xs text-text-muted font-mono">System online</span>
                </div>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}