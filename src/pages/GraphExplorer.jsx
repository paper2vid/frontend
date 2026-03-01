import { useState, useEffect, useRef, useCallback } from 'react'
import { useQuery } from 'react-query'
import { Search, Layers } from 'lucide-react'
import * as d3 from 'd3'
import { getPapers } from '../utils/api'
import { useNavigate } from 'react-router-dom'

const NODE_COLORS = {
  done:       '#00D2B4',
  scripting:  '#4091FF',
  scripted:   '#4091FF',
  embedding:  '#A855F7',
  failed:     '#FF4560',
  default:    '#646F96',
}

const LINK_COLORS = {
  semantic_similar: '#A855F7',
  cites:            '#00D2B4',
  default:          '#252F50',
}

async function fetchCorrelations() {
  const res = await fetch('/api/correlations?limit=500')
  if (!res.ok) return []
  return res.json()
}

export default function GraphExplorer() {
  const svgRef    = useRef(null)
  const navigate  = useNavigate()
  const [query,    setQuery]    = useState('')
  const [hoveredId, setHovered] = useState(null)

  const { data: papers = [] }       = useQuery('papers-all',       () => getPapers({ limit: 20 }))
  const { data: correlations = [] } = useQuery('correlations-all', fetchCorrelations)

  const buildFullGraph = useCallback(() => {
    if (!papers.length || !svgRef.current) return
    const el = svgRef.current
    const W  = el.clientWidth  || 1200
    const H  = el.clientHeight || 700

    d3.select(el).selectAll('*').remove()

    const svg = d3.select(el).attr('width', W).attr('height', H)
    svg.append('rect').attr('width', W).attr('height', H).attr('fill', '#0A0E1F')

    // Arrowhead defs
    const defs = svg.append('defs')
    Object.entries(LINK_COLORS).forEach(([type, color]) => {
      defs.append('marker')
        .attr('id', `arr-${type}`)
        .attr('viewBox', '0 -4 8 8').attr('refX', 20).attr('refY', 0)
        .attr('markerWidth', 5).attr('markerHeight', 5).attr('orient', 'auto')
        .append('path').attr('d', 'M0,-4L8,0L0,4').attr('fill', color).attr('opacity', 0.5)
    })

    const g    = svg.append('g')
    const zoom = d3.zoom().scaleExtent([0.1, 4]).on('zoom', e => g.attr('transform', e.transform))
    svg.call(zoom)

    // Filter by search query
    const filterQ = query.toLowerCase()
    const visibleIds = new Set(
      papers
        .filter(p => !filterQ || p.title?.toLowerCase().includes(filterQ))
        .map(p => p.id)
    )

    const nodes = papers
      .filter(p => visibleIds.has(p.id))
      .map(p => ({ id: p.id, title: p.title, year: p.year, venue: p.venue, status: p.status }))

    // Only include links where both endpoints are visible
    const links = correlations
      .filter(c => visibleIds.has(c.source_id) && visibleIds.has(c.target_id))
      .map(c => ({ source: c.source_id, target: c.target_id, type: c.type, strength: c.strength }))

    // Links layer — rendered before nodes so nodes appear on top
    const link = g.append('g').selectAll('line')
      .data(links).enter().append('line')
      .attr('stroke', d => LINK_COLORS[d.type] || LINK_COLORS.default)
      .attr('stroke-width', d => 1 + (d.strength || 0.5) * 1.5)
      .attr('stroke-dasharray', d => d.type === 'semantic_similar' ? '4,3' : null)
      .attr('stroke-opacity', 0.6)
      .attr('marker-end', d => `url(#arr-${d.type in LINK_COLORS ? d.type : 'default'})`)

    const sim = d3.forceSimulation(nodes)
      .force('link',      d3.forceLink(links).id(d => d.id).distance(120).strength(0.4))
      .force('charge',    d3.forceManyBody().strength(-250))
      .force('center',    d3.forceCenter(W / 2, H / 2))
      .force('collision', d3.forceCollide(28))

    const node = g.append('g').selectAll('g')
      .data(nodes).enter().append('g')
      .style('cursor', 'pointer')
      .call(d3.drag()
        .on('start', (e, d) => { if (!e.active) sim.alphaTarget(0.3).restart(); d.fx = d.x; d.fy = d.y })
        .on('drag',  (e, d) => { d.fx = e.x; d.fy = e.y })
        .on('end',   (e, d) => { if (!e.active) sim.alphaTarget(0); d.fx = null; d.fy = null })
      )
      .on('click',     (_, d) => navigate(`/papers/${d.id}`))
      .on('mouseover', (_, d) => setHovered(d))
      .on('mouseout',  ()     => setHovered(null))

    node.append('circle')
      .attr('r', 12)
      .attr('fill', d => (NODE_COLORS[d.status] || NODE_COLORS.default) + '22')
      .attr('stroke', d => NODE_COLORS[d.status] || NODE_COLORS.default)
      .attr('stroke-width', 1.5)

    node.append('text')
      .text(d => (d.title || '').slice(0, 22) + ((d.title?.length || 0) > 22 ? '…' : ''))
      .attr('y', 22)
      .attr('text-anchor', 'middle')
      .attr('font-size', '8px')
      .attr('fill', '#646F96')
      .attr('font-family', 'DM Sans')
      .attr('pointer-events', 'none')

    sim.on('tick', () => {
      link
        .attr('x1', d => d.source.x).attr('y1', d => d.source.y)
        .attr('x2', d => d.target.x).attr('y2', d => d.target.y)
      node.attr('transform', d => `translate(${d.x},${d.y})`)
    })

    // Auto-fit after simulation settles
    setTimeout(() => {
      const b = g.node().getBBox()
      if (b.width && b.height) {
        const scale = 0.85 / Math.max(b.width / W, b.height / H)
        const tx = W / 2 - scale * (b.x + b.width / 2)
        const ty = H / 2 - scale * (b.y + b.height / 2)
        svg.transition().duration(600)
          .call(zoom.transform, d3.zoomIdentity.translate(tx, ty).scale(scale))
      }
    }, 1800)

    return () => sim.stop()
  }, [papers, correlations, query, navigate])

  useEffect(() => {
    const cleanup = buildFullGraph()
    const obs = new ResizeObserver(buildFullGraph)
    if (svgRef.current) obs.observe(svgRef.current)
    return () => { cleanup?.(); obs.disconnect() }
  }, [buildFullGraph])

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
          {papers.length} papers · {correlations.length} links
        </div>
      </div>

      {/* Legend */}
      <div className="absolute bottom-4 left-4 z-10 flex flex-col gap-1.5">
        {Object.entries(NODE_COLORS).filter(([k]) => !['default', 'scripting'].includes(k)).map(([status, color]) => (
          <div key={status} className="flex items-center gap-2 bg-bg-dark/80 backdrop-blur-sm px-2.5 py-1 rounded-md">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
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
      {hoveredId && (
        <div className="absolute bottom-4 right-4 z-10 card p-4 max-w-xs pointer-events-none">
          <p className="font-display font-semibold text-sm text-text-primary line-clamp-2">{hoveredId.title}</p>
          <div className="flex items-center gap-2 mt-1.5">
            {hoveredId.year  && <span className="text-xs text-text-muted">{hoveredId.year}</span>}
            {hoveredId.venue && <span className="text-xs text-text-dim">{hoveredId.venue}</span>}
          </div>
          <p className="text-xs text-accent-blue mt-1.5">Click to open →</p>
        </div>
      )}

      <svg ref={svgRef} className="w-full flex-1" />
    </div>
  )
}