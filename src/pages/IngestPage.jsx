import { useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Link2, Upload, Hash, Loader2, FileText } from 'lucide-react'
import toast from 'react-hot-toast'
import { ingestURL, ingestFile } from '../utils/api'
import { useAppStore } from '../store'
import PipelineTracker from '../components/pipeline/PipelineTracker'

const EXAMPLES = [
  { label: 'Attention Is All You Need',  value: '1706.03762' },
  { label: 'BERT',                        value: '1810.04805' },
  { label: 'GPT-3',                       value: '2005.14165' },
  { label: 'LoRA',                        value: '2106.09685' },
  { label: 'Diffusion Models',            value: '2006.11239' },
]

export default function IngestPage() {
  const [mode,    setMode]    = useState('arxiv')  // arxiv | url | file
  const [input,   setInput]   = useState('')
  const [loading, setLoading] = useState(false)
  const [fileQueue, setFileQueue] = useState([])
  const fileRef = useRef(null)

  const { addJob, activeJobs } = useAppStore()
  const activeList = Object.entries(activeJobs)

  const submit = async () => {
    if (!input.trim()) { toast.error('Enter an arXiv ID or URL'); return }
    setLoading(true)
    try {
      const source_type = mode === 'arxiv' ? 'arxiv_id' : 'url'
      const data = await ingestURL({ url: input.trim(), source_type })
      addJob(data.task_id, { source: input.trim(), status: 'queued' })
      toast.success('Paper queued for processing!')
      setInput('')
    } catch (e) {
      toast.error(String(e))
    } finally {
      setLoading(false)
    }
  }

  const submitFiles = async () => {
  if (!fileQueue.length) return
  setLoading(true)
  try {
    const form = new FormData()
    fileQueue.forEach(({ file }) => form.append('files', file))

    const data = await ingestFile(form)
    const results = data.results ?? [data]  // handle both old single and new multi response

    results.forEach(r => {
      if (r.task_id) addJob(r.task_id, { source: r.filename, status: 'queued' })
    })

    const errors = results.filter(r => r.status === 'error')
    const queued = results.filter(r => r.status === 'queued')
    if (queued.length) toast.success(`${queued.length} paper(s) queued!`)
    if (errors.length) toast.error(`Failed: ${errors.map(e => e.filename).join(', ')}`)

    setFileQueue([])
  } catch (e) {
    toast.error(String(e))
  } finally {
    setLoading(false)
  }
}

  return (
    <div className="p-8 max-w-2xl mx-auto space-y-8">
      <div>
        <h1 className="font-display font-bold text-2xl text-text-primary">Add Paper</h1>
        <p className="text-text-muted text-sm mt-1">Submit a paper to generate a narrated video.</p>
      </div>

      {/* Mode selector */}
      <div className="flex gap-1 p-1 bg-bg-dark rounded-xl border border-bg-border">
        {[
          { key: 'arxiv', label: 'arXiv ID',    icon: Hash   },
          { key: 'url',   label: 'URL',          icon: Link2  },
          { key: 'file',  label: 'Upload File',  icon: Upload },
        ].map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setMode(key)}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-display font-medium transition-all
              ${mode === key
                ? 'bg-accent-blue text-white shadow-lg shadow-blue-500/20'
                : 'text-text-muted hover:text-text-secondary'
              }`}
          >
            <Icon size={13} />
            {label}
          </button>
        ))}
      </div>

      {/* Input area */}
      {/* Input area */}
      <div className="space-y-3">
        {mode !== 'file' ? (
          <>
            <div className="flex gap-2">
              <input
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && submit()}
                placeholder={mode === 'arxiv' ? 'e.g. 1706.03762' : 'https://arxiv.org/abs/...'}
                className="input flex-1"
              />
              <button
                onClick={submit}
                disabled={loading}
                className="btn-primary flex items-center gap-2 px-5"
              >
                {loading
                  ? <><Loader2 size={14} className="animate-spin" /> Queuing...</>
                  : 'Queue'
                }
              </button>
            </div>

            {mode === 'arxiv' && (
              <div className="flex flex-wrap gap-2">
                {EXAMPLES.map(ex => (
                  <button
                    key={ex.value}
                    onClick={() => setInput(ex.value)}
                    className="px-3 py-1 rounded-lg text-xs font-mono bg-bg-dark border border-bg-border text-text-muted hover:text-text-primary hover:border-accent-blue/40 transition-colors"
                  >
                    {ex.label}
                  </button>
                ))}
              </div>
            )}
          </>
        ) : (
          <div className="space-y-3">
            <div
              onClick={() => fileRef.current?.click()}
              onDragOver={e => e.preventDefault()}
              onDrop={e => {
                e.preventDefault()
                const dropped = Array.from(e.dataTransfer.files)
                setFileQueue(prev => [...prev, ...dropped.map(f => ({ file: f }))])
              }}
              className="card border-dashed border-bg-border hover:border-accent-blue/40 p-12 flex flex-col items-center gap-4 cursor-pointer transition-colors hover:bg-bg-hover"
            >
              <div className="w-12 h-12 rounded-xl bg-accent-blue/10 flex items-center justify-center">
                <Upload size={20} className="text-accent-blue" />
              </div>
              <div className="text-center">
                <p className="font-display font-semibold text-text-primary">Drop files or click to browse</p>
                <p className="text-text-muted text-sm mt-1">PDF, HTML, or LaTeX — select multiple</p>
              </div>
              <input
                ref={fileRef}
                type="file"
                accept=".pdf,.html,.htm,.tex"
                multiple
                className="hidden"
                onChange={e => {
                  const picked = Array.from(e.target.files || [])
                  setFileQueue(prev => [...prev, ...picked.map(f => ({ file: f }))])
                  e.target.value = ''
                }}
              />
            </div>

            {fileQueue.length > 0 && (
              <div className="space-y-2">
                {fileQueue.map(({ file }, i) => (
                  <div key={i} className="flex items-center justify-between px-4 py-2.5 rounded-lg bg-bg-dark border border-bg-border">
                    <div className="flex items-center gap-2.5">
                      <FileText size={14} className="text-accent-blue shrink-0" />
                      <span className="text-sm text-text-primary truncate max-w-xs">{file.name}</span>
                      <span className="text-xs text-text-muted">({(file.size / 1024).toFixed(0)} KB)</span>
                    </div>
                    <button
                      onClick={() => setFileQueue(prev => prev.filter((_, j) => j !== i))}
                      className="text-text-muted hover:text-red-400 text-xs ml-3"
                    >✕</button>
                  </div>
                ))}

                <button
                  onClick={submitFiles}
                  disabled={loading}
                  className="btn-primary w-full flex items-center justify-center gap-2"
                >
                  {loading
                    ? <><Loader2 size={14} className="animate-spin" /> Uploading...</>
                    : `Queue ${fileQueue.length} paper${fileQueue.length > 1 ? 's' : ''}`
                  }
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Active jobs */}
      <AnimatePresence>
        {activeList.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-4"
          >
            <h2 className="font-display font-semibold text-sm text-text-primary flex items-center gap-2">
              <FileText size={14} className="text-accent-blue" />
              Active Jobs
            </h2>
            {activeList.map(([taskId]) => (
              <PipelineTracker key={taskId} taskId={taskId} />
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Info card */}
      <div className="card p-5 space-y-3">
        <p className="section-label">Pipeline stages</p>
        {[
          ['Parse',     'PDF / HTML / LaTeX → structured JSON'],
          ['Embed',     'SPECTER2 → Qdrant semantic index'],
          ['Graph',     'Neo4j citation + similarity edges'],
          ['Web',       'Brave/DDG + YouTube + PWC enrichment'],
          ['Script',    'Claude 3-pass: decompose → narrative → fact-check'],
          ['Narrate',   'ElevenLabs TTS per segment'],
          ['Assemble',  'Pillow slides + FFmpeg MP4'],
        ].map(([stage, desc]) => (
          <div key={stage} className="flex gap-3 text-sm">
            <span className="font-mono text-accent-blue w-16 shrink-0">{stage}</span>
            <span className="text-text-muted">{desc}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
