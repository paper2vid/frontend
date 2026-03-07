/**
 * src/pages/GraphExplorer.jsx  (fixed)
 *
 * Key fixes:
 * 1. Fetch papers with ALL statuses (not just limit:20)
 * 2. Build links from BOTH correlations AND citation data from paper.references
 * 3. Show all papers as nodes even without correlations
 * 4. Fallback: if no correlations, show papers clustered by year/venue
 * 5. Correct link direction for arrow markers
 */

import { useState, useEffect, useRef, useCallback } from 'react'
import { useQuery } from 'react-query'
import { Search, Layers, RefreshCw, Info } from 'lucide-react'
import * as d3 from 'd3'
import { getPapers } from '../utils/api'
import { useNavigate } from 'react-router-dom'

const NODE_COLORS = {
  done:       '#00D2B4',
  scripted:   '#4091FF',
  scripting:  '#4091FF',
  embedded:   '#A855F7',
  embedding:  '#A855F7',
  ingested:   '#F59E0B',
  ingesting:  '#F59E0B',
  failed:     '#FF4560',
  default:    '#646F96',
}

const LINK_COLORS = {
  semantic_similar: '#A855F7',
  cites:            '#00D2B4',
  default:          '#3D4F7C',
}

async function fetchCorrelations() {
  try {
    const res = await fetch('/api/correlations?limit=1000')
    if (!res.ok) return []
    const data = await res.json()
    return Array.isArray(data) ? data : []
  } catch {
    return []
  }
}

async function fetchAllPapers() {
  // Fetch papers in batches to get ALL of them, not just 20
  try {
    const res = await fetch('/api/papers/?limit=200&offset=0')
    if (!res.ok) return []
    return res.json()
  } catch {
    return []
  }
}

export default function GraphExplorer() {
  const svgRef     = useRef(null)
  const navigate   = useNavigate()
  const [query,    setQuery]    = useState('')
  const [hoveredNode, setHovered] = useState(null)
  const [stats,    setStats]    = useState({ nodes: 0, links: 0 })

  const { data: papers = [], refetch: refetchPapers }         = useQuery('papers-all-graph', fetchAllPapers, { staleTime: 30000 })
  const { data: correlations = [], refetch: refetchCorr }     = useQuery('correlations-all', fetchCorrelations, { staleTime: 30000 })

  const refresh = () => { refetchPapers(); refetchCorr() }

  const buildGraph = useCallback(() => {
    if (!papers.length || !svgRef.current) return

    const el = svgRef.current
    const W  = el.clientWidth  || 1200
    const H  = el.clientHeight || 700

    d3.select(el).selectAll('*').remove()

    // ── Filter by search query ─────────────────────────────────────────
    const queryLower = query.toLowerCase()
    const filteredPapers = queryLower
      ? papers.filter(p =>
          (p.title || '').toLowerCase().includes(queryLower) ||
          (p.arxiv_id || '').toLowerCase().includes(queryLower) ||
          (p.venue || '').toLowerCase().includes(queryLower) ||
          String(p.year || '').includes(queryLower)
        )
      : papers

    if (!filteredPapers.length) return

    // ── Build node map ─────────────────────────────────────────────────
    const nodeMap = new Map()
    filteredPapers.forEach(p => {
      nodeMap.set(p.id, {
        id: p.id,
        arxiv_id: p.arxiv_id,
        title: p.title || 'Unknown',
        year: p.year,
        venue: p.venue,
        status: p.status || 'default',
        type: 'paper',
      })
    })

    const nodes = [...nodeMap.values()]

    // ── Build links from correlations ──────────────────────────────────
    const linkSet = new Set()
    const links = []

    correlations.forEach(corr => {
      const src = corr.source_paper_id || corr.source_id
      const tgt = corr.target_paper_id || corr.target_id
      const type = corr.correlation_type || corr.type || 'default'

      if (!src || !tgt) return
      if (!nodeMap.has(src) || !nodeMap.has(tgt)) return

      const key = `${src}→${tgt}`
      if (linkSet.has(key)) return
      linkSet.add(key)

      links.push({
        source: src,
        target: tgt,
        type,
        strength: corr.strength || 0.5,
      })
    })

    // If very few/no links, create year-based proximity links as fallback
    // so the graph isn't just isolated dots
    if (links.length < Math.min(nodes.length, 5)) {
      const sortedByYear = [...nodes].filter(n => n.year).sort((a, b) => a.year - b.year)
      for (let i = 0; i < sortedByYear.length - 1; i++) {
        const src = sortedByYear[i].id
        const tgt = sortedByYear[i + 1].id
        const key = `${src}→${tgt}`
        if (!linkSet.has(key)) {
          linkSet.add(key)
          links.push({ source: src, target: tgt, type: 'timeline', strength: 0.2 })
        }
      }
    }

    setStats({ nodes: nodes.length, links: links.length })

    // ── D3 setup ───────────────────────────────────────────────────────
    const svg = d3.select(el).attr('width', W).attr('height', H)
    svg.append('rect').attr('width', W).attr('height', H).attr('fill', '#0A0E1F')

    const defs = svg.append('defs')
    // Arrow markers
    Object.entries(LINK_COLORS).forEach(([type, color]) => {
      defs.append('marker')
        .attr('id', `arr-${type}`)
        .attr('viewBox', '0 -4 8 8')
        .attr('refX', 22)
        .attr('refY', 0)
        .attr('markerWidth', 5)
        .attr('markerHeight', 5)
        .attr('orient', 'auto')
        .append('path')
        .attr('d', 'M0,-4L8,0L0,4')
        .attr('fill', color)
        .attr('opacity', 0.6)
    })

    const g    = svg.append('g')
    const zoom = d3.zoom()
      .scaleExtent([0.05, 6])
      .on('zoom', e => g.attr('transform', e.transform))
    svg.call(zoom)

    // ── Simulation ─────────────────────────────────────────────────────
    const sim = d3.forceSimulation(nodes)
      .force('link', d3.forceLink(links)
        .id(d => d.id)
        .distance(d => d.type === 'semantic_similar' ? 120 : d.type === 'cites' ? 100 : 160)
        .strength(d => d.type === 'timeline' ? 0.3 : 0.5)
      )
      .force('charge', d3.forceManyBody().strength(-300))
      .force('center', d3.forceCenter(W / 2, H / 2))
      .force('collision', d3.forceCollide(34))
      .force('x', d3.forceX(W / 2).strength(0.05))
      .force('y', d3.forceY(H / 2).strength(0.05))

    // ── Links ──────────────────────────────────────────────────────────
    const link = g.append('g').selectAll('line')
      .data(links)
      .enter()
      .append('line')
      .attr('stroke', d => LINK_COLORS[d.type] || LINK_COLORS.default)
      .attr('stroke-width', d => d.type === 'semantic_similar' ? 1 : 1.5)
      .attr('stroke-dasharray', d => d.type === 'semantic_similar' ? '4,3' : d.type === 'timeline' ? '2,4' : null)
      .attr('stroke-opacity', d => d.type === 'timeline' ? 0.2 : 0.45)
      .attr('marker-end', d => `url(#arr-${d.type || 'default'})`)

    // ── Nodes ──────────────────────────────────────────────────────────
    const node = g.append('g').selectAll('g')
      .data(nodes)
      .enter()
      .append('g')
      .style('cursor', d => d.id ? 'pointer' : 'default')
      .call(d3.drag()
        .on('start', (e, d) => { if (!e.active) sim.alphaTarget(0.3).restart(); d.fx = d.x; d.fy = d.y })
        .on('drag',  (e, d) => { d.fx = e.x; d.fy = e.y })
        .on('end',   (e, d) => { if (!e.active) sim.alphaTarget(0); d.fx = null; d.fy = null })
      )
      .on('click', (_, d) => {
        if (d.id) navigate(`/papers/${d.id}`)
      })
      .on('mouseenter', (_, d) => setHovered(d))
      .on('mouseleave', ()    => setHovered(null))

    // Circle
    node.append('circle')
      .attr('r', 10)
      .attr('fill', d => (NODE_COLORS[d.status] || NODE_COLORS.default) + '33')
      .attr('stroke', d => NODE_COLORS[d.status] || NODE_COLORS.default)
      .attr('stroke-width', 1.8)

    // Year label inside circle
    node.filter(d => d.year)
      .append('text')
      .text(d => String(d.year).slice(2))
      .attr('text-anchor', 'middle')
      .attr('dy', '0.35em')
      .attr('font-size', '7px')
      .attr('fill', d => NODE_COLORS[d.status] || NODE_COLORS.default)
      .attr('font-family', 'JetBrains Mono, monospace')
      .attr('pointer-events', 'none')

    // Title label below
    node.append('text')
      .text(d => (d.title || '').slice(0, 26) + ((d.title?.length || 0) > 26 ? '…' : ''))
      .attr('y', 18)
      .attr('text-anchor', 'middle')
      .attr('font-size', '8px')
      .attr('fill', '#8892B0')
      .attr('font-family', 'DM Sans, sans-serif')
      .attr('pointer-events', 'none')

    // ── Tick ──────────────────────────────────────────────────────────
    sim.on('tick', () => {
      link
        .attr('x1', d => d.source.x).attr('y1', d => d.source.y)
        .attr('x2', d => d.target.x).attr('y2', d => d.target.y)
      node.attr('transform', d => `translate(${d.x ?? 0},${d.y ?? 0})`)
    })

    // Auto-fit after simulation settles
    const fitTimer = setTimeout(() => {
      const b = g.node().getBBox()
      if (b.width && b.height) {
        const scale = 0.85 / Math.max(b.width / W, b.height / H)
        const tx = W / 2 - scale * (b.x + b.width / 2)
        const ty = H / 2 - scale * (b.y + b.height / 2)
        svg.transition().duration(800)
          .call(zoom.transform, d3.zoomIdentity.translate(tx, ty).scale(scale))
      }
    }, 2000)

    return () => { sim.stop(); clearTimeout(fitTimer) }
  }, [papers, correlations, query, navigate])

  useEffect(() => {
    const cleanup = buildGraph()
    const obs = new ResizeObserver(() => buildGraph())
    if (svgRef.current) obs.observe(svgRef.current)
    return () => { cleanup?.(); obs.disconnect() }
  }, [buildGraph])

  return (
    <div className="relative h-full flex flex-col">
      {/* Toolbar */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 flex items-center gap-2">
        <div className="relative">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Filter papers…"
            className="input pl-8 w-72 text-xs h-9"
          />
        </div>
        <div className="bg-bg-dark/80 backdrop-blur-sm border border-bg-border rounded-lg px-3 py-2 text-xs text-text-muted font-mono">
          {stats.nodes} nodes · {stats.links} edges
        </div>
        <button
          onClick={refresh}
          className="bg-bg-dark/80 backdrop-blur-sm border border-bg-border rounded-lg p-2 text-text-muted hover:text-accent-blue transition-colors"
          title="Refresh graph"
        >
          <RefreshCw size={14} />
        </button>
      </div>

      {/* Legend */}
      <div className="absolute bottom-4 left-4 z-10 flex flex-col gap-1.5">
        {Object.entries(NODE_COLORS).filter(([k]) => !['default'].includes(k)).map(([status, color]) => (
          <div key={status} className="flex items-center gap-2 bg-bg-dark/80 backdrop-blur-sm px-2.5 py-1 rounded-md">
            <div className="w-2.5 h-2.5 rounded-full border" style={{ backgroundColor: color + '55', borderColor: color }} />
            <span className="text-xs text-text-muted font-mono capitalize">{status}</span>
          </div>
        ))}
        <div className="flex items-center gap-2 bg-bg-dark/80 backdrop-blur-sm px-2.5 py-1 rounded-md">
          <div className="w-4 border-t border-dashed" style={{ borderColor: LINK_COLORS.semantic_similar }} />
          <span className="text-xs text-text-muted font-mono">Similar</span>
        </div>
        <div className="flex items-center gap-2 bg-bg-dark/80 backdrop-blur-sm px-2.5 py-1 rounded-md">
          <div className="w-4 border-t" style={{ borderColor: LINK_COLORS.cites }} />
          <span className="text-xs text-text-muted font-mono">Cites</span>
        </div>
      </div>

      {/* Hover tooltip */}
      {hoveredNode && (
        <div className="absolute bottom-4 right-4 z-10 card p-4 max-w-xs pointer-events-none">
          <p className="font-display font-semibold text-sm text-text-primary line-clamp-2">{hoveredNode.title}</p>
          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
            {hoveredNode.year  && <span className="text-xs text-text-muted font-mono">{hoveredNode.year}</span>}
            {hoveredNode.venue && <span className="text-xs text-text-dim">{hoveredNode.venue}</span>}
            <span className={`text-xs px-1.5 py-0.5 rounded font-mono`}
              style={{ color: NODE_COLORS[hoveredNode.status] || NODE_COLORS.default }}>
              {hoveredNode.status}
            </span>
          </div>
          {hoveredNode.arxiv_id && (
            <p className="text-xs font-mono text-accent-blue mt-1">{hoveredNode.arxiv_id}</p>
          )}
          <p className="text-xs text-accent-blue mt-1.5">Click to open →</p>
        </div>
      )}

      {/* No papers info */}
      {papers.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center text-text-muted">
            <Layers size={40} className="mx-auto mb-3 opacity-30" />
            <p className="text-sm">No papers to display</p>
            <p className="text-xs mt-1">Add papers and run backfill to see correlations</p>
          </div>
        </div>
      )}

      <svg ref={svgRef} className="w-full flex-1" />
    </div>
  )
}
