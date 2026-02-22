import { useEffect, useRef } from 'react'
import { useAppStore } from '../store'
import { getJob } from '../utils/api'

const STAGE_LABELS = {
  pending:    'Queued',
  ingesting:  'Parsing paper',
  ingested:   'Paper parsed',
  embedding:  'Computing embeddings',
  embedded:   'Embeddings ready',
  correlating:'Building knowledge graph',
  correlated: 'Graph complete',
  scripting:  'Generating script (Claude)',
  scripted:   'Script ready',
  tts:        'Generating narration (ElevenLabs)',
  assembling: 'Assembling video',
  done:       'Complete',
  failed:     'Failed',
}

const STAGE_PROGRESS = {
  pending:    5,
  ingesting:  12,
  ingested:   20,
  embedding:  30,
  embedded:   40,
  correlating:48,
  correlated: 55,
  scripting:  65,
  scripted:   75,
  tts:        85,
  assembling: 93,
  done:       100,
  failed:     100,
}

export function useJobPoller(taskId) {
  const { updateJob, appendLog } = useAppStore()
  const intervalRef = useRef(null)
  const prevStatus  = useRef(null)

  useEffect(() => {
    if (!taskId) return

    const poll = async () => {
      try {
        const data = await getJob(taskId)
        const status = data.status

        if (status !== prevStatus.current) {
          prevStatus.current = status
          const result = data.result || {}

          updateJob(taskId, {
            status,
            stage:    result.status || status,
            progress: STAGE_PROGRESS[result.status] || STAGE_PROGRESS[status] || 0,
            label:    STAGE_LABELS[result.status]    || STAGE_LABELS[status]   || status,
            paper_id: result.paper_id,
            video_path: result.video_path,
            error:    data.error,
          })

          appendLog(taskId, {
            time:    new Date().toLocaleTimeString(),
            message: STAGE_LABELS[status] || status,
            type:    status === 'FAILURE' ? 'error' : 'info',
          })
        }

        // Stop polling when terminal
        if (data.ready) {
          clearInterval(intervalRef.current)
        }
      } catch (e) {
        appendLog(taskId, { time: new Date().toLocaleTimeString(), message: String(e), type: 'error' })
      }
    }

    poll()
    intervalRef.current = setInterval(poll, 3000)
    return () => clearInterval(intervalRef.current)
  }, [taskId])
}
