import { Routes, Route } from 'react-router-dom'
import Layout from './components/layout/Layout'
import Dashboard from './pages/Dashboard'
import PaperDetail from './pages/PaperDetail'
import VideoLibrary from './pages/VideoLibrary'
import GraphExplorer from './pages/GraphExplorer'
import IngestPage from './pages/IngestPage'

export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/"            element={<Dashboard />} />
        <Route path="/ingest"      element={<IngestPage />} />
        <Route path="/papers/:id"  element={<PaperDetail />} />
        <Route path="/videos"      element={<VideoLibrary />} />
        <Route path="/graph"       element={<GraphExplorer />} />
      </Routes>
    </Layout>
  )
}
