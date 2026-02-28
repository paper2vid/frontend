import axios from 'axios'

const api = axios.create({ baseURL: '/api' })

api.interceptors.response.use(
  r => r.data,
  e => Promise.reject(e.response?.data?.detail || e.message)
)

// Papers
export const getPapers   = (params) => api.get('/papers/', { params })
export const getPaper    = (id)     => api.get(`/papers/${id}`)
export const getScript   = (id)     => api.get(`/papers/${id}/script`)
export const getLineage  = (id)     => api.get(`/papers/${id}/lineage`)
export const getWebCtx   = (id)     => api.get(`/papers/${id}/web-context`)
export const ingestURL   = (body)   => api.post('/papers/ingest/url', body)
export const ingestFile = (form) => api.post('/papers/ingest/file', form, {
  headers: { 'Content-Type': 'multipart/form-data' }
})

// Videos
export const getVideos   = ()       => api.get('/videos/')

// Search
export const semanticSearch = (q, top_k, year) => api.get('/search/semantic', { params: { q, top_k, year } })
export const keywordSearch  = (q)               => api.get('/search/keyword',  { params: { q } })
export const fieldTimeline  = (concept)         => api.get('/search/field-timeline', { params: { concept } })

// Jobs
export const getJob = (id) => api.get(`/jobs/${id}`)

// WebSocket factory
export function createPipelineSocket(taskId, onMessage) {
  const ws = new WebSocket(`ws://${location.host}/ws/pipeline/${taskId}`)
  ws.onmessage = e => onMessage(JSON.parse(e.data))
  ws.onerror   = () => onMessage({ type: 'error', message: 'WebSocket error' })
  return ws
}
